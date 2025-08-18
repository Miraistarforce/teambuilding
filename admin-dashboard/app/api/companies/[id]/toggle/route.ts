import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = db.toggleCompanyStatus(params.id);
    
    if (company) {
      return NextResponse.json(company);
    }
    
    return NextResponse.json({ error: '会社が見つかりません' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}