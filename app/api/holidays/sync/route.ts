import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { holidaysJp } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { japaneseHolidays2024, japaneseHolidays2025 } from '@/lib/data/holidays';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    // Combine all holidays
    const allHolidays = [...japaneseHolidays2024, ...japaneseHolidays2025];

    // Insert holidays (ignore duplicates)
    for (const holiday of allHolidays) {
      try {
        await db
          .insert(holidaysJp)
          .values({
            date: holiday.date,
            name: holiday.name,
          })
          .onConflictDoNothing();
      } catch (error) {
        // Ignore duplicate errors
        console.log(`Holiday ${holiday.date} already exists`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${allHolidays.length}件の祝日データを同期しました`,
      count: allHolidays.length,
    });
  } catch (error) {
    console.error('Sync holidays error:', error);
    return NextResponse.json(
      { error: '祝日同期中にエラーが発生しました' },
      { status: 500 }
    );
  }
}