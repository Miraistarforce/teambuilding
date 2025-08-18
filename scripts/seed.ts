import { db } from '../lib/db';
import { companies, stores, roles, staff, holidaysJp, settings } from '../lib/db/schema';
import { hashPassword } from '../lib/auth';
import { japaneseHolidays2024, japaneseHolidays2025 } from '../lib/data/holidays';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create demo company
    const passwordHash = await hashPassword('demo123');
    const [company] = await db
      .insert(companies)
      .values({
        name: 'デモ会社',
        passwordHash,
      })
      .returning();

    console.log('✅ Created demo company');

    // Create demo stores
    const [store1] = await db
      .insert(stores)
      .values({
        companyId: company.id,
        name: '渋谷店',
        requireStorePassword: false,
      })
      .returning();

    const [store2] = await db
      .insert(stores)
      .values({
        companyId: company.id,
        name: '新宿店',
        requireStorePassword: true,
        storePasswordHash: await hashPassword('store123'),
      })
      .returning();

    console.log('✅ Created demo stores');

    // Create roles for stores
    const managerPinHash = await hashPassword('1234');
    const ownerPinHash = await hashPassword('5678');

    for (const store of [store1, store2]) {
      await db.insert(roles).values([
        {
          storeId: store.id,
          roleType: 'staff',
          displayName: 'スタッフ',
          passwordHash: null,
        },
        {
          storeId: store.id,
          roleType: 'manager',
          displayName: '店長',
          passwordHash: managerPinHash,
        },
        {
          storeId: store.id,
          roleType: 'owner',
          displayName: 'オーナー',
          passwordHash: ownerPinHash,
        },
      ]);
    }

    console.log('✅ Created roles');

    // Create demo staff
    const staffData = [
      {
        storeId: store1.id,
        displayName: '田中太郎',
        hourlyWage: '1200',
        holidayBonusPerHour: '100',
        mbti: 'INTJ',
        hobby: '読書',
        recentInterest: '料理',
        monthlyGoal: '新メニューの開発',
        hireDate: '2024-01-15',
        position: 'キッチンスタッフ',
        active: true,
      },
      {
        storeId: store1.id,
        displayName: '佐藤花子',
        hourlyWage: '1100',
        holidayBonusPerHour: '50',
        mbti: 'ENFP',
        hobby: '音楽鑑賞',
        recentInterest: '接客スキル向上',
        monthlyGoal: 'お客様満足度向上',
        hireDate: '2024-03-01',
        position: 'ホールスタッフ',
        active: true,
      },
      {
        storeId: store1.id,
        displayName: '鈴木一郎',
        hourlyWage: '1500',
        holidayBonusPerHour: '150',
        mbti: 'ESTJ',
        hobby: 'スポーツ',
        recentInterest: '経営管理',
        monthlyGoal: '売上目標達成',
        hireDate: '2023-06-01',
        position: 'シフトリーダー',
        active: true,
      },
    ];

    await db.insert(staff).values(staffData);
    console.log('✅ Created demo staff');

    // Insert holidays
    const holidays = [...japaneseHolidays2024, ...japaneseHolidays2025];
    for (const holiday of holidays) {
      try {
        await db.insert(holidaysJp).values({
          date: holiday.date,
          name: holiday.name,
        });
      } catch (error) {
        // Ignore duplicate errors
      }
    }
    console.log('✅ Inserted Japanese holidays');

    // Create default settings
    await db.insert(settings).values([
      {
        storeId: store1.id,
        key: 'mood_alert',
        value: {
          scoreThreshold: 50,
          consecutiveDays: 3,
          baselineDelta: -15,
        },
      },
      {
        storeId: store2.id,
        key: 'mood_alert',
        value: {
          scoreThreshold: 50,
          consecutiveDays: 3,
          baselineDelta: -15,
        },
      },
    ]);

    console.log('✅ Created default settings');

    console.log(`
🎉 Seeding completed successfully!

Demo credentials:
================
Company login:
- Company name: デモ会社
- Password: demo123

Store access:
- 渋谷店: No password required
- 新宿店: Password: store123

Role PINs:
- Manager PIN: 1234
- Owner PIN: 5678
- Staff: No PIN required
`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();