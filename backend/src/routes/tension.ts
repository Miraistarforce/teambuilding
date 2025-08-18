import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { analyzeTension as simpleAnalyzeTension, calculateStats, shouldAlert } from '../utils/tensionAnalyzer';
import { analyzeTension as aiAnalyzeTension, isOpenAIEnabled } from '../services/openaiService';
import { AppError } from '../middlewares/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// 日報送信時のテンション分析
router.post('/analyze', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { reportId, text } = req.body;
    
    if (!reportId || !text) {
      throw new AppError('Report ID and text are required', 400);
    }
    
    // 日報を取得
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { staff: true }
    });
    
    if (!report) {
      throw new AppError('Report not found', 404);
    }
    
    // テンション分析（OpenAI APIが有効な場合は使用、無効な場合は簡易分析）
    const analysis = isOpenAIEnabled() 
      ? await aiAnalyzeTension(text)
      : simpleAnalyzeTension(text);
    
    // 分析結果を保存
    const tensionRecord = await prisma.tensionAnalysis.create({
      data: {
        staffId: report.staffId,
        reportId: report.id,
        date: report.date,
        tensionScore: analysis.score,
        keywords: JSON.stringify({
          positive: analysis.positiveKeywords,
          negative: analysis.negativeKeywords
        })
      }
    });
    
    // スタッフの統計を更新
    await updateStaffStats(report.staffId);
    
    // アラートチェック
    const alertStatus = await checkAlertStatus(report.staffId, report.storeId);
    
    res.json({
      tensionScore: analysis.score,
      confidence: analysis.confidence,
      keywords: {
        positive: analysis.positiveKeywords,
        negative: analysis.negativeKeywords
      },
      shouldAlert: alertStatus.shouldAlert,
      consecutiveLowDays: alertStatus.consecutiveLowDays
    });
  } catch (error) {
    next(error);
  }
});

// スタッフのテンション履歴を取得
router.get('/staff/:staffId/history', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { staffId } = req.params;
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));
    
    const analyses = await prisma.tensionAnalysis.findMany({
      where: {
        staffId: parseInt(staffId),
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' },
      include: {
        report: {
          select: {
            id: true,
            date: true,
            content: true
          }
        }
      }
    });
    
    // キーワードをパース
    const formattedAnalyses = analyses.map(analysis => ({
      ...analysis,
      keywords: analysis.keywords ? JSON.parse(analysis.keywords) : null
    }));
    
    res.json(formattedAnalyses);
  } catch (error) {
    next(error);
  }
});

// スタッフの統計情報を取得
router.get('/staff/:staffId/stats', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { staffId } = req.params;
    
    const stats = await prisma.staffTensionStats.findUnique({
      where: { staffId: parseInt(staffId) }
    });
    
    if (!stats) {
      return res.json({
        avgScore: 0,
        stdDeviation: 0,
        dataCount: 0
      });
    }
    
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// アラート設定を取得
router.get('/alert-settings/:storeId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    
    let settings = await prisma.tensionAlertSettings.findUnique({
      where: { storeId: parseInt(storeId) }
    });
    
    // 設定が存在しない場合はデフォルト値で作成
    if (!settings) {
      settings = await prisma.tensionAlertSettings.create({
        data: {
          storeId: parseInt(storeId),
          alertThreshold: 0.3,
          consecutiveDays: 3,
          isEnabled: true
        }
      });
    }
    
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// アラート設定を更新
router.put('/alert-settings/:storeId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    const { alertThreshold, consecutiveDays, isEnabled } = req.body;
    
    const settings = await prisma.tensionAlertSettings.upsert({
      where: { storeId: parseInt(storeId) },
      update: {
        alertThreshold: alertThreshold ?? undefined,
        consecutiveDays: consecutiveDays ?? undefined,
        isEnabled: isEnabled ?? undefined
      },
      create: {
        storeId: parseInt(storeId),
        alertThreshold: alertThreshold ?? 0.3,
        consecutiveDays: consecutiveDays ?? 3,
        isEnabled: isEnabled ?? true
      }
    });
    
    res.json(settings);
  } catch (error) {
    next(error);
  }
});

// 低テンションのスタッフ一覧を取得
router.get('/store/:storeId/alerts', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    
    // アラート設定を取得
    const settings = await prisma.tensionAlertSettings.findUnique({
      where: { storeId: parseInt(storeId) }
    });
    
    if (!settings || !settings.isEnabled) {
      return res.json([]);
    }
    
    // 店舗の全スタッフを取得
    const staff = await prisma.staff.findMany({
      where: {
        storeId: parseInt(storeId),
        isActive: true
      }
    });
    
    const alerts = [];
    
    for (const member of staff) {
      const alertStatus = await checkAlertStatus(member.id, parseInt(storeId));
      if (alertStatus.shouldAlert) {
        // 最新のテンション分析を取得
        const latestAnalysis = await prisma.tensionAnalysis.findFirst({
          where: { staffId: member.id },
          orderBy: { date: 'desc' }
        });
        
        alerts.push({
          staffId: member.id,
          staffName: member.name,
          consecutiveLowDays: alertStatus.consecutiveLowDays,
          latestScore: latestAnalysis?.tensionScore ?? 0,
          avgScore: alertStatus.avgScore
        });
      }
    }
    
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// ヘルパー関数：スタッフの統計を更新
async function updateStaffStats(staffId: number) {
  // 過去30日分のスコアを取得
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const analyses = await prisma.tensionAnalysis.findMany({
    where: {
      staffId,
      date: { gte: thirtyDaysAgo }
    },
    select: { tensionScore: true }
  });
  
  if (analyses.length === 0) return;
  
  const scores = analyses.map(a => a.tensionScore);
  const stats = calculateStats(scores);
  
  await prisma.staffTensionStats.upsert({
    where: { staffId },
    update: {
      avgScore: stats.mean,
      stdDeviation: stats.stdDev,
      dataCount: scores.length
    },
    create: {
      staffId,
      avgScore: stats.mean,
      stdDeviation: stats.stdDev,
      dataCount: scores.length
    }
  });
}

// ヘルパー関数：アラート状態をチェック
async function checkAlertStatus(staffId: number, storeId: number) {
  // アラート設定を取得
  const settings = await prisma.tensionAlertSettings.findUnique({
    where: { storeId }
  });
  
  if (!settings || !settings.isEnabled) {
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: 0 };
  }
  
  // スタッフの統計を取得
  const stats = await prisma.staffTensionStats.findUnique({
    where: { staffId }
  });
  
  if (!stats || stats.dataCount < 3) {
    // データが不十分
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: 0 };
  }
  
  // 最近の分析結果を取得
  const recentAnalyses = await prisma.tensionAnalysis.findMany({
    where: { staffId },
    orderBy: { date: 'desc' },
    take: settings.consecutiveDays
  });
  
  if (recentAnalyses.length < settings.consecutiveDays) {
    // まだ十分な日数のデータがない
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: stats.avgScore };
  }
  
  // 連続で低い日数をカウント
  let consecutiveLowDays = 0;
  for (const analysis of recentAnalyses) {
    if (shouldAlert(analysis.tensionScore, stats.avgScore, stats.stdDeviation, settings.alertThreshold)) {
      consecutiveLowDays++;
    } else {
      break;
    }
  }
  
  return {
    shouldAlert: consecutiveLowDays >= settings.consecutiveDays,
    consecutiveLowDays,
    avgScore: stats.avgScore
  };
}

export default router;