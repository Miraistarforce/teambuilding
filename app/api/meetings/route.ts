import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { meetings, staff } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { mockSTT, summarizeMeeting } from '@/lib/ai/mock';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const meetingsList = await db
      .select({
        meeting: meetings,
        staff: staff,
      })
      .from(meetings)
      .leftJoin(staff, eq(meetings.staffId, staff.id))
      .where(eq(meetings.storeId, session.storeId))
      .orderBy(desc(meetings.createdAt));

    const formattedMeetings = meetingsList.map(({ meeting, staff }) => ({
      ...meeting,
      staffName: staff?.displayName || '全体',
    }));

    return NextResponse.json(formattedMeetings);
  } catch (error) {
    console.error('Get meetings error:', error);
    return NextResponse.json(
      { error: '面談記録取得中にエラーが発生しました' },
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

    const formData = await request.formData();
    const source = formData.get('source') as string;
    const staffId = formData.get('staffId') as string;
    const text = formData.get('text') as string;
    const audioFile = formData.get('audio') as File;

    if (!source || !session.storeId) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    let transcript = text;
    let audioUrl = null;

    // Handle audio upload
    if (source === 'audio' && audioFile) {
      // In production, upload to storage service
      // For now, mock the STT process
      audioUrl = `/mock/audio/${Date.now()}.m4a`;
      transcript = await mockSTT(audioUrl);
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'テキストまたは音声ファイルが必要です' },
        { status: 400 }
      );
    }

    // Summarize meeting
    const summaryResult = await summarizeMeeting(transcript);

    // Create meeting record
    const [meeting] = await db
      .insert(meetings)
      .values({
        storeId: session.storeId,
        staffId: staffId ? parseInt(staffId) : null,
        source,
        audioUrl,
        transcript,
        summary: summaryResult.summary,
        bullets: summaryResult.categories,
        profileUpdates: summaryResult.profileUpdates,
        createdByRole: session.roleType!,
      })
      .returning();

    // Update staff profile if applicable
    if (staffId && summaryResult.profileUpdates) {
      const updates: any = {};
      
      if (summaryResult.profileUpdates.hobby) {
        updates.hobby = summaryResult.profileUpdates.hobby;
      }
      if (summaryResult.profileUpdates.recentInterest) {
        updates.recentInterest = summaryResult.profileUpdates.recentInterest;
      }
      if (summaryResult.profileUpdates.monthlyGoal) {
        updates.monthlyGoal = summaryResult.profileUpdates.monthlyGoal;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date();
        
        await db
          .update(staff)
          .set(updates)
          .where(eq(staff.id, parseInt(staffId)));
      }
    }

    return NextResponse.json({
      success: true,
      meeting,
      message: '面談記録を保存しました',
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json(
      { error: '面談記録作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}