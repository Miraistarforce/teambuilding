import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
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
    const decoded = authenticate(token) as any;

    const { 
      name, 
      hourlyWage, 
      storeId,
      holidayAllowance,
      overtimeRate,
      otherAllowance,
      transportationAllowance,
      hasTransportation,
      hireDate
    } = req.body;

    const actualStoreId = storeId || decoded?.storeId;

    if (!actualStoreId) {
      res.status(400).json({ error: 'Store ID is required' });
      return;
    }

    const existing = await prisma.staff.findFirst({
      where: {
        storeId: actualStoreId,
        name
      }
    });

    if (existing) {
      res.status(400).json({ error: 'Staff name already exists in this store' });
      return;
    }

    const createData: any = {
      name,
      hourlyWage,
      storeId: actualStoreId
    };

    if (holidayAllowance !== undefined) createData.holidayAllowance = holidayAllowance;
    if (overtimeRate !== undefined) createData.overtimeRate = overtimeRate;
    if (otherAllowance !== undefined) createData.otherAllowance = otherAllowance;
    if (transportationAllowance !== undefined) createData.transportationAllowance = transportationAllowance;
    if (hasTransportation !== undefined) createData.hasTransportation = hasTransportation;
    if (hireDate) createData.hireDate = new Date(hireDate);

    const staff = await prisma.staff.create({
      data: createData
    });

    res.status(201).json(staff);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Staff creation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}