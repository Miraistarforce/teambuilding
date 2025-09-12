import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../lib/prisma';
import { getTodayJST, getTodayJSTRange } from '../lib/dateHelpers';


const RecordStatus = {
  NOT_STARTED: 'NOT_STARTED',
  WORKING: 'WORKING',
  ON_BREAK: 'ON_BREAK',
  FINISHED: 'FINISHED'
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // キャッシュを無効化（書き込み系API）
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { staffId } = req.body;
    const now = new Date();
    const today = getTodayJST();
    const { start, end } = getTodayJSTRange();

    // 日付範囲で検索（findFirstを使用）
    const timeRecord = await prisma.timeRecord.findFirst({
      where: {
        staffId,
        date: {
          gte: start,
          lte: end
        }
      },
      include: {
        breakRecords: true
      }
    });

    if (!timeRecord || timeRecord.status !== RecordStatus.ON_BREAK) {
      res.status(400).json({ error: 'Not on break' });
      return;
    }

    const currentBreak = timeRecord.breakRecords.find(b => !b.breakEnd);
    
    if (!currentBreak) {
      res.status(400).json({ error: 'No active break found' });
      return;
    }

    await prisma.breakRecord.update({
      where: { id: currentBreak.id },
      data: {
        breakEnd: now,
        minutes: Math.floor((now.getTime() - currentBreak.breakStart.getTime()) / 60000)
      }
    });

    const updated = await prisma.timeRecord.update({
      where: { id: timeRecord.id },
      data: {
        status: RecordStatus.WORKING
      }
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error('Break end error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}