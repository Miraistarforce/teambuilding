import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const RecordStatus = {
  NOT_STARTED: 'NOT_STARTED',
  WORKING: 'WORKING',
  ON_BREAK: 'ON_BREAK',
  FINISHED: 'FINISHED'
};

const router = Router();

const getToday = () => {
  const now = new Date();
  // 午前4時を基準に日付を判定
  if (now.getHours() < 4) {
    // 午前0時〜4時の場合は前日として扱う
    now.setDate(now.getDate() - 1);
  }
  now.setHours(0, 0, 0, 0);
  return now;
};

router.post('/clock-in', async (req, res, next) => {
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
      throw new AppError('Already clocked in today', 400);
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
      // 退勤済みの場合は、前の記録を保持したまま新しい出勤時間をセット
      // clockOutはnullにリセットして、新しい勤務セッションを開始
      timeRecord = await prisma.timeRecord.update({
        where: { id: timeRecord.id },
        data: {
          clockIn: now,
          clockOut: null,
          status: RecordStatus.WORKING,
          totalBreak: 0,  // 休憩時間もリセット
          workMinutes: 0   // 勤務時間もリセット
        }
      });
    }

    res.json(timeRecord);
  } catch (error) {
    next(error);
  }
});

router.post('/clock-out', async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const now = new Date();
    const today = getToday();

    const timeRecord = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: today
        }
      },
      include: {
        breakRecords: true
      }
    });

    if (!timeRecord || !timeRecord.clockIn) {
      throw new AppError('Not clocked in', 400);
    }

    if (timeRecord.clockOut) {
      throw new AppError('Already clocked out', 400);
    }

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

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/break-start', async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const now = new Date();
    const today = getToday();

    const timeRecord = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: today
        }
      }
    });

    if (!timeRecord || !timeRecord.clockIn || timeRecord.clockOut) {
      throw new AppError('Not currently working', 400);
    }

    if (timeRecord.status === RecordStatus.ON_BREAK) {
      throw new AppError('Already on break', 400);
    }

    await prisma.breakRecord.create({
      data: {
        timeRecordId: timeRecord.id,
        breakStart: now
      }
    });

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecord.id },
      data: {
        status: RecordStatus.ON_BREAK
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/break-end', async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const now = new Date();
    const today = getToday();

    const timeRecord = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId,
          date: today
        }
      },
      include: {
        breakRecords: true
      }
    });

    if (!timeRecord || timeRecord.status !== RecordStatus.ON_BREAK) {
      throw new AppError('Not on break', 400);
    }

    const currentBreak = timeRecord.breakRecords.find(b => !b.breakEnd);
    
    if (!currentBreak) {
      throw new AppError('No active break found', 400);
    }

    await prisma.breakRecord.update({
      where: { id: currentBreak.id },
      data: {
        breakEnd: now,
        minutes: Math.floor((now.getTime() - currentBreak.breakStart.getTime()) / 60000)
      }
    });

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecord.id },
      data: {
        status: RecordStatus.WORKING
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.get('/today/:storeId', async (req, res, next) => {
  try {
    const { storeId } = req.params;
    const today = getToday();

    const records = await prisma.timeRecord.findMany({
      where: {
        date: today,
        staff: {
          storeId: parseInt(storeId)
        }
      },
      include: {
        staff: true,
        breakRecords: true
      }
    });

    res.json(records);
  } catch (error) {
    next(error);
  }
});

router.get('/staff/:staffId/today', async (req, res, next) => {
  try {
    const { staffId } = req.params;
    const today = getToday();

    const record = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId: parseInt(staffId),
          date: today
        }
      },
      include: {
        breakRecords: true
      }
    });

    res.json(record || null);
  } catch (error) {
    next(error);
  }
});

router.get('/report', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId, startDate, endDate, type } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    const records = await prisma.timeRecord.findMany({
      where: {
        staff: {
          storeId: parseInt(storeId as string)
        },
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        staff: true,
        breakRecords: true
      },
      orderBy: [
        { date: 'asc' },
        { staff: { name: 'asc' } }
      ]
    });

    if (type === 'summary') {
      const summary = records.reduce((acc, record) => {
        const staffId = record.staffId;
        if (!acc[staffId]) {
          acc[staffId] = {
            staffName: record.staff.name,
            hourlyWage: record.staff.hourlyWage,
            totalWorkMinutes: 0,
            totalBreakMinutes: 0,
            days: 0
          };
        }
        
        acc[staffId].totalWorkMinutes += record.workMinutes;
        acc[staffId].totalBreakMinutes += record.totalBreak;
        acc[staffId].days += 1;
        
        return acc;
      }, {} as any);

      res.json(Object.values(summary));
    } else {
      res.json(records);
    }
  } catch (error) {
    next(error);
  }
});

export default router;