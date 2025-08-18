// 日本時間での日付処理ユーティリティ

// DateをJST形式の日付文字列に変換
export function formatDateToJST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 日付文字列をDateオブジェクトに変換（JST想定）
export function parseJSTDate(dateStr: string): Date {
  // YYYY-MM-DD形式の文字列を受け取り、その日の00:00:00のDateオブジェクトを返す
  // タイムゾーンの問題を避けるため、ローカルタイムとして処理
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

// 時刻をJST形式で表示
export function formatTimeJST(date: Date | string | null): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// 日付を日本語形式で表示
export function formatDateJapanese(date: Date | string): string {
  const d = typeof date === 'string' ? parseJSTDate(date) : date;
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekdays[d.getDay()]})`;
}