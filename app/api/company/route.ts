import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/auth';

// This API is for internal use only (company admin panel)
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'demo-admin-secret';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminSecret = searchParams.get('secret');

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    const companiesList = await db.select().from(companies).orderBy(companies.name);

    return NextResponse.json(companiesList);
  } catch (error) {
    console.error('Get companies error:', error);
    return NextResponse.json(
      { error: '会社一覧取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password, adminSecret } = body;

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    if (!name || !password) {
      return NextResponse.json(
        { error: '会社名とパスワードを入力してください' },
        { status: 400 }
      );
    }

    // Check if company already exists
    const [existing] = await db
      .select()
      .from(companies)
      .where(eq(companies.name, name))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'この会社名は既に登録されています' },
        { status: 400 }
      );
    }

    // Hash password and create company
    const passwordHash = await hashPassword(password);
    
    const [company] = await db
      .insert(companies)
      .values({
        name,
        passwordHash,
      })
      .returning();

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
      },
      loginUrl: `${process.env.NEXT_PUBLIC_APP_URL}/company/login`,
    });
  } catch (error) {
    console.error('Create company error:', error);
    return NextResponse.json(
      { error: '会社作成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, password, adminSecret } = body;

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json(
        { error: '会社IDが必要です' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (name) {
      updateData.name = name;
    }
    
    if (password) {
      updateData.passwordHash = await hashPassword(password);
    }

    const [updated] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      company: {
        id: updated.id,
        name: updated.name,
      },
    });
  } catch (error) {
    console.error('Update company error:', error);
    return NextResponse.json(
      { error: '会社更新中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const adminSecret = searchParams.get('secret');

    if (adminSecret !== ADMIN_SECRET) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 });
    }

    if (!id) {
      return NextResponse.json(
        { error: '会社IDが必要です' },
        { status: 400 }
      );
    }

    await db.delete(companies).where(eq(companies.id, parseInt(id)));

    return NextResponse.json({
      success: true,
      message: '会社を削除しました',
    });
  } catch (error) {
    console.error('Delete company error:', error);
    return NextResponse.json(
      { error: '会社削除中にエラーが発生しました' },
      { status: 500 }
    );
  }
}