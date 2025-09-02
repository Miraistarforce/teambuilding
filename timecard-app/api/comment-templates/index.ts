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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    const decoded = authenticate(token) as any;

    if (req.method === 'GET') {
      const { storeId } = req.query;
      
      const templates = await prisma.commentTemplate.findMany({
        where: { storeId: parseInt(storeId as string) },
        orderBy: { createdAt: 'desc' }
      });

      res.status(200).json(templates);
    } else if (req.method === 'POST') {
      const { storeId, template } = req.body;

      const newTemplate = await prisma.commentTemplate.create({
        data: {
          storeId: parseInt(storeId),
          template
        }
      });

      res.status(201).json(newTemplate);
    } else if (req.method === 'DELETE') {
      const { id } = req.query;

      await prisma.commentTemplate.delete({
        where: { id: parseInt(id as string) }
      });

      res.status(200).json({ message: 'Deleted successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Comment template error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}