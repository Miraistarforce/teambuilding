import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const companies = db.getAllCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();
    
    if (!name || !password) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
    }
    
    const company = db.createCompany(name, password);
    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}