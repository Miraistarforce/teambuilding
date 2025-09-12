import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';

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

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { storeId } = req.query;
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({ error: 'startDate and endDate are required' });
      return;
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // 指定期間の勤怠記録を取得（完了した勤務のみ）
    const timeRecords = await prisma.timeRecord.findMany({
      where: {
        staff: {
          storeId: parseInt(storeId as string)
        },
        date: {
          gte: start,
          lte: end
        },
        // 実際に勤務が完了したレコードのみ
        status: {
          in: ['COMPLETED', 'FINISHED']
        },
        // 出勤と退勤の両方が記録されている
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

    // データを整形（実際に勤務した記録のみ）
    const formattedRecords = timeRecords.map(record => {
      // 休憩時間の合計を計算
      let totalBreak = 0;
      record.breakRecords.forEach(breakRecord => {
        if (breakRecord.breakStart && breakRecord.breakEnd) {
          const breakDuration = Math.floor(
            (new Date(breakRecord.breakEnd).getTime() - new Date(breakRecord.breakStart).getTime()) / 60000
          );
          totalBreak += breakDuration;
        }
      });

      // 勤務時間を計算（previousWorkMinutesを含む累積時間）
      let workMinutes = 0;
      if (record.clockIn && record.clockOut) {
        const totalMinutes = Math.floor(
          (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000
        );
        // 現在の勤務時間 + 以前の勤務時間（同日の再出勤分）
        workMinutes = (totalMinutes - totalBreak) + (record.previousWorkMinutes || 0);
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
        hourlyWage: record.staff.hourlyWage,
        holidayAllowance: record.staff.holidayAllowance || 0,
        overtimeRate: record.staff.overtimeRate || 1.25,
        otherAllowance: record.staff.otherAllowance || 0,
        transportationAllowance: record.staff.transportationAllowance || 0,
        hasTransportation: record.staff.hasTransportation || false
      };
    }).filter(record => record.workMinutes > 0); // 実際に勤務した記録のみ返す

    // サマリータイプの場合は集計
    if (type === 'summary') {
      const summary = timeRecords.reduce((acc: any, record) => {
        const staffId = record.staffId;
        if (!acc[staffId]) {
          acc[staffId] = {
            staffId,
            staffName: record.staff.name,
            totalDays: 0,
            totalMinutes: 0,
            totalBreakMinutes: 0,
            totalWorkMinutes: 0,
            hourlyWage: record.staff.hourlyWage,
            holidayAllowance: record.staff.holidayAllowance || 0,
            overtimeRate: record.staff.overtimeRate || 1.25,
            otherAllowance: record.staff.otherAllowance || 0,
            transportationAllowance: record.staff.transportationAllowance || 0,
            hasTransportation: record.staff.hasTransportation || false
          };
        }

        if (record.clockIn && record.clockOut) {
          acc[staffId].totalDays++;
          
          const totalMinutes = Math.floor(
            (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000
          );
          
          let totalBreak = 0;
          record.breakRecords.forEach(breakRecord => {
            if (breakRecord.breakStart && breakRecord.breakEnd) {
              const breakDuration = Math.floor(
                (new Date(breakRecord.breakEnd).getTime() - new Date(breakRecord.breakStart).getTime()) / 60000
              );
              totalBreak += breakDuration;
            }
          });
          
          acc[staffId].totalMinutes += totalMinutes;
          acc[staffId].totalBreakMinutes += totalBreak;
          // 累積勤務時間（previousWorkMinutesを含む）
          acc[staffId].totalWorkMinutes += (totalMinutes - totalBreak) + (record.previousWorkMinutes || 0);
        }

        return acc;
      }, {});

      const summaryArray = Object.values(summary);
      res.status(200).json(summaryArray);
    } else {
      res.status(200).json(formattedRecords);
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Reports error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}