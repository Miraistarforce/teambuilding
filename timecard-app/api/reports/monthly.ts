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

    const { storeId, year, month } = req.query;
    
    const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
    const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);

    const timeRecords = await prisma.timeRecord.findMany({
      where: {
        staff: {
          storeId: parseInt(storeId as string)
        },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        staff: {
          include: {
            employeeSettings: true
          }
        },
        breakRecords: true
      },
      orderBy: [
        { date: 'asc' },
        { staff: { name: 'asc' } }
      ]
    });

    // スタッフごとにグループ化
    const staffRecords = timeRecords.reduce((acc, record) => {
      const staffId = record.staffId;
      if (!acc[staffId]) {
        acc[staffId] = {
          staff: record.staff,
          records: []
        };
      }
      acc[staffId].records.push(record);
      return acc;
    }, {} as any);

    res.status(200).json(Object.values(staffRecords));
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}