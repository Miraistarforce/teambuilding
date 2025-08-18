import { NextRequest, NextResponse } from 'next/server';
import { generateQRCodeBuffer } from '@/lib/utils/qrcode';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: '会社IDが必要です' },
        { status: 400 }
      );
    }

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/company/access`;
    const qrBuffer = await generateQRCodeBuffer(loginUrl);

    return new NextResponse(qrBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="company_${companyId}_qr.png"`,
      },
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    return NextResponse.json(
      { error: 'QRコード生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}