const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addStore3TimeRecords() {
  try {
    const staffId = 14; // 木下さん
    console.log('店舗3のスタッフに8月の勤怠記録を追加します');

    // 2025年8月の勤務日
    const augustWorkDays = [
      1, 2, 5, 6, 7, 8, 9, // 第1週
      12, 13, 14, 15, // 第2週（11日は祝日で休み）
    ];

    for (const day of augustWorkDays) {
      const date = new Date(2025, 7, day); // 7 = August (0-indexed)
      date.setHours(0, 0, 0, 0);

      // 既存のレコードをチェック
      const existing = await prisma.timeRecord.findFirst({
        where: {
          staffId: staffId,
          date: date
        }
      });

      if (existing) {
        console.log(`既存レコードをスキップ: 木下 - 8/${day}`);
        continue;
      }

      // 出勤時間（9:00〜10:00）
      const clockInHour = 9;
      const clockInMinute = Math.floor(Math.random() * 60);
      const clockIn = new Date(2025, 7, day, clockInHour, clockInMinute);

      // 退勤時間（18:00〜20:00）
      const clockOutHour = 18 + Math.floor(Math.random() * 3);
      const clockOutMinute = Math.floor(Math.random() * 60);
      const clockOut = new Date(2025, 7, day, clockOutHour, clockOutMinute);

      // 休憩時間（12:00〜13:00）
      const breakStart = new Date(2025, 7, day, 12, 0);
      const breakEnd = new Date(2025, 7, day, 13, 0);

      // 勤務時間を計算
      const totalMinutes = Math.floor((clockOut - clockIn) / 60000);
      const breakMinutes = 60;
      const workMinutes = totalMinutes - breakMinutes;

      // TimeRecordを作成
      const timeRecord = await prisma.timeRecord.create({
        data: {
          staffId: staffId,
          date: date,
          clockIn: clockIn,
          clockOut: clockOut,
          breakStart: breakStart,
          breakEnd: breakEnd,
          totalBreak: breakMinutes,
          workMinutes: workMinutes,
          status: 'COMPLETED'
        }
      });

      // BreakRecordも作成
      await prisma.breakRecord.create({
        data: {
          timeRecordId: timeRecord.id,
          breakStart: breakStart,
          breakEnd: breakEnd,
          minutes: breakMinutes
        }
      });

      console.log(`追加: 木下 - 8/${day} (${clockInHour}:${clockInMinute.toString().padStart(2, '0')} - ${clockOutHour}:${clockOutMinute.toString().padStart(2, '0')})`);
    }

    console.log('店舗3の8月勤怠記録の追加が完了しました');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStore3TimeRecords();