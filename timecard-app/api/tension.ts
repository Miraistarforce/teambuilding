import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 認証ミドルウェア
const authenticate = (token: string | undefined) => {
  if (!token) throw new Error('No token provided');
  
  try {
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// 簡易テンション分析
function simpleAnalyzeTension(text: string) {
  const POSITIVE_KEYWORDS = ['嬉しい', '楽しい', '幸せ', '最高', '頑張った', '達成', '成功', '元気', '充実', 'ありがとう'];
  const NEGATIVE_KEYWORDS = ['疲れた', '辛い', '大変', '不安', '心配', 'ミス', '失敗', '困った', '忙しい', 'ストレス'];

  if (!text || text.trim().length === 0) {
    return { score: 0, positiveKeywords: [], negativeKeywords: [], confidence: 0 };
  }

  const lowerText = text.toLowerCase();
  const positiveKeywords: string[] = [];
  const negativeKeywords: string[] = [];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      positiveKeywords.push(keyword);
      positiveCount++;
    }
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      negativeKeywords.push(keyword);
      negativeCount++;
    }
  }
  
  const totalCount = positiveCount + negativeCount;
  let score = 0;
  
  if (totalCount > 0) {
    score = (positiveCount - negativeCount) / totalCount;
    score = Math.max(-1, Math.min(1, score));
  }
  
  const confidence = Math.min(1, totalCount / 5);
  
  return {
    score,
    positiveKeywords: [...new Set(positiveKeywords)],
    negativeKeywords: [...new Set(negativeKeywords)],
    confidence,
  };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    // /api/tension/analyze - テンション分析
    if (pathSegments[2] === 'analyze' && req.method === 'POST') {
      const { reportId, text } = req.body;
      
      if (!reportId || !text) {
        res.status(400).json({ error: 'Report ID and text are required' });
        return;
      }
      
      const report = await prisma.dailyReport.findUnique({
        where: { id: reportId },
        include: { staff: true }
      });
      
      if (!report) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      
      const analysis = simpleAnalyzeTension(text);
      
      // 分析結果を保存
      const existingAnalysis = await prisma.tensionAnalysis.findUnique({
        where: { reportId: report.id }
      });

      await (existingAnalysis
        ? prisma.tensionAnalysis.update({
            where: { reportId: report.id },
            data: {
              tensionScore: analysis.score,
              keywords: JSON.stringify({
                positive: analysis.positiveKeywords,
                negative: analysis.negativeKeywords
              })
            }
          })
        : prisma.tensionAnalysis.create({
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
          }));
      
      res.status(200).json({
        tensionScore: analysis.score,
        confidence: analysis.confidence,
        keywords: {
          positive: analysis.positiveKeywords,
          negative: analysis.negativeKeywords
        },
        shouldAlert: false,
        consecutiveLowDays: 0
      });
      return;
    }

    // /api/tension/staff/:staffId/history - テンション履歴
    if (pathSegments[2] === 'staff' && pathSegments[4] === 'history' && req.method === 'GET') {
      const staffId = parseInt(pathSegments[3]);
      const { days = 30 } = req.query;
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Number(days));
      
      const analyses = await prisma.tensionAnalysis.findMany({
        where: {
          staffId,
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
      
      const formattedAnalyses = analyses.map(analysis => ({
        ...analysis,
        keywords: analysis.keywords ? JSON.parse(analysis.keywords) : null
      }));
      
      res.status(200).json(formattedAnalyses);
      return;
    }

    // /api/tension/staff/:staffId/stats - テンション統計
    if (pathSegments[2] === 'staff' && pathSegments[4] === 'stats' && req.method === 'GET') {
      const staffId = parseInt(pathSegments[3]);
      
      const stats = await prisma.staffTensionStats.findUnique({
        where: { staffId }
      });
      
      if (!stats) {
        res.status(200).json({
          avgScore: 0,
          stdDeviation: 0,
          dataCount: 0
        });
        return;
      }
      
      res.status(200).json(stats);
      return;
    }

    // /api/tension/alert-settings/:storeId - アラート設定
    if (pathSegments[2] === 'alert-settings' && pathSegments[3]) {
      const storeId = parseInt(pathSegments[3]);

      if (req.method === 'GET') {
        let settings = await prisma.tensionAlertSettings.findUnique({
          where: { storeId }
        });
        
        if (!settings) {
          settings = await prisma.tensionAlertSettings.create({
            data: {
              storeId,
              alertThreshold: 0.3,
              consecutiveDays: 3,
              isEnabled: true
            }
          });
        }
        
        res.status(200).json(settings);
      } else if (req.method === 'PUT') {
        const { alertThreshold, consecutiveDays, isEnabled } = req.body;
        
        const settings = await prisma.tensionAlertSettings.upsert({
          where: { storeId },
          update: {
            alertThreshold: alertThreshold ?? undefined,
            consecutiveDays: consecutiveDays ?? undefined,
            isEnabled: isEnabled ?? undefined
          },
          create: {
            storeId,
            alertThreshold: alertThreshold ?? 0.3,
            consecutiveDays: consecutiveDays ?? 3,
            isEnabled: isEnabled ?? true
          }
        });
        
        res.status(200).json(settings);
      }
      return;
    }

    // /api/tension/store/:storeId/alerts - 店舗アラート
    if (pathSegments[2] === 'store' && pathSegments[4] === 'alerts' && req.method === 'GET') {
      const storeId = parseInt(pathSegments[3]);
      
      const settings = await prisma.tensionAlertSettings.findUnique({
        where: { storeId }
      });
      
      if (!settings || !settings.isEnabled) {
        res.status(200).json([]);
        return;
      }
      
      const staff = await prisma.staff.findMany({
        where: {
          storeId,
          isActive: true
        }
      });
      
      const alerts: any[] = [];
      
      // 簡略化したアラート処理
      for (const member of staff) {
        const latestAnalysis = await prisma.tensionAnalysis.findFirst({
          where: { staffId: member.id },
          orderBy: { date: 'desc' }
        });
        
        if (latestAnalysis && latestAnalysis.tensionScore < -0.3) {
          alerts.push({
            staffId: member.id,
            staffName: member.name,
            consecutiveLowDays: 1,
            latestScore: latestAnalysis.tensionScore,
            avgScore: 0
          });
        }
      }
      
      res.status(200).json(alerts);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Tension API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}