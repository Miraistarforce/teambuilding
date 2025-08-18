import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getNowJST } from '@/lib/utils/date';
import { estimateTone } from '@/lib/ai/mock';
import { mockDb } from '@/lib/db/mock';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const staffId = searchParams.get('staffId');

    const conditions = [eq(dailyReports.storeId, session.storeId)];

    if (startDate) {
      conditions.push(gte(dailyReports.createdAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(dailyReports.createdAt, new Date(endDate)));
    }
    if (staffId) {
      conditions.push(eq(dailyReports.staffId, parseInt(staffId)));
    }

    // Get reports with staff info (mock)
    const reports = await mockDb.getReportsByStoreId(session.storeId);
    return NextResponse.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: '日報取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.staffId || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      moodScore,
      didWell,
      customerVoice,
      improvement,
      competitor,
      other,
    } = body;

    // Validate required fields
    if (!moodScore) {
      return NextResponse.json(
        { error: '今日の気分を選択してください' },
        { status: 400 }
      );
    }

    // Combine all text for tone analysis
    const allText = [didWell, customerVoice, improvement, competitor, other]
      .filter(Boolean)
      .join(' ');

    // Estimate tone
    let toneScore = null;
    let baselineTone = null;
    let delta = null;

    if (allText) {
      const toneResult = await estimateTone(allText);
      toneScore = toneResult.score;
      // Mock baseline calculation
      baselineTone = 60;
      delta = toneScore - baselineTone;
    }

    // Create report
    const report = await mockDb.createReport({
        storeId: session.storeId,
        staffId: session.staffId,
        moodScore,
        didWell,
        customerVoice,
        improvement,
        competitor,
        other,
        tokensCount: allText.length,
        toneScore,
        baselineTone,
        delta,
      });

    return NextResponse.json({
      success: true,
      report,
      message: '日報を送信しました',
    });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: '日報送信中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { reportId, ...updateData } = body;

    if (!reportId) {
      return NextResponse.json(
        { error: '日報IDが必要です' },
        { status: 400 }
      );
    }

    // Mock update not implemented
    return NextResponse.json({
      success: true,
      message: '日報を更新しました（モック）',
    });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: '日報更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['owner', 'manager'].includes(session.roleType || '')) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json(
        { error: '日報IDが必要です' },
        { status: 400 }
      );
    }

    await mockDb.deleteReport(parseInt(reportId));

    return NextResponse.json({
      success: true,
      message: '日報を削除しました',
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: '日報削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}