import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reportComments } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, stamp, text, templateKey } = body;

    if (!reportId || (!stamp && !text && !templateKey)) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    const [comment] = await db
      .insert(reportComments)
      .values({
        reportId,
        authorRole: session.roleType!,
        stamp,
        text,
        insertedTemplateKey: templateKey,
      })
      .returning();

    return NextResponse.json({
      success: true,
      comment,
      message: 'コメントを追加しました',
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json(
      { error: 'コメント追加中にエラーが発生しました' },
      { status: 500 }
    );
  }
}