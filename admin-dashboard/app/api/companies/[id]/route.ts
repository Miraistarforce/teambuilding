import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = db.deleteCompany(params.id);
    
    if (success) {
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: '会社が見つかりません' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}