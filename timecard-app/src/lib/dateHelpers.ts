/**
 * JST (Japan Standard Time) 日付処理ヘルパー関数（フロントエンド用）
 * ブラウザのタイムゾーンに関わらず、JST基準の日付を扱う
 */

/**
 * JST基準の日付文字列を取得（YYYY-MM-DD形式）
 * @param {Date} date - 変換する日付（省略時は現在時刻）
 * @returns {string} JST基準の日付文字列
 */
export const getJSTDateString = (date: Date = new Date()): string => {
  // UTC時刻にJSTオフセット（+9時間）を追加
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  const year = jstDate.getUTCFullYear();
  const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jstDate.getUTCDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 現在時刻のJST基準の日付文字列を取得
 * @returns {string} 現在のJST日付文字列（YYYY-MM-DD形式）
 */
export const getTodayJSTString = (): string => {
  return getJSTDateString(new Date());
};

/**
 * JST時刻文字列を取得（HH:MM:SS形式）
 * @param {Date} date - 変換する日付（省略時は現在時刻）
 * @returns {string} JST基準の時刻文字列
 */
export const getJSTTimeString = (date: Date = new Date()): string => {
  // UTC時刻にJSTオフセット（+9時間）を追加
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  
  const hours = String(jstDate.getUTCHours()).padStart(2, '0');
  const minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jstDate.getUTCSeconds()).padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * JST日時文字列を取得（YYYY-MM-DD HH:MM:SS形式）
 * @param {Date} date - 変換する日付（省略時は現在時刻）
 * @returns {string} JST基準の日時文字列
 */
export const getJSTDateTimeString = (date: Date = new Date()): string => {
  return `${getJSTDateString(date)} ${getJSTTimeString(date)}`;
};