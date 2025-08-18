import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const companies = db.getAllCompanies();
    
    const stats = {
      totalCompanies: companies.length,
      activeCompanies: companies.filter(c => c.isActive).length,
      totalStores: companies.reduce((acc, c) => acc + c.stores.length, 0),
      recentActivity: [
        { type: 'company_created', name: 'デモ会社', timestamp: new Date() },
      ],
    };
    
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 });
  }
}