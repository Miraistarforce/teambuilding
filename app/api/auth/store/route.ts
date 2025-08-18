import { NextRequest, NextResponse } from 'next/server';
import { validateStoreAccess, validateRolePin, createSession } from '@/lib/auth';
import { mockDb } from '@/lib/db/mock';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId, storePassword, roleType, pin, staffId } = body;

    if (!storeId || !roleType) {
      return NextResponse.json(
        { error: '店舗とロールを選択してください' },
        { status: 400 }
      );
    }

    // Validate store access
    const hasStoreAccess = await validateStoreAccess(storeId, storePassword);
    if (!hasStoreAccess) {
      return NextResponse.json(
        { error: '店舗パスワードが正しくありません' },
        { status: 401 }
      );
    }

    // Validate role PIN
    const hasRoleAccess = await validateRolePin(storeId, roleType, pin);
    if (!hasRoleAccess && roleType !== 'staff') {
      return NextResponse.json(
        { error: 'PINが正しくありません' },
        { status: 401 }
      );
    }

    // Get role info
    const role = await mockDb.getRoleByStoreAndType(storeId, roleType);

    // Create session
    const sessionData: any = {
      storeId,
      roleType,
    };

    if (role) {
      sessionData.roleId = role.id;
    }

    if (staffId) {
      sessionData.staffId = staffId;
    }

    const token = await createSession(sessionData);

    return NextResponse.json({
      success: true,
      storeId,
      roleType,
      token,
    });
  } catch (error) {
    console.error('Store login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}