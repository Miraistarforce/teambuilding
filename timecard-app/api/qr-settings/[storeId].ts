import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import crypto from 'crypto';

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

// ランダムトークン生成
const generateQrToken = () => {
  return crypto.randomBytes(32).toString('hex');
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

  const { storeId } = req.query;

  if (!storeId) {
    res.status(400).json({ error: 'Store ID is required' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    if (req.method === 'GET') {
      // QR設定を取得
      const store = await prisma.store.findUnique({
        where: {
          id: parseInt(storeId as string)
        },
        select: {
          id: true,
          name: true,
          qrEnabled: true,
          qrToken: true
        }
      });

      if (!store) {
        res.status(404).json({ error: 'Store not found' });
        return;
      }

      // qrTokenがない場合は生成
      let qrToken = store.qrToken;
      if (!qrToken) {
        qrToken = generateQrToken();
        await prisma.store.update({
          where: { id: parseInt(storeId as string) },
          data: { qrToken }
        });
      }

      res.status(200).json({
        ...store,
        qrToken
      });
    } else if (req.method === 'PUT') {
      // QR設定を更新
      const { qrEnabled } = req.body;

      const updatedStore = await prisma.store.update({
        where: {
          id: parseInt(storeId as string)
        },
        data: {
          qrEnabled: qrEnabled
        },
        select: {
          id: true,
          name: true,
          qrEnabled: true,
          qrToken: true
        }
      });

      res.status(200).json(updatedStore);
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
  }
}