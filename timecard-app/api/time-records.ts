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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  try {
    // /api/time-records/clock-in
    if (pathSegments[2] === 'clock-in' && req.method === 'POST') {
      const { staffId, reClockin } = req.body;
      const today = getToday();

      // 今日の記録を取得
      let timeRecord = await prisma.timeRecord.findFirst({
        where: {
          staffId: parseInt(staffId),
          date: today
        }
      });

      const now = new Date();

      if (timeRecord) {
        if (reClockin && timeRecord.status === RecordStatus.FINISHED) {
          // 再出勤の場合
          const previousWorkMinutes = timeRecord.workMinutes || 0;
          timeRecord = await prisma.timeRecord.update({
            where: { id: timeRecord.id },
            data: {
              clockIn: now,
              clockOut: null,
              status: RecordStatus.WORKING,
              previousWorkMinutes
            }
          });
        } else if (timeRecord.status === RecordStatus.NOT_STARTED) {
          timeRecord = await prisma.timeRecord.update({
            where: { id: timeRecord.id },
            data: {
              clockIn: now,
              status: RecordStatus.WORKING
            }
          });
        } else {
          res.status(400).json({ error: 'Already clocked in' });
          return;
        }
      } else {
        // 新規作成
        timeRecord = await prisma.timeRecord.create({
          data: {
            staffId: parseInt(staffId),
            date: today,
            clockIn: now,
            status: RecordStatus.WORKING
          }
        });
      }

      res.status(200).json(timeRecord);
      return;
    }

    // /api/time-records/clock-out
    if (pathSegments[2] === 'clock-out' && req.method === 'POST') {
      const { staffId } = req.body;
      const today = getToday();

      const timeRecord = await prisma.timeRecord.findFirst({
        where: {
          staffId: parseInt(staffId),
          date: today,
          status: { in: [RecordStatus.WORKING, RecordStatus.ON_BREAK] }
        }
      });

      if (!timeRecord) {
        res.status(400).json({ error: 'Not clocked in' });
        return;
      }

      const now = new Date();
      const clockIn = new Date(timeRecord.clockIn!);
      const workMinutes = Math.floor((now.getTime() - clockIn.getTime()) / 60000);
      const totalWorkMinutes = (timeRecord.previousWorkMinutes || 0) + workMinutes;

      const updatedRecord = await prisma.timeRecord.update({
        where: { id: timeRecord.id },
        data: {
          clockOut: now,
          status: RecordStatus.FINISHED,
          workMinutes: totalWorkMinutes
        }
      });

      res.status(200).json(updatedRecord);
      return;
    }

    // /api/time-records/break-start
    if (pathSegments[2] === 'break-start' && req.method === 'POST') {
      const { staffId } = req.body;
      const today = getToday();

      const timeRecord = await prisma.timeRecord.findFirst({
        where: {
          staffId: parseInt(staffId),
          date: today,
          status: RecordStatus.WORKING
        }
      });

      if (!timeRecord) {
        res.status(400).json({ error: 'Not working' });
        return;
      }

      const breakRecord = await prisma.breakRecord.create({
        data: {
          timeRecordId: timeRecord.id,
          breakStart: new Date()
        }
      });

      await prisma.timeRecord.update({
        where: { id: timeRecord.id },
        data: { status: RecordStatus.ON_BREAK }
      });

      res.status(200).json(breakRecord);
      return;
    }

    // /api/time-records/break-end
    if (pathSegments[2] === 'break-end' && req.method === 'POST') {
      const { staffId } = req.body;
      const today = getToday();

      const timeRecord = await prisma.timeRecord.findFirst({
        where: {
          staffId: parseInt(staffId),
          date: today,
          status: RecordStatus.ON_BREAK
        }
      });

      if (!timeRecord) {
        res.status(400).json({ error: 'Not on break' });
        return;
      }

      const breakRecord = await prisma.breakRecord.findFirst({
        where: {
          timeRecordId: timeRecord.id,
          breakEnd: null
        },
        orderBy: { breakStart: 'desc' }
      });

      if (breakRecord) {
        await prisma.breakRecord.update({
          where: { id: breakRecord.id },
          data: { breakEnd: new Date() }
        });
      }

      await prisma.timeRecord.update({
        where: { id: timeRecord.id },
        data: { status: RecordStatus.WORKING }
      });

      res.status(200).json({ success: true });
      return;
    }

    // /api/time-records/:staffId/today
    if (pathSegments[2] && pathSegments[3] === 'today' && req.method === 'GET') {
      const staffId = parseInt(pathSegments[2]);
      const today = getToday();

      const timeRecord = await prisma.timeRecord.findFirst({
        where: {
          staffId,
          date: today
        },
        include: {
          breakRecords: true
        }
      });

      res.status(200).json(timeRecord || null);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Time records error:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}