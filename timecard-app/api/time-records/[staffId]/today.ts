import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const getToday = () => {
  const now = new Date();
  // 午前4時を基準に日付を判定
  if (now.getHours() < 4) {
    now.setDate(now.getDate() - 1);
  }
  now.setHours(0, 0, 0, 0);
  return now;
};

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
    const today = getToday();

    const record = await prisma.timeRecord.findUnique({
      where: {
        staffId_date: {
          staffId: parseInt(staffId as string),
          date: today
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
  } finally {
    await prisma.$disconnect();
  }
}