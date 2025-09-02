import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RecordStatus = {
  NOT_STARTED: 'NOT_STARTED',
  WORKING: 'WORKING',
  ON_BREAK: 'ON_BREAK',
  FINISHED: 'FINISHED'
};

const getToday = () => {
  const now = new Date();
  // 午前4時を基準に日付を判定
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  now.setHours(0, 0, 0, 0);
  return now;
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
    const today = getToday();

    let timeRecord = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: today
        }
      }
    });

    if (timeRecord && timeRecord.clockIn && !timeRecord.clockOut) {
      res.status(400).json({ error: 'Already clocked in today' });
      return;
    }

    if (!timeRecord) {
      timeRecord = await prisma.timeRecord.create({
        data: {
          staffId,
          date: today,
          clockIn: now,
          status: RecordStatus.WORKING
        }
      });
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
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}