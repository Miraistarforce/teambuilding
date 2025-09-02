import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { storeId } = req.query;

    if (req.method === 'GET') {
      // QRトークンで認証なしアクセスの場合
      const { token } = req.query;
      
      if (token) {
        const store = await prisma.store.findFirst({
          where: {
            qrToken: token as string,
            qrEnabled: true,
            isActive: true
          }
        });

        if (store) {
          res.status(200).json({
            storeId: store.id,
            storeName: store.name,
            valid: true
          });
        } else {
          res.status(404).json({ error: 'Invalid QR token' });
        }
        return;
      }

      // 通常の認証付きアクセス
      const authToken = req.headers.authorization;
      authenticate(authToken);

      const store = await prisma.store.findUnique({
        where: { id: parseInt(storeId as string) }
      });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      res.status(200).json({
        qrEnabled: store.qrEnabled,
        qrToken: store.qrToken,
        qrUrl: store.qrToken ? `${process.env.FRONTEND_URL || 'https://teambuilding-timecard.vercel.app'}/qr/${store.qrToken}` : null
      });
    } else if (req.method === 'PUT') {
      // 認証チェック
      const token = req.headers.authorization;
      authenticate(token);

      const { qrEnabled } = req.body;

      const store = await prisma.store.update({
        where: { id: parseInt(storeId as string) },
        data: { qrEnabled }
      });

      res.status(200).json({
        qrEnabled: store.qrEnabled,
        qrToken: store.qrToken
      });
    } else if (req.method === 'POST') {
      // 認証チェック
      const token = req.headers.authorization;
      authenticate(token);

      // 新しいQRトークンを生成
      const qrToken = crypto.randomBytes(32).toString('hex');

      const store = await prisma.store.update({
        where: { id: parseInt(storeId as string) },
        data: {
          qrToken,
          qrEnabled: true
        }
      });

      res.status(200).json({
        qrEnabled: store.qrEnabled,
        qrToken: store.qrToken,
        qrUrl: `${process.env.FRONTEND_URL || 'https://teambuilding-timecard.vercel.app'}/qr/${store.qrToken}`
      });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('QR settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}