import * as HolidayJp from '@holiday-jp/holiday_jp';

// 日本の祝日を判定する関数（自動更新対応）
export function isJapaneseHoliday(date: Date): boolean {
  // @holiday-jp/holiday_jpライブラリを使用して正確に判定
  return HolidayJp.isHoliday(date);
}

// 祝日の名前を取得する関数
export function getHolidayName(date: Date): string | null {
  const holiday = HolidayJp.between(date, date)[0];
  return holiday ? holiday.name : null;
}

// 残業時間を計算する関数（8時間を超えた分）
export function calculateOvertimeMinutes(workMinutes: number): number {
  const regularHours = 8;
  const regularMinutes = regularHours * 60;
  return Math.max(0, workMinutes - regularMinutes);
}

// 給与を計算する関数
export function calculateDailyPay(
  workMinutes: number,
  hourlyWage: number,
  holidayAllowance: number = 0,
  overtimeRate: number = 1.25,
  date: Date
): number {
  const isHoliday = isJapaneseHoliday(date);
  const overtimeMinutes = calculateOvertimeMinutes(workMinutes);
  const regularMinutes = workMinutes - overtimeMinutes;
  
  // 基本時給（祝日の場合は祝日手当を加算）
  const baseWage = isHoliday ? hourlyWage + holidayAllowance : hourlyWage;
  
  // 通常勤務分の給与
  const regularPay = (regularMinutes / 60) * baseWage;
  
  // 残業分の給与（残業代倍率を適用）
  const overtimePay = (overtimeMinutes / 60) * baseWage * overtimeRate;
  
  return Math.floor(regularPay + overtimePay);
}

// 月給を計算する関数
export function calculateMonthlySalary(
  dailyRecords: Array<{
    date: string;
    workMinutes: number;
  }>,
  hourlyWage: number,
  holidayAllowance: number = 0,
  overtimeRate: number = 1.25,
  otherAllowance: number = 0
): {
  totalSalary: number;
  regularPay: number;
  overtimePay: number;
  holidayPay: number;
  otherPay: number;
  totalOvertimeMinutes: number;
  holidayWorkDays: number;
} {
  let regularPay = 0;
  let overtimePay = 0;
  let holidayPay = 0;
  let totalOvertimeMinutes = 0;
  let holidayWorkDays = 0;
  
  dailyRecords.forEach(record => {
    const date = new Date(record.date);
    const isHoliday = isJapaneseHoliday(date);
    const overtimeMinutes = calculateOvertimeMinutes(record.workMinutes);
    const regularMinutes = record.workMinutes - overtimeMinutes;
    
    totalOvertimeMinutes += overtimeMinutes;
    
    if (isHoliday) {
      holidayWorkDays++;
      // 祝日手当分を別計算
      holidayPay += (record.workMinutes / 60) * holidayAllowance;
    }
    
    // 通常給与
    regularPay += (regularMinutes / 60) * hourlyWage;
    
    // 残業代
    overtimePay += (overtimeMinutes / 60) * hourlyWage * overtimeRate;
  });
  
  const totalSalary = Math.floor(regularPay + overtimePay + holidayPay + otherAllowance);
  
  return {
    totalSalary,
    regularPay: Math.floor(regularPay),
    overtimePay: Math.floor(overtimePay),
    holidayPay: Math.floor(holidayPay),
    otherPay: otherAllowance,
    totalOvertimeMinutes,
    holidayWorkDays
  };
}