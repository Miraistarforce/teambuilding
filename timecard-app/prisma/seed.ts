import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const RecordStatus = {
  NOT_STARTED: 'NOT_STARTED',
  WORKING: 'WORKING',
  ON_BREAK: 'ON_BREAK',
  FINISHED: 'FINISHED'
};

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Seeding database...');

  // 会社データの作成
  const testCompany = await prisma.company.create({
    data: {
      name: 'テスト株式会社',
      password: await hashPassword('password123'),
      isActive: true,
    },
  });

  const companies = [testCompany];

  console.log(`Created ${companies.length} companies`);

  // 各会社に店舗を作成
  const stores = [];
  for (const company of companies) {
    const companyStores = await Promise.all([
      prisma.store.create({
        data: {
          companyId: company.id,
          name: '渋谷店',
          managerPassword: await hashPassword('manager123'),
          ownerPassword: await hashPassword('owner123'),
          isActive: true,
        },
      }),
      prisma.store.create({
        data: {
          companyId: company.id,
          name: '新宿店',
          managerPassword: await hashPassword('manager123'),
          ownerPassword: await hashPassword('owner123'),
          isActive: true,
        },
      }),
    ]);
    stores.push(...companyStores);
  }

  console.log(`Created ${stores.length} stores`);

  // 各店舗にスタッフを作成
  const staff = [];
  const staffNames = ['田中太郎', '佐藤花子', '鈴木一郎', '高橋美咲', '山田健太', '渡辺真理', '伊藤隆', '中村優子'];
  
  for (const store of stores) {
    const storeStaff = await Promise.all(
      staffNames.slice(0, 5 + Math.floor(Math.random() * 4)).map((name, index) =>
        prisma.staff.create({
          data: {
            storeId: store.id,
            name: `${name}`,
            hourlyWage: 1000 + Math.floor(Math.random() * 500),
            isActive: true,
          },
        })
      )
    );
    staff.push(...storeStaff);
  }

  console.log(`Created ${staff.length} staff members`);

  // 過去1ヶ月分のダミー勤怠データを作成
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // 週末はスキップする確率を上げる
    if (date.getDay() === 0 || date.getDay() === 6) {
      if (Math.random() > 0.3) continue;
    }

    for (const member of staff) {
      // ランダムに欠勤させる
      if (Math.random() > 0.85) continue;

      const clockIn = new Date(date);
      clockIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);
      
      const clockOut = new Date(date);
      clockOut.setHours(17 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 60), 0, 0);
      
      const breakMinutes = 45 + Math.floor(Math.random() * 30);
      const workMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMinutes;

      const timeRecord = await prisma.timeRecord.create({
        data: {
          staffId: member.id,
          date: date,
          clockIn: clockIn,
          clockOut: i === 0 && Math.random() > 0.3 ? null : clockOut, // 今日のデータは一部未退勤
          totalBreak: breakMinutes,
          workMinutes: i === 0 && Math.random() > 0.3 ? 0 : workMinutes,
          status: i === 0 && Math.random() > 0.3 
            ? (Math.random() > 0.5 ? RecordStatus.WORKING : RecordStatus.ON_BREAK)
            : RecordStatus.FINISHED,
        },
      });

      // 休憩記録を作成
      if (breakMinutes > 0) {
        const breakStart = new Date(clockIn);
        breakStart.setHours(12, 0, 0, 0);
        
        const breakEnd = new Date(breakStart);
        breakEnd.setMinutes(breakEnd.getMinutes() + breakMinutes);

        await prisma.breakRecord.create({
          data: {
            timeRecordId: timeRecord.id,
            breakStart: breakStart,
            breakEnd: i === 0 && timeRecord.status === RecordStatus.ON_BREAK ? null : breakEnd,
            minutes: i === 0 && timeRecord.status === RecordStatus.ON_BREAK ? 0 : breakMinutes,
          },
        });
      }
    }
  }

  console.log('Created time records for the past 30 days');
  console.log('Seeding completed!');
  
  console.log('\n=== テスト用ログイン情報 ===');
  console.log('管理者アプリ (http://localhost:4000)');
  console.log('  ID: admin');
  console.log('  PW: admin123\n');
  
  console.log('店舗管理アプリ (http://localhost:4001)');
  console.log('  会社名: テスト株式会社');
  console.log('  PW: password123\n');
  
  console.log('出退勤アプリ (http://localhost:4002)');
  console.log('  会社名: テスト株式会社');
  console.log('  PW: password123');
  console.log('  スタッフPW: staff123');
  console.log('  店長PW: manager123');
  console.log('  オーナーPW: owner123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });