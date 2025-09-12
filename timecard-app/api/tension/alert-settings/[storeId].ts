import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { storeId } = req.query;

    if (req.method === 'GET') {
      let settings = await prisma.tensionAlertSettings.findUnique({
        where: { storeId: parseInt(storeId as string) }
      });
      
      // 設定が存在しない場合はデフォルト値で作成
      if (!settings) {
        settings = await prisma.tensionAlertSettings.create({
          data: {
            storeId: parseInt(storeId as string),
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
        where: { storeId: parseInt(storeId as string) },
        update: {
          alertThreshold: alertThreshold ?? undefined,
          consecutiveDays: consecutiveDays ?? undefined,
          isEnabled: isEnabled ?? undefined
        },
        create: {
          storeId: parseInt(storeId as string),
          alertThreshold: alertThreshold ?? 0.3,
          consecutiveDays: consecutiveDays ?? 3,
          isEnabled: isEnabled ?? true
        }
      });
      
      res.status(200).json(settings);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Alert settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}