// 日本時間（JST）での日付処理ユーティリティ

// DateオブジェクトをJSTの日付文字列（YYYY-MM-DD）に変換
export function formatDateToJST(date: Date): string {
  // JSTはUTC+9
  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return jstDate.toISOString().split('T')[0];
}

// DateオブジェクトをJSTのローカル日付文字列に変換（ブラウザのタイムゾーンに依存しない）
export function toJSTDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// JSTの時刻文字列を取得（HH:mm形式）
export function toJSTTimeString(date: Date | null): string {
  if (!date) return '-';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 日付の開始時刻を取得（その日の00:00:00）
export function getStartOfDayJST(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// 日付の終了時刻を取得（その日の23:59:59）
export function getEndOfDayJST(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}