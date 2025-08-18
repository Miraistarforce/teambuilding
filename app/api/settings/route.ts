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
    const key = searchParams.get('key');

    if (key) {
      // Get specific setting
      const setting = await mockDb.getSettingByKey(session.storeId, key);

      if (!setting) {
        // Return default values
        const defaults: Record<string, any> = {
          mood_alert: {
            scoreThreshold: 50,
            consecutiveDays: 3,
            baselineDelta: -15,
          },
        };

        return NextResponse.json({
          key,
          value: defaults[key] || null,
        });
      }

      return NextResponse.json(setting);
    } else {
      // Get all settings (mock returns empty array)
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { error: '設定取得中にエラーが発生しました' },
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
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: '設定のキーと値が必要です' },
        { status: 400 }
      );
    }

    // Upsert setting
    const result = await mockDb.upsertSetting(session.storeId, key, value);

    return NextResponse.json({
      success: true,
      setting: result,
      message: '設定を保存しました',
    });
  } catch (error) {
    console.error('Save setting error:', error);
    return NextResponse.json(
      { error: '設定保存中にエラーが発生しました' },
      { status: 500 }
    );
  }
}