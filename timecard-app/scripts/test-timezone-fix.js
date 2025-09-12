/**
 * タイムゾーン修正のテストスクリプト
 * 13時前後での動作を確認
 */

// 修正後のgetTodayJST関数をシミュレート
function getTodayJST_fixed(now) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = now.getTime() + jstOffset;
  const jstDate = new Date(jstTime);
  
  const year = jstDate.getUTCFullYear();
  const month = jstDate.getUTCMonth();
  const day = jstDate.getUTCDate();
  
  // JST 0:00をローカル時刻として作成
  const todayJSTMidnight = new Date(year, month, day);
  todayJSTMidnight.setHours(0, 0, 0, 0);
  
  // JSTからUTCに変換（-9時間）
  const utcTime = todayJSTMidnight.getTime() - jstOffset;
  return new Date(utcTime);
}

// 古いgetTodayJST関数（問題があるバージョン）
function getTodayJST_old(now) {
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = now.getTime() + jstOffset;
  const jstDate = new Date(jstTime);
  
  const year = jstDate.getUTCFullYear();
  const month = jstDate.getUTCMonth();
  const day = jstDate.getUTCDate();
  
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

console.log('=== タイムゾーン修正テスト ===\n');

// テストケース
const testCases = [
  { time: '2025-01-09T03:00:00Z', label: 'JST 12:00（正午）' },
  { time: '2025-01-09T03:59:00Z', label: 'JST 12:59（13時直前）' },
  { time: '2025-01-09T04:00:00Z', label: 'JST 13:00（問題の時刻）' },
  { time: '2025-01-09T04:01:00Z', label: 'JST 13:01（13時直後）' },
  { time: '2025-01-09T05:00:00Z', label: 'JST 14:00' },
  { time: '2025-01-09T14:59:00Z', label: 'JST 23:59（日付変更直前）' },
  { time: '2025-01-09T15:00:00Z', label: 'JST 00:00（日付変更）' },
];

testCases.forEach(test => {
  const now = new Date(test.time);
  const oldResult = getTodayJST_old(now);
  const fixedResult = getTodayJST_fixed(now);
  
  console.log(`${test.label}:`);
  console.log(`  現在時刻: ${now.toISOString()}`);
  console.log(`  旧実装:   ${oldResult.toISOString()}`);
  console.log(`  新実装:   ${fixedResult.toISOString()}`);
  console.log(`  一致: ${oldResult.getTime() === fixedResult.getTime() ? '✓' : '✗ 不一致！'}`);
  console.log('');
});

console.log('=== 重要なポイント ===');
console.log('1. JST 12:59と13:01で同じ日付が返されるか？');

const before13 = new Date('2025-01-09T03:59:00Z');
const after13 = new Date('2025-01-09T04:01:00Z');

const before13_old = getTodayJST_old(before13);
const after13_old = getTodayJST_old(after13);
const before13_fixed = getTodayJST_fixed(before13);
const after13_fixed = getTodayJST_fixed(after13);

console.log('\n旧実装:');
console.log(`  12:59: ${before13_old.toISOString()}`);
console.log(`  13:01: ${after13_old.toISOString()}`);
console.log(`  同じ日付: ${before13_old.getTime() === after13_old.getTime() ? '✓' : '✗'}`);

console.log('\n新実装:');
console.log(`  12:59: ${before13_fixed.toISOString()}`);
console.log(`  13:01: ${after13_fixed.toISOString()}`);
console.log(`  同じ日付: ${before13_fixed.getTime() === after13_fixed.getTime() ? '✓' : '✗'}`);

console.log('\n2. JST 0:00の表現が正しいか？');
const jstMidnight = new Date('2025-01-09T15:00:00Z'); // JST 2025-01-10 00:00
const midnight_old = getTodayJST_old(jstMidnight);
const midnight_fixed = getTodayJST_fixed(jstMidnight);

console.log(`  JST 2025-01-10 00:00 の場合:`);
console.log(`  旧実装: ${midnight_old.toISOString()} (UTC 0:00 - 間違い)`);
console.log(`  新実装: ${midnight_fixed.toISOString()} (UTC 前日15:00 - 正しい)`);

// 期待される結果
console.log('\n=== 期待される結果 ===');
console.log('JST 2025-01-09 の場合:');
console.log('  正しい値: 2025-01-08T15:00:00.000Z (UTC前日15:00)');
console.log('JST 2025-01-10 の場合:');
console.log('  正しい値: 2025-01-09T15:00:00.000Z (UTC前日15:00)');