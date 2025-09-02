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

    const staff = await prisma.staff.findMany({
      where: { 
        storeId: parseInt(storeId as string)
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(staff);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Staff list error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}