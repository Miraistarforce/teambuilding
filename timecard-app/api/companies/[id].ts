import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

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

// 管理者権限チェック
const authorizeAdmin = (decoded: any) => {
  if (decoded.role !== 'admin') {
    throw new Error('Admin access required');
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    const decoded = authenticate(token) as any;
    authorizeAdmin(decoded);

    const { id } = req.query;

    if (req.method === 'PUT') {
      const { name, password, isActive } = req.body;

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (password) updateData.password = await bcrypt.hash(password, 10);

      const company = await prisma.company.update({
        where: { id: parseInt(id as string) },
        data: updateData
      });

      res.status(200).json(company);
    } else if (req.method === 'DELETE') {
      await prisma.company.delete({
        where: { id: parseInt(id as string) }
      });

      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else if (error.message === 'Admin access required') {
      res.status(403).json({ error: 'Admin access required' });
    } else {
      console.error('Company update/delete error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}