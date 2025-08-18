import { NextRequest, NextResponse } from 'next/server';
import { validateCompanyLogin, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, password } = body;

    if (!name || !password) {
      return NextResponse.json(
        { error: '会社名とパスワードを入力してください' },
        { status: 400 }
      );
    }

    const company = await validateCompanyLogin(name, password);
    
    if (!company) {
      return NextResponse.json(
        { error: '会社名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    const token = await createSession({
      companyId: company.id,
    });

    return NextResponse.json({
      success: true,
      companyId: company.id,
      companyName: company.name,
      token,
    });
  } catch (error) {
    console.error('Company login error:', error);
    return NextResponse.json(
      { error: 'ログイン処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}