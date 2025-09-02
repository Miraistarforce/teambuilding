import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { analyzeDailyReport, analyzeTension } from '../../lib/openaiService';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { staffId, storeId, date, content, formData } = req.body;

    // 既存の日報をチェック
    const existing = await prisma.dailyReport.findUnique({
      where: {
        staffId_date: {
          staffId: parseInt(staffId),
          date: new Date(date)
        }
      }
    });

    if (existing) {
      res.status(400).json({ error: '既に日報が存在します' });
      return;
    }

    // 日報を作成
    const report = await prisma.dailyReport.create({
      data: {
        staffId: parseInt(staffId),
        storeId: parseInt(storeId),
        date: new Date(date),
        content: content || '',
        formData: formData ? JSON.stringify(formData) : null
      }
    });

    // テンション分析（非同期で実行）
    if (content) {
      analyzeTension(content).then(async (result) => {
        try {
          await prisma.tensionAnalysis.create({
            data: {
              staffId: parseInt(staffId),
              reportId: report.id,
              date: new Date(date),
              tensionScore: result.score,
              keywords: JSON.stringify(result.keywords)
            }
          });
        } catch (error) {
          console.error('Tension analysis save error:', error);
        }
      });
    }

    res.status(201).json(report);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Daily report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}