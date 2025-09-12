/**
 * タイムゾーン問題修正のためのデータマイグレーションスクリプト
 * 
 * 問題：既存のTimeRecordのdate フィールドが間違ったタイムゾーンで保存されている
 * 修正：JST 0:00を正しくUTC 前日15:00として保存し直す
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function migrateTimeRecords() {
  console.log('Starting timezone data migration...');
  
  try {
    // すべてのTimeRecordを取得
    const records = await prisma.timeRecord.findMany({
      orderBy: { date: 'asc' }
    });
    
    console.log(`Found ${records.length} TimeRecord entries to check`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const record of records) {
      const currentDate = new Date(record.date);
      const hours = currentDate.getUTCHours();
      
      // UTC 0:00のレコードのみ修正対象（間違った形式で保存されたもの）
      if (hours === 0 && currentDate.getUTCMinutes() === 0) {
        // このレコードは間違っている（JST 0:00が UTC 0:00として保存されている）
        // 正しくは UTC 前日15:00であるべき
        
        // 9時間引いて正しいUTC時刻にする
        const correctedDate = new Date(currentDate.getTime() - 9 * 60 * 60 * 1000);
        
        console.log(`Migrating record ${record.id}:`);
        console.log(`  Before: ${currentDate.toISOString()}`);
        console.log(`  After:  ${correctedDate.toISOString()}`);
        
        // データベースを更新
        await prisma.timeRecord.update({
          where: { id: record.id },
          data: { date: correctedDate }
        });
        
        migratedCount++;
      } else if (hours === 15 && currentDate.getUTCMinutes() === 0) {
        // すでに正しい形式（UTC 15:00 = JST 0:00）
        console.log(`Record ${record.id} is already correct: ${currentDate.toISOString()}`);
        skippedCount++;
      } else {
        // その他の時刻（想定外）
        console.log(`Record ${record.id} has unexpected time: ${currentDate.toISOString()}`);
        skippedCount++;
      }
    }
    
    console.log('\nMigration completed:');
    console.log(`  Migrated: ${migratedCount} records`);
    console.log(`  Skipped:  ${skippedCount} records`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ドライラン機能（実際の更新を行わない）
async function dryRun() {
  console.log('DRY RUN MODE - No actual changes will be made\n');
  
  const records = await prisma.timeRecord.findMany({
    orderBy: { date: 'asc' }
  });
  
  console.log(`Found ${records.length} TimeRecord entries\n`);
  
  let needsMigration = 0;
  let alreadyCorrect = 0;
  let unexpected = 0;
  
  for (const record of records) {
    const currentDate = new Date(record.date);
    const hours = currentDate.getUTCHours();
    
    if (hours === 0 && currentDate.getUTCMinutes() === 0) {
      needsMigration++;
      const correctedDate = new Date(currentDate.getTime() - 9 * 60 * 60 * 1000);
      console.log(`Would migrate record ${record.id}:`);
      console.log(`  Current: ${currentDate.toISOString()}`);
      console.log(`  New:     ${correctedDate.toISOString()}`);
    } else if (hours === 15 && currentDate.getUTCMinutes() === 0) {
      alreadyCorrect++;
    } else {
      unexpected++;
      console.log(`Unexpected time in record ${record.id}: ${currentDate.toISOString()}`);
    }
  }
  
  console.log('\nDry run summary:');
  console.log(`  Need migration: ${needsMigration} records`);
  console.log(`  Already correct: ${alreadyCorrect} records`);
  console.log(`  Unexpected: ${unexpected} records`);
  
  await prisma.$disconnect();
}

// メイン実行
const isDryRun = process.argv.includes('--dry-run');

if (isDryRun) {
  dryRun().catch(console.error);
} else {
  console.log('⚠️  WARNING: This will modify your database!');
  console.log('Run with --dry-run flag first to preview changes.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  setTimeout(() => {
    migrateTimeRecords().catch(console.error);
  }, 5000);
}