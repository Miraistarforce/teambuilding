// 深夜労働時間帯の定義（22:00-5:00）
const NIGHT_SHIFT_START_HOUR = 22; // 22:00
const NIGHT_SHIFT_END_HOUR = 5;    // 5:00

/**
 * 深夜労働時間を計算する関数
 * @param clockIn 出勤時刻
 * @param clockOut 退勤時刻
 * @returns 深夜労働の分数
 */
export function calculateNightShiftMinutes(clockIn: Date, clockOut: Date): number {
  const clockInTime = new Date(clockIn);
  const clockOutTime = new Date(clockOut);
  
  // 同じ日の22:00と翌日の5:00を設定
  const nightStart = new Date(clockInTime);
  nightStart.setHours(NIGHT_SHIFT_START_HOUR, 0, 0, 0);
  
  const nightEnd = new Date(clockInTime);
  nightEnd.setDate(nightEnd.getDate() + 1);
  nightEnd.setHours(NIGHT_SHIFT_END_HOUR, 0, 0, 0);
  
  // 前日の22:00（早朝シフトの場合）
  const prevNightStart = new Date(nightStart);
  prevNightStart.setDate(prevNightStart.getDate() - 1);
  
  // 当日の5:00（早朝シフトの場合）
  const currentDayMorningEnd = new Date(clockInTime);
  currentDayMorningEnd.setHours(NIGHT_SHIFT_END_HOUR, 0, 0, 0);
  
  let nightMinutes = 0;
  
  // ケース1: 深夜帯を跨ぐ勤務（例: 21:00-23:00）
  if (clockInTime < nightStart && clockOutTime > nightStart) {
    const nightEndTime = clockOutTime < nightEnd ? clockOutTime : nightEnd;
    nightMinutes += Math.floor((nightEndTime.getTime() - nightStart.getTime()) / 60000);
  }
  
  // ケース2: 完全に深夜帯の勤務（例: 23:00-3:00）
  if (clockInTime >= nightStart && clockOutTime <= nightEnd) {
    nightMinutes += Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
  }
  
  // ケース3: 深夜帯開始前から翌朝まで（例: 20:00-6:00）
  if (clockInTime < nightStart && clockOutTime > nightEnd) {
    nightMinutes += Math.floor((nightEnd.getTime() - nightStart.getTime()) / 60000);
  }
  
  // ケース4: 深夜帯途中から翌朝まで（例: 0:00-6:00）
  if (clockInTime >= nightStart && clockInTime < nightEnd && clockOutTime > nightEnd) {
    nightMinutes += Math.floor((nightEnd.getTime() - clockInTime.getTime()) / 60000);
  }
  
  // ケース5: 早朝シフト（例: 4:00-8:00）
  if (clockInTime < currentDayMorningEnd) {
    const effectiveStart = clockInTime;
    const effectiveEnd = clockOutTime < currentDayMorningEnd ? clockOutTime : currentDayMorningEnd;
    nightMinutes += Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000);
  }
  
  // ケース6: 前日からの継続勤務（例: 前日23:00-当日1:00）
  if (clockInTime < clockOutTime && clockOutTime < currentDayMorningEnd && 
      clockInTime.getHours() >= NIGHT_SHIFT_START_HOUR) {
    // 前日の22:00以降から開始している場合
    nightMinutes += Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
  }
  
  return Math.max(0, nightMinutes);
}

/**
 * 深夜労働を考慮した給与計算
 * @param clockIn 出勤時刻
 * @param clockOut 退勤時刻
 * @param breakMinutes 休憩時間（分）
 * @param hourlyWage 時給
 * @param overtimeRate 残業倍率
 * @returns 給与詳細
 */
export function calculatePayWithNightShift(
  clockIn: Date,
  clockOut: Date,
  breakMinutes: number,
  hourlyWage: number,
  overtimeRate: number = 1.25
): {
  totalPay: number;
  regularPay: number;
  overtimePay: number;
  nightShiftPay: number;
  nightOvertimePay: number;
  regularMinutes: number;
  overtimeMinutes: number;
  nightMinutes: number;
  nightOvertimeMinutes: number;
} {
  // 総勤務時間（休憩を除く）
  const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMinutes;
  
  // 8時間（480分）を超えた分が残業
  const regularMinutes = Math.min(totalMinutes, 480);
  const overtimeMinutes = Math.max(0, totalMinutes - 480);
  
  // 深夜労働時間を計算
  const totalNightMinutes = calculateNightShiftMinutes(clockIn, clockOut);
  
  // 深夜労働時間を通常と残業に分割
  // 深夜労働時間のうち、最初の8時間分は通常の深夜労働
  // 8時間を超えた分は深夜残業
  let nightRegularMinutes = 0;
  let nightOvertimeMinutes = 0;
  
  if (totalNightMinutes > 0) {
    // 深夜労働が8時間以内の通常勤務に含まれる分
    nightRegularMinutes = Math.min(totalNightMinutes, regularMinutes);
    
    // 深夜労働が残業時間に含まれる分
    if (totalNightMinutes > nightRegularMinutes && overtimeMinutes > 0) {
      nightOvertimeMinutes = Math.min(totalNightMinutes - nightRegularMinutes, overtimeMinutes);
    }
  }
  
  // 各種給与を計算
  // 通常勤務（深夜以外）
  const dayRegularMinutes = regularMinutes - nightRegularMinutes;
  const regularPay = (dayRegularMinutes / 60) * hourlyWage;
  
  // 通常の残業（深夜以外）
  const dayOvertimeMinutes = overtimeMinutes - nightOvertimeMinutes;
  const overtimePay = (dayOvertimeMinutes / 60) * hourlyWage * overtimeRate;
  
  // 深夜手当（通常勤務時間内の深夜労働）
  const nightShiftPay = (nightRegularMinutes / 60) * hourlyWage * 1.25;
  
  // 深夜残業手当（残業時間内の深夜労働：1.50倍）
  const nightOvertimePay = (nightOvertimeMinutes / 60) * hourlyWage * 1.50;
  
  const totalPay = Math.floor(regularPay + overtimePay + nightShiftPay + nightOvertimePay);
  
  return {
    totalPay,
    regularPay: Math.floor(regularPay),
    overtimePay: Math.floor(overtimePay),
    nightShiftPay: Math.floor(nightShiftPay),
    nightOvertimePay: Math.floor(nightOvertimePay),
    regularMinutes: dayRegularMinutes,
    overtimeMinutes: dayOvertimeMinutes,
    nightMinutes: nightRegularMinutes,
    nightOvertimeMinutes
  };
}