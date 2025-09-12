import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';
import { getTodayJST, getTodayJSTRange } from '../../lib/dateHelpers';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { staffId } = req.query;
    const today = getTodayJST();
    const { start, end } = getTodayJSTRange();
    
    console.log('Get Today Record Debug:', {
      staffId,
      today: today.toISOString(),
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      jstNow: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString()
    });

    // 日付範囲で検索（findFirstを使用）
    const record = await prisma.timeRecord.findFirst({
      where: {
        staffId: parseInt(staffId as string),
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        breakRecords: true
      }
    });

    res.status(200).json(record || null);
  } catch (error) {
    console.error('Error fetching today record:', error);
    res.status(200).json(null); // エラー時もnullを返す
  }
}