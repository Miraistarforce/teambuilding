import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reportRewards } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.roleType !== 'owner') {
      return NextResponse.json({ error: 'オーナー権限が必要です' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, message } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: '日報IDが必要です' },
        { status: 400 }
      );
    }

    const [reward] = await db
      .insert(reportRewards)
      .values({
        reportId,
        byRole: 'owner',
        message: message || 'オーナーから賞与が贈られました！',
        effect: 'sparkle',
      })
      .returning();

    return NextResponse.json({
      success: true,
      reward,
      message: '賞与を贈りました',
    });
  } catch (error) {
    console.error('Add reward error:', error);
    return NextResponse.json(
      { error: '賞与追加中にエラーが発生しました' },
      { status: 500 }
    );
  }
}