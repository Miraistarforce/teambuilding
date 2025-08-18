import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { mockDb } from '@/lib/db/mock';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.storeId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (staffId) {
      // Get single staff member
      const staffMember = await mockDb.getStaffById(parseInt(staffId));

      if (!staffMember) {
        return NextResponse.json(
          { error: 'スタッフが見つかりません' },
          { status: 404 }
        );
      }

      return NextResponse.json(staffMember);
    } else {
      // Get all staff members
      const staffList = await mockDb.getStaffByStoreId(session.storeId);

      return NextResponse.json(staffList);
    }
  } catch (error) {
    console.error('Get staff error:', error);
    return NextResponse.json(
      { error: 'スタッフ情報取得中にエラーが発生しました' },
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
    const {
      displayName,
      hourlyWage,
      holidayBonusPerHour = '0',
      mbti,
      hobby,
      recentInterest,
      monthlyGoal,
      hireDate,
      position,
      active = true,
    } = body;

    if (!displayName || !hourlyWage || !hireDate) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    const newStaff = await mockDb.createStaff({
        storeId: session.storeId,
        displayName,
        hourlyWage,
        holidayBonusPerHour,
        mbti,
        hobby,
        recentInterest,
        monthlyGoal,
        hireDate,
        position,
        active,
      });

    return NextResponse.json({
      success: true,
      staff: newStaff,
      message: 'スタッフを追加しました',
    });
  } catch (error) {
    console.error('Create staff error:', error);
    return NextResponse.json(
      { error: 'スタッフ追加中にエラーが発生しました' },
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
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'スタッフIDが必要です' },
        { status: 400 }
      );
    }

    const updated = await mockDb.updateStaff(id, updateData);

    return NextResponse.json({
      success: true,
      staff: updated,
      message: 'スタッフ情報を更新しました',
    });
  } catch (error) {
    console.error('Update staff error:', error);
    return NextResponse.json(
      { error: 'スタッフ更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.roleType !== 'owner') {
      return NextResponse.json({ error: 'オーナー権限が必要です' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('id');

    if (!staffId) {
      return NextResponse.json(
        { error: 'スタッフIDが必要です' },
        { status: 400 }
      );
    }

    // Soft delete by setting active to false
    await mockDb.updateStaff(parseInt(staffId), { active: false });

    return NextResponse.json({
      success: true,
      message: 'スタッフを削除しました',
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    return NextResponse.json(
      { error: 'スタッフ削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}