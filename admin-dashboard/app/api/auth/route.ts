import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { adminSecret } = await request.json();
    
    // For now, use a simple comparison. You may want to store this securely
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-secure-admin-secret';
    
    if (adminSecret === ADMIN_SECRET) {
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}