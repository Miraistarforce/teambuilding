import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

// 認証ミドルウェア
const authenticate = (token: string | undefined) => {
  if (!token) throw new Error('No token provided');
  
  try {
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { id } = req.query;

    if (req.method === 'GET') {
      const staff = await prisma.staff.findUnique({
        where: { id: parseInt(id as string) }
      });
      
      if (!staff) {
        res.status(404).json({ error: 'Staff not found' });
        return;
      }
      
      // Get store separately to avoid qrEnabled column issue
      const store = await prisma.store.findUnique({
        where: { id: staff.storeId },
        select: {
          id: true,
          name: true,
          companyId: true,
          isActive: true,
          bonusEnabled: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(200).json({ ...staff, store });
    } else if (req.method === 'PUT') {
      const { 
        name, 
        hourlyWage, 
        isActive,
        holidayAllowance,
        overtimeRate,
        otherAllowance,
        transportationAllowance,
        hasTransportation,
        hireDate,
        mbtiType
      } = req.body;

      const updateData: any = {};
      
      if (name !== undefined) updateData.name = name;
      if (hourlyWage !== undefined) updateData.hourlyWage = hourlyWage;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (holidayAllowance !== undefined) updateData.holidayAllowance = holidayAllowance;
      if (overtimeRate !== undefined) updateData.overtimeRate = overtimeRate;
      if (otherAllowance !== undefined) updateData.otherAllowance = otherAllowance;
      if (transportationAllowance !== undefined) updateData.transportationAllowance = transportationAllowance;
      if (hasTransportation !== undefined) updateData.hasTransportation = hasTransportation;
      if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
      if (mbtiType !== undefined) updateData.mbtiType = mbtiType;

      const staff = await prisma.staff.update({
        where: { id: parseInt(id as string) },
        data: updateData
      });

      res.status(200).json(staff);
    } else if (req.method === 'DELETE') {
      await prisma.staff.delete({
        where: { id: parseInt(id as string) }
      });

      res.status(204).end();
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Staff operation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}