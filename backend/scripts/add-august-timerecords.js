const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAugustTimeRecords() {
  try {
    // スタッフを取得
    const staff = await prisma.staff.findMany({
      where: { isActive: true },
      take: 3
    });

    if (staff.length === 0) {
      console.log('アクティブなスタッフが見つかりません');
      return;
    }

    console.log(`${staff.length}名のスタッフに8月の勤怠記録を追加します`);

    // 2025年8月の勤務日（平日のみ）
    const augustWorkDays = [
      1, 4, 5, 6, 7, 8, // 第1週
      11, 12, 13, 14, 15, // 第2週（11日は祝日だが出勤とする）
    ];

    for (const staffMember of staff) {
      for (const day of augustWorkDays) {
        const date = new Date(2025, 7, day); // 7 = August (0-indexed)
        date.setHours(0, 0, 0, 0);

        // 既存のレコードをチェック
        const existing = await prisma.timeRecord.findFirst({
          where: {
            staffId: staffMember.id,
            date: date
          }
        });

        if (existing) {
          console.log(`既存レコードをスキップ: ${staffMember.name} - 8/${day}`);
          continue;
        }

        // 出勤時間をランダムに設定（8:30〜9:30）
        const clockInHour = 8 + Math.floor(Math.random() * 2);
        const clockInMinute = Math.floor(Math.random() * 60);
        const clockIn = new Date(2025, 7, day, clockInHour, clockInMinute);

        // 退勤時間をランダムに設定（17:30〜19:30）
        const clockOutHour = 17 + Math.floor(Math.random() * 3);
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
            staffId: staffMember.id,
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

        console.log(`追加: ${staffMember.name} - 8/${day} (${clockInHour}:${clockInMinute.toString().padStart(2, '0')} - ${clockOutHour}:${clockOutMinute.toString().padStart(2, '0')})`);
      }
    }

    console.log('8月の勤怠記録の追加が完了しました');
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAugustTimeRecords();