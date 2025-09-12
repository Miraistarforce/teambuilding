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
    
    console.log('Clock-in Debug:', {
      staffId,
      now: now.toISOString(),
      nowJST: new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString(),
      today: today.toISOString(),
      todayExplanation: `This represents JST midnight in UTC`,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      searchExplanation: `Searching for records between ${start.toISOString()} and ${end.toISOString()}`
    });

    // 日付範囲で検索（findFirstを使用）
    let timeRecord = await prisma.timeRecord.findFirst({
      where: {
        staffId,
        date: {
          gte: start,
          lte: end
        }
      }
    });

    if (timeRecord && timeRecord.clockIn && !timeRecord.clockOut) {
      res.status(400).json({ error: 'Already clocked in today' });
      return;
    }

    if (!timeRecord) {
      console.log('Creating new TimeRecord with date:', today.toISOString());
      timeRecord = await prisma.timeRecord.create({
        data: {
          staffId,
          date: today,
          clockIn: now,
          status: RecordStatus.WORKING
        }
      });
      console.log('Created TimeRecord:', { id: timeRecord.id, date: timeRecord.date });
    } else {
      // 退勤済みの場合は、前の勤務時間を保存してから新しい出勤時間をセット
      const previousWorkMinutes = timeRecord.previousWorkMinutes + timeRecord.workMinutes;
      
      timeRecord = await prisma.timeRecord.update({
        where: { id: timeRecord.id },
        data: {
          clockIn: now,
          clockOut: null,
          status: RecordStatus.WORKING,
          totalBreak: 0,
          workMinutes: 0,
          previousWorkMinutes: previousWorkMinutes
        }
      });
    }

    res.status(200).json(timeRecord);
  } catch (error) {
    console.error('Clock-in error:', error);
    console.error('Error details:', {
      staffId: req.body?.staffId,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}