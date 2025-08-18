import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { staff, timesheets, holidaysJp } from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM format
    const staffId = searchParams.get('staffId');

    if (!month) {
      return NextResponse.json(
        { error: '月を指定してください' },
        { status: 400 }
      );
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(monthNum).padStart(2, '0')}-31`;

    // Build query conditions
    const conditions = [
      gte(timesheets.date, startDate),
      lte(timesheets.date, endDate),
    ];

    if (session.roleType === 'staff' && session.staffId) {
      conditions.push(eq(timesheets.staffId, session.staffId));
    } else if (staffId) {
      conditions.push(eq(timesheets.staffId, parseInt(staffId)));
    } else {
      conditions.push(eq(timesheets.storeId, session.storeId));
    }

    // Get timesheets with staff info
    const timesheetsData = await db
      .select({
        timesheet: timesheets,
        staff: staff,
      })
      .from(timesheets)
      .innerJoin(staff, eq(timesheets.staffId, staff.id))
      .where(and(...conditions))
      .orderBy(timesheets.date);

    // Get holidays for the month
    const holidays = await db
      .select()
      .from(holidaysJp)
      .where(and(
        gte(holidaysJp.date, startDate),
        lte(holidaysJp.date, endDate)
      ));

    const holidayDates = new Set(holidays.map(h => h.date));

    // Calculate payroll for each timesheet
    const payrollData = timesheetsData.map(({ timesheet, staff }) => {
      const hourlyWage = parseFloat(staff.hourlyWage);
      const holidayBonus = parseFloat(staff.holidayBonusPerHour);
      const isHoliday = holidayDates.has(timesheet.date);

      const regularHours = (timesheet.workMinutes - timesheet.nightMinutes) / 60;
      const nightHours = timesheet.nightMinutes / 60;
      const totalHours = timesheet.workMinutes / 60;

      const baseAmount = regularHours * hourlyWage;
      const nightBonusAmount = nightHours * hourlyWage * 0.25; // 25% extra for night
      const holidayBonusAmount = isHoliday ? totalHours * holidayBonus : 0;
      const totalAmount = baseAmount + nightBonusAmount + holidayBonusAmount;

      return {
        date: timesheet.date,
        staffId: staff.id,
        staffName: staff.displayName,
        workMinutes: timesheet.workMinutes,
        nightMinutes: timesheet.nightMinutes,
        isHoliday,
        baseAmount,
        nightBonus: nightBonusAmount,
        holidayBonus: holidayBonusAmount,
        totalAmount,
      };
    });

    // Group by staff if viewing all staff
    let result;
    if (!staffId && session.roleType !== 'staff') {
      const grouped = payrollData.reduce((acc, item) => {
        if (!acc[item.staffId]) {
          acc[item.staffId] = {
            staffId: item.staffId,
            staffName: item.staffName,
            days: [],
            totalAmount: 0,
            totalWorkMinutes: 0,
          };
        }
        acc[item.staffId].days.push(item);
        acc[item.staffId].totalAmount += item.totalAmount;
        acc[item.staffId].totalWorkMinutes += item.workMinutes;
        return acc;
      }, {} as Record<number, any>);

      result = Object.values(grouped);
    } else {
      const totalAmount = payrollData.reduce((sum, item) => sum + item.totalAmount, 0);
      const totalWorkMinutes = payrollData.reduce((sum, item) => sum + item.workMinutes, 0);
      
      result = {
        staffId: payrollData[0]?.staffId,
        staffName: payrollData[0]?.staffName,
        month,
        days: payrollData,
        totalAmount,
        totalWorkMinutes,
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get payroll error:', error);
    return NextResponse.json(
      { error: '給与データ取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { month, staffId, format } = body;

    if (!month || !staffId) {
      return NextResponse.json(
        { error: 'パラメータが不足しています' },
        { status: 400 }
      );
    }

    // Get payroll data (reuse GET logic)
    const url = new URL(request.url);
    url.searchParams.set('month', month);
    url.searchParams.set('staffId', staffId);
    
    const getRequest = new NextRequest(url);
    const payrollResponse = await GET(getRequest);
    const payrollData = await payrollResponse.json();

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(payrollData);
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="payroll_${staffId}_${month}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: payrollData });
  } catch (error) {
    console.error('Generate payroll error:', error);
    return NextResponse.json(
      { error: 'CSV生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

function generateCSV(payrollData: any): string {
  const headers = ['日付', '実働時間(分)', '深夜時間(分)', '祝日', '基本賃金', '深夜加算', '祝日加算', '合計'];
  const rows = payrollData.days.map((day: any) => [
    day.date,
    day.workMinutes,
    day.nightMinutes,
    day.isHoliday ? '○' : '',
    formatCurrency(day.baseAmount),
    formatCurrency(day.nightBonus),
    formatCurrency(day.holidayBonus),
    formatCurrency(day.totalAmount),
  ]);

  rows.push([
    '合計',
    payrollData.totalWorkMinutes,
    '',
    '',
    '',
    '',
    '',
    formatCurrency(payrollData.totalAmount),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // Add BOM for Excel compatibility
  return '\uFEFF' + csvContent;
}