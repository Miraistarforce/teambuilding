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
    authorizeAdmin(decoded);

    if (req.method === 'GET') {
      const companies = await prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { stores: true }
          }
        }
      });

      res.status(200).json(companies);
    } else if (req.method === 'POST') {
      const { name, password } = req.body;

      const existing = await prisma.company.findUnique({
        where: { name }
      });

      if (existing) {
        res.status(400).json({ error: 'Company name already exists' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const company = await prisma.company.create({
        data: {
          name,
          password: hashedPassword
        }
      });

      res.status(201).json(company);
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else if (error.message === 'Admin access required') {
      res.status(403).json({ error: 'Admin access required' });
    } else {
      console.error('Companies error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}