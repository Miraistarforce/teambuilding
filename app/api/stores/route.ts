import { NextRequest, NextResponse } from 'next/server';
import { getSession, hashPassword } from '@/lib/auth';
import { mockDb } from '@/lib/db/mock';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const storesList = await mockDb.getStoresByCompanyId(session.companyId);

    return NextResponse.json(storesList);
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: '店舗一覧取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      requireStorePassword,
      storePassword,
      managerPin,
      ownerPin,
    } = body;

    if (!name) {
      return NextResponse.json(
        { error: '店舗名を入力してください' },
        { status: 400 }
      );
    }

    // Create store
    const storeData: any = {
      companyId: session.companyId,
      name,
      requireStorePassword: requireStorePassword || false,
    };

    if (requireStorePassword && storePassword) {
      storeData.storePasswordHash = await hashPassword(storePassword);
    }

    const store = await mockDb.createStore(storeData);

    // Note: In a real implementation, roles would be created here
    // For mock, roles are pre-created in mock data

    return NextResponse.json({
      success: true,
      store,
      message: '店舗を作成しました',
    });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { error: '店舗作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const {
      id,
      name,
      requireStorePassword,
      storePassword,
      managerPin,
      ownerPin,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '店舗IDが必要です' },
        { status: 400 }
      );
    }

    // Mock update not implemented
    return NextResponse.json({
      success: true,
      message: '店舗情報を更新しました（モック）',
    });
  } catch (error) {
    console.error('Update store error:', error);
    return NextResponse.json(
      { error: '店舗更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.companyId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '店舗IDが必要です' },
        { status: 400 }
      );
    }

    // Mock delete not implemented

    return NextResponse.json({
      success: true,
      message: '店舗を削除しました',
    });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json(
      { error: '店舗削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}