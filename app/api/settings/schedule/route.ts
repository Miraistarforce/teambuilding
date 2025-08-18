import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storeSchedules } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const schedules = await db
      .select()
      .from(storeSchedules)
      .where(eq(storeSchedules.storeId, session.storeId))
      .orderBy(storeSchedules.weekday, storeSchedules.part);

    // Format schedules by weekday
    const formattedSchedules = Array.from({ length: 7 }, (_, i) => ({
      weekday: i,
      am: schedules.find(s => s.weekday === i && s.part === 'am'),
      pm: schedules.find(s => s.weekday === i && s.part === 'pm'),
    }));

    return NextResponse.json(formattedSchedules);
  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { error: 'スケジュール取得中にエラーが発生しました' },
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
    const { weekday, part, openTime, closeTime, isOpen } = body;

    if (weekday === undefined || !part) {
      return NextResponse.json(
        { error: '曜日と時間帯を指定してください' },
        { status: 400 }
      );
    }

    // Check if schedule exists
    const [existing] = await db
      .select()
      .from(storeSchedules)
      .where(and(
        eq(storeSchedules.storeId, session.storeId),
        eq(storeSchedules.weekday, weekday),
        eq(storeSchedules.part, part)
      ))
      .limit(1);

    let result;
    if (existing) {
      [result] = await db
        .update(storeSchedules)
        .set({
          openTime,
          closeTime,
          isOpen: isOpen !== undefined ? isOpen : true,
        })
        .where(eq(storeSchedules.id, existing.id))
        .returning();
    } else {
      [result] = await db
        .insert(storeSchedules)
        .values({
          storeId: session.storeId,
          weekday,
          part,
          openTime,
          closeTime,
          isOpen: isOpen !== undefined ? isOpen : true,
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      schedule: result,
      message: 'スケジュールを保存しました',
    });
  } catch (error) {
    console.error('Save schedule error:', error);
    return NextResponse.json(
      { error: 'スケジュール保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}