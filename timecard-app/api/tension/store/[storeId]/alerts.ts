import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

// 認証ミドルウェア
const authenticate = (token: string | undefined) => {
  if (!token) throw new Error('No token provided');
  
  try {
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// アラートが必要かチェック
function shouldAlert(
  currentScore: number,
  avgScore: number,
  stdDev: number,
  threshold: number = 0.3
): boolean {
  const deviation = avgScore - currentScore;
  const adjustedThreshold = Math.max(threshold, stdDev * 1.5);
  return deviation > adjustedThreshold;
}

// アラート状態をチェック
async function checkAlertStatus(staffId: number, storeId: number) {
  const settings = await prisma.tensionAlertSettings.findUnique({
    where: { storeId }
  });
  
  if (!settings || !settings.isEnabled) {
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: 0 };
  }
  
  const stats = await prisma.staffTensionStats.findUnique({
    where: { staffId }
  });
  
  if (!stats || stats.dataCount < 3) {
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: 0 };
  }
  
  const recentAnalyses = await prisma.tensionAnalysis.findMany({
    where: { staffId },
    orderBy: { date: 'desc' },
    take: settings.consecutiveDays
  });
  
  if (recentAnalyses.length < settings.consecutiveDays) {
    return { shouldAlert: false, consecutiveLowDays: 0, avgScore: stats.avgScore };
  }
  
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { storeId } = req.query;
    
    // アラート設定を取得
    const settings = await prisma.tensionAlertSettings.findUnique({
      where: { storeId: parseInt(storeId as string) }
    });
    
    if (!settings || !settings.isEnabled) {
      res.status(200).json([]);
      return;
    }
    
    // 店舗の全スタッフを取得
    const staff = await prisma.staff.findMany({
      where: {
        storeId: parseInt(storeId as string),
        isActive: true
      }
    });
    
    const alerts = [];
    
    for (const member of staff) {
      const alertStatus = await checkAlertStatus(member.id, parseInt(storeId as string));
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
    
    res.status(200).json(alerts);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Store alerts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}