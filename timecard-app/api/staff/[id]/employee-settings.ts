import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    const decoded = authenticate(token) as any;

    const { id } = req.query;
    const staffId = parseInt(id as string);

    if (req.method === 'GET') {
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          id: true,
          storeId: true,
          hourlyWage: true,
          overtimeRate: true
        }
      });
      
      if (!staff) {
        res.status(404).json({ error: 'Staff not found' });
        return;
      }
      
      // Check if user has access to this staff's store
      if (decoded?.type === 'store' && decoded.storeId !== staff.storeId) {
        res.status(403).json({ error: 'Access denied to this staff member' });
        return;
      }
      
      // Try to get employee settings from the EmployeeSettings table
      const settings = await prisma.employeeSettings.findUnique({
        where: { staffId }
      });
      
      // Return settings or defaults
      const employeeSettings = settings || {
        employeeType: 'hourly',
        monthlyBaseSalary: 0,
        monthlyWorkDays: 20,
        scheduledStartTime: '09:00',
        scheduledEndTime: '18:00',
        includeEarlyArrivalAsOvertime: false
      };
      
      res.status(200).json({
        ...employeeSettings,
        currentHourlyWage: staff.hourlyWage,
        overtimeRate: staff.overtimeRate
      });
    } else if (req.method === 'PUT') {
      const { 
        employeeType,
        monthlyBaseSalary,
        monthlyWorkDays,
        scheduledStartTime,
        scheduledEndTime,
        includeEarlyArrivalAsOvertime
      } = req.body;
      
      // Check if staff exists
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          id: true,
          storeId: true
        }
      });
      
      if (!staff) {
        res.status(404).json({ error: 'Staff not found' });
        return;
      }
      
      // Check if user has access to this staff's store
      if (decoded?.type === 'store' && decoded.storeId !== staff.storeId) {
        res.status(403).json({ error: 'Access denied to this staff member' });
        return;
      }
      
      // Prepare employee settings data
      const settingsData = {
        employeeType: employeeType || 'hourly',
        monthlyBaseSalary: monthlyBaseSalary || 0,
        monthlyWorkDays: monthlyWorkDays || 20,
        scheduledStartTime: scheduledStartTime || '09:00',
        scheduledEndTime: scheduledEndTime || '18:00',
        includeEarlyArrivalAsOvertime: includeEarlyArrivalAsOvertime || false
      };
      
      // Upsert employee settings
      const settings = await prisma.employeeSettings.upsert({
        where: { staffId },
        update: settingsData,
        create: {
          ...settingsData,
          staffId
        }
      });
      
      // If monthly, calculate equivalent hourly wage for storage
      if (employeeType === 'monthly' && monthlyBaseSalary && monthlyWorkDays) {
        // Calculate scheduled start and end time to get daily hours
        const startTime = scheduledStartTime || '09:00';
        const endTime = scheduledEndTime || '18:00';
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = parseInt(endTime.split(':')[0]);
        const dailyHours = endHour - startHour;
        
        // Calculate hourly wage based on monthly salary and work days
        const workHoursPerMonth = monthlyWorkDays * dailyHours;
        const hourlyWageUpdate = Math.round(monthlyBaseSalary / workHoursPerMonth);
        
        await prisma.staff.update({
          where: { id: staffId },
          data: { hourlyWage: hourlyWageUpdate }
        });
      }
      
      res.status(200).json({ success: true, employeeSettings: settings });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Employee settings error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}