import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getTodayJST, getTodayJSTRange } from '../lib/dateHelpers';


const RecordStatus = {
  NOT_STARTED: 'NOT_STARTED',
  WORKING: 'WORKING',
  ON_BREAK: 'ON_BREAK',
  FINISHED: 'FINISHED'
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // キャッシュを無効化（書き込み系API）
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { staffId } = req.body;
    const now = new Date();
    const today = getTodayJST();
    const { start, end } = getTodayJSTRange();
    
    console.log('Clock-out Debug:', {
      staffId,
      now: now.toISOString(),
      today: today.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      jstNow: new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString()
    });

    // 日付範囲で検索（findFirstを使用）
    const timeRecord = await prisma.timeRecord.findFirst({
      where: {
        staffId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        breakRecords: true
      }
    });

    if (!timeRecord || !timeRecord.clockIn) {
      res.status(400).json({ error: 'Not clocked in' });
      return;
    }

    if (timeRecord.clockOut) {
      res.status(400).json({ error: 'Already clocked out' });
      return;
    }

    // 休憩中の場合は終了処理
    if (timeRecord.status === RecordStatus.ON_BREAK) {
      const currentBreak = timeRecord.breakRecords.find(b => !b.breakEnd);
      if (currentBreak) {
        await prisma.breakRecord.update({
          where: { id: currentBreak.id },
          data: {
            breakEnd: now,
            minutes: Math.floor((now.getTime() - currentBreak.breakStart.getTime()) / 60000)
          }
        });
      }
    }

    const totalBreakMinutes = timeRecord.breakRecords.reduce((sum, b) => {
      if (b.breakEnd) {
        return sum + Math.floor((b.breakEnd.getTime() - b.breakStart.getTime()) / 60000);
      }
      return sum + Math.floor((now.getTime() - b.breakStart.getTime()) / 60000);
    }, 0);

    const workMinutes = Math.floor((now.getTime() - timeRecord.clockIn.getTime()) / 60000) - totalBreakMinutes;

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecord.id },
      data: {
        clockOut: now,
        status: RecordStatus.FINISHED,
        totalBreak: totalBreakMinutes,
        workMinutes
      }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}