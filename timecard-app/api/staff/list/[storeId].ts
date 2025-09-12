import type { VercelRequest, VercelResponse } from '@vercel/node';
import prisma from '../../lib/prisma';


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
    const { storeId } = req.query;

    const staff = await prisma.staff.findMany({
      where: {
        storeId: parseInt(storeId as string),
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json(staff);
  } catch (error) {
    console.error('Staff list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}