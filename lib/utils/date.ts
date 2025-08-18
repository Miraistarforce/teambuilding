import { format, formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import { startOfMonth, endOfMonth, eachDayOfInterval, getHours, getMinutes, differenceInMinutes } from 'date-fns';

const JST_TIMEZONE = 'Asia/Tokyo';

export function toJST(date: Date | string): Date {
  return toZonedTime(date, JST_TIMEZONE);
}

export function fromJST(date: Date | string): Date {
  return fromZonedTime(date, JST_TIMEZONE);
}

export function formatJST(date: Date | string, formatStr: string): string {
  return formatInTimeZone(date, JST_TIMEZONE, formatStr);
}

export function getNowJST(): Date {
  return toZonedTime(new Date(), JST_TIMEZONE);
}

export function getMonthDays(year: number, month: number): Date[] {
  const start = startOfMonth(new Date(year, month - 1));
  const end = endOfMonth(new Date(year, month - 1));
  return eachDayOfInterval({ start, end });
}

export function isNightTime(date: Date): boolean {
  const hours = getHours(date);
  return hours >= 22 || hours < 5;
}

export function calculateNightMinutes(startTime: Date, endTime: Date): number {
  let nightMinutes = 0;
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  // 深夜時間帯の計算（22:00-5:00）
  while (start < end) {
    const currentHour = getHours(start);
    const nextHour = new Date(start);
    nextHour.setHours(currentHour + 1, 0, 0, 0);
    
    const periodEnd = nextHour > end ? end : nextHour;
    const periodMinutes = differenceInMinutes(periodEnd, start);
    
    if (currentHour >= 22 || currentHour < 5) {
      nightMinutes += periodMinutes;
    }
    
    start.setTime(nextHour.getTime());
  }
  
  return nightMinutes;
}

export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}時間${mins}分`;
}