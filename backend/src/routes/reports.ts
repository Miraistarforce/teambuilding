import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import { toJSTDateString } from '../utils/dateUtils';

const router = Router();
const prisma = new PrismaClient();

// レポート取得
router.get('/store/:storeId', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { startDate, endDate, type } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    // 指定期間の勤怠記録を取得（完了した勤務のみ）
    const timeRecords = await prisma.timeRecord.findMany({
      where: {
        staff: {
          storeId: parseInt(storeId)
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

      // 勤務時間を計算
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
        hourlyWage: record.staff.hourlyWage,
        holidayAllowance: record.staff.holidayAllowance || 0,
        overtimeRate: record.staff.overtimeRate || 1.25,
        otherAllowance: record.staff.otherAllowance || 0
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
            totalWorkMinutes: 0,
            totalBreakMinutes: 0,
            hourlyWage: record.staff.hourlyWage
          };
        }

        if (record.clockIn && record.clockOut) {
          acc[staffId].totalDays++;
          
          const totalMinutes = Math.floor(
            (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / 60000
          );
          
          let totalBreak = 0;
          record.breakRecords.forEach((breakRecord: any) => {
            if (breakRecord.breakStart && breakRecord.breakEnd) {
              const breakDuration = Math.floor(
                (new Date(breakRecord.breakEnd).getTime() - new Date(breakRecord.breakStart).getTime()) / 60000
              );
              totalBreak += breakDuration;
            }
          });
          
          acc[staffId].totalWorkMinutes += (totalMinutes - totalBreak);
          acc[staffId].totalBreakMinutes += totalBreak;
        }

        return acc;
      }, {});

      return res.json(Object.values(summary));
    }

    // 詳細タイプまたはデフォルト
    res.json(formattedRecords);
  } catch (error) {
    console.error('レポート取得エラー:', error);
    res.status(500).json({ error: 'レポートの取得に失敗しました' });
  }
});

export default router;