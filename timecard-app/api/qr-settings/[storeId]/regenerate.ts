import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';
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

  const { storeId } = req.query;

  if (!storeId) {
    res.status(400).json({ error: 'Store ID is required' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    // 新しいトークンを生成
    const newToken = generateQrToken();

    // ストアのQRトークンを更新
    const updatedStore = await prisma.store.update({
      where: {
        id: parseInt(storeId as string)
      },
      data: {
        qrToken: newToken
      },
      select: {
        id: true,
        name: true,
        qrEnabled: true,
        qrToken: true
      }
    });

    res.status(200).json(updatedStore);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('QR regeneration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}