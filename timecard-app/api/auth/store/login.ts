import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { storeId, password, role } = req.body;

    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) }
    });

    if (!store || !store.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const correctPassword = role === 'owner' ? store.ownerPassword : store.managerPassword;
    
    if (password !== correctPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { 
        storeId: store.id,
        storeName: store.name,
        role,
        type: 'store'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      store: {
        id: store.id,
        name: store.name,
        role
      }
    });
  } catch (error) {
    console.error('Store login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}