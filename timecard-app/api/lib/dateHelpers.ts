/**
 * JST (Japan Standard Time) 日付処理ヘルパー関数
 * Vercel Functions は UTC で動作するため、JST への変換が必要
 */

/**
 * JST基準の今日の日付（0時0分0秒）を取得
 * @returns {Date} JST基準の今日の0時（UTC時刻で表現）
 */
export const getTodayJST = (): Date => {
  const now = new Date();
  
  // JST時刻を計算（UTC + 9時間）
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstTime = now.getTime() + jstOffset;
  const jstDate = new Date(jstTime);
  
  // JST基準の今日の年月日を取得
  const year = jstDate.getUTCFullYear();
  const month = jstDate.getUTCMonth();
  const day = jstDate.getUTCDate();
  
  // JST 0:00 を UTC時刻として表現
  // JST 2025-01-09 00:00 = UTC 2025-01-08 15:00
  const todayJST = new Date(Date.UTC(year, month, day - 1, 15, 0, 0, 0));
  
  // デバッグログ（詳細）
  console.log('getTodayJST Debug:', {
    now: now.toISOString(),
    nowJST: new Date(now.getTime() + jstOffset).toISOString(),
    jstDateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    todayJST: todayJST.toISOString(),
    explanation: `JST ${year}/${month+1}/${day} 0:00 = ${todayJST.toISOString()}`
  });
  
  return todayJST;
};

/**
 * JST基準の今日の開始時刻と終了時刻を取得（範囲検索用）
 * @returns {Object} start: 今日の開始時刻, end: 今日の終了時刻
 */
export const getTodayJSTRange = (): { start: Date; end: Date } => {
  const start = getTodayJST();
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1); // 23:59:59.999
  
  return { start, end };
};

/**
 * JST基準の日付文字列を取得（YYYY-MM-DD形式）
 * @param {Date} date - 変換する日付（省略時は現在時刻）
 * @returns {string} JST基準の日付文字列
 */
export const getJSTDateString = (date: Date = new Date()): string => {
  // UTC時刻にJSTオフセットを追加
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 現在時刻がJST基準で今日かどうかを判定
 * @param {Date} targetDate - 判定対象の日付
 * @returns {boolean} JST基準で今日の場合true
 */
export const isJSTToday = (targetDate: Date): boolean => {
  const todayJST = getTodayJST();
  const tomorrowJST = new Date(todayJST);
  tomorrowJST.setDate(tomorrowJST.getDate() + 1);
  
  return targetDate >= todayJST && targetDate < tomorrowJST;
};