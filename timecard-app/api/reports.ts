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

// JST日付文字列に変換
function toJSTDateString(date: Date): string {
  const jstDate = new Date(date);
  jstDate.setHours(jstDate.getHours() + 9);
  return jstDate.toISOString().split('T')[0];
}

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

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    // /api/reports/monthly - 月次レポート
    if (pathSegments[2] === 'monthly') {
      const { storeId, year, month } = req.query;

      if (!storeId || !year || !month) {
        res.status(400).json({ error: 'storeId, year, and month are required' });
        return;
      }

      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

      const timeRecords = await prisma.timeRecord.findMany({
        where: {
          staff: {
            storeId: parseInt(storeId as string)
          },
          date: {
            gte: startDate,
            lte: endDate
          },
          status: {
            in: ['COMPLETED', 'FINISHED']
          },
          clockIn: { not: null },
          clockOut: { not: null }
        },
        include: {
          staff: true
        },
        orderBy: [
          { staffId: 'asc' },
          { date: 'asc' }
        ]
      });

      // スタッフごとに集計（簡略化）
      const staffSummary: any = {};
      
      timeRecords.forEach(record => {
        if (!staffSummary[record.staffId]) {
          staffSummary[record.staffId] = {
            staffId: record.staffId,
            staffName: record.staff.name,
            totalDays: 0,
            totalMinutes: 0,
            totalSalary: 0
          };
        }
        
        staffSummary[record.staffId].totalDays++;
        staffSummary[record.staffId].totalMinutes += record.workMinutes || 0;
        
        // 簡単な給与計算
        const hours = (record.workMinutes || 0) / 60;
        const salary = hours * record.staff.hourlyWage;
        staffSummary[record.staffId].totalSalary += salary;
      });

      res.status(200).json(Object.values(staffSummary));
      return;
    }

    // /api/reports/store/:storeId - 店舗レポート
    if (pathSegments[2] === 'store' && pathSegments[3]) {
      const storeId = parseInt(pathSegments[3]);
      const { startDate, endDate, type } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'startDate and endDate are required' });
        return;
      }

      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);

      const timeRecords = await prisma.timeRecord.findMany({
        where: {
          staff: {
            storeId
          },
          date: {
            gte: start,
            lte: end
          },
          status: {
            in: ['COMPLETED', 'FINISHED']
          },
          clockIn: { not: null },
          clockOut: { not: null }
        },
        include: {
          staff: true,
          breakRecords: true
        },
        orderBy: [
          { date: 'asc' },
          { staffId: 'asc' }
        ]
      });

      // データを整形
      const formattedRecords = timeRecords.map(record => {
        let totalBreak = 0;
        record.breakRecords.forEach(breakRecord => {
          if (breakRecord.breakStart && breakRecord.breakEnd) {
            const breakDuration = Math.floor(
              (new Date(breakRecord.breakEnd).getTime() - new Date(breakRecord.breakStart).getTime()) / 60000
            );
            totalBreak += breakDuration;
          }
        });

        let workMinutes = 0;
        if (record.clockIn && record.clockOut) {
          const totalMinutes = Math.floor(
            (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000
          );
          workMinutes = totalMinutes - totalBreak;
        }

        return {
          id: record.id,
          staffId: record.staffId,
          staffName: record.staff.name,
          date: toJSTDateString(record.date),
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          status: record.status,
          totalBreak,
          workMinutes,
          hourlyWage: record.staff.hourlyWage
        };
      }).filter(record => record.workMinutes > 0);

      res.status(200).json(formattedRecords);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}