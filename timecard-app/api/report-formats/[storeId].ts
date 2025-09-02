import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    const decoded = authenticate(token) as any;
    const { storeId } = req.query;

    if (req.method === 'GET') {
      const format = await prisma.dailyReportFormat.findUnique({
        where: {
          storeId: parseInt(storeId as string),
        },
      });

      if (!format) {
        // デフォルトフォーマットを返す
        res.status(200).json({
          fields: [
            {
              id: 'default-1',
              type: 'text',
              title: '今日の業務内容',
              placeholder: '今日行った業務を記入してください',
              required: true
            }
          ]
        });
        return;
      }

      res.status(200).json({
        ...format,
        fields: JSON.parse(format.fields)
      });
    } else if (req.method === 'POST') {
      const { fields } = req.body;

      // 権限チェック（manager/ownerのみ）
      if (decoded.role !== 'manager' && decoded.role !== 'owner') {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const format = await prisma.dailyReportFormat.upsert({
        where: {
          storeId: parseInt(storeId as string),
        },
        update: {
          fields: JSON.stringify(fields),
        },
        create: {
          storeId: parseInt(storeId as string),
          fields: JSON.stringify(fields),
        },
      });

      res.status(200).json({
        ...format,
        fields: JSON.parse(format.fields)
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Report format error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}