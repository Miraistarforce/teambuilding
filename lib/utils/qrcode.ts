import QRCode from 'qrcode';

export async function generateQRCode(text: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return qrCodeDataUrl;
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    throw new Error('QRコードの生成に失敗しました');
  }
}

export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(text, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return buffer;
  } catch (err) {
    console.error('Failed to generate QR code buffer:', err);
    throw new Error('QRコードの生成に失敗しました');
  }
}