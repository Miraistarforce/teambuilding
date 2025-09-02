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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  try {
    // /api/staff/list/:storeId - 公開用（認証不要）
    if (pathSegments[2] === 'list' && pathSegments[3]) {
      const storeId = parseInt(pathSegments[3]);
      const staff = await prisma.staff.findMany({
        where: {
          storeId,
          isActive: true
        },
        orderBy: { name: 'asc' }
      });
      res.status(200).json(staff);
      return;
    }

    // 以降は認証が必要
    const token = req.headers.authorization;
    const decoded = authenticate(token) as any;

    // /api/staff/store/:storeId - 店舗のスタッフ一覧
    if (pathSegments[2] === 'store' && pathSegments[3]) {
      const storeId = parseInt(pathSegments[3]);
      const staff = await prisma.staff.findMany({
        where: { storeId },
        orderBy: { name: 'asc' }
      });
      res.status(200).json(staff);
      return;
    }

    // /api/staff/:id/employee-settings - 正社員設定
    if (pathSegments[2] && pathSegments[3] === 'employee-settings') {
      const staffId = parseInt(pathSegments[2]);
      
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
        
        const settings = await prisma.employeeSettings.findUnique({
          where: { staffId }
        });
        
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
        
        const settingsData = {
          employeeType: employeeType || 'hourly',
          monthlyBaseSalary: monthlyBaseSalary || 0,
          monthlyWorkDays: monthlyWorkDays || 20,
          scheduledStartTime: scheduledStartTime || '09:00',
          scheduledEndTime: scheduledEndTime || '18:00',
          includeEarlyArrivalAsOvertime: includeEarlyArrivalAsOvertime || false
        };
        
        const settings = await prisma.employeeSettings.upsert({
          where: { staffId },
          update: settingsData,
          create: {
            ...settingsData,
            staffId
          }
        });
        
        res.status(200).json({ success: true, employeeSettings: settings });
      }
      return;
    }

    // /api/staff/:id/stats - スタッフ統計
    if (pathSegments[2] && pathSegments[3] === 'stats') {
      const staffId = parseInt(pathSegments[2]);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const lastWork = await prisma.timeRecord.findFirst({
        where: {
          staffId,
          status: { in: ['FINISHED', 'COMPLETED'] },
          clockOut: { not: null }
        },
        orderBy: { date: 'desc' },
        select: { date: true }
      });
      
      const monthlyAttendance = await prisma.timeRecord.count({
        where: {
          staffId,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          },
          status: { in: ['FINISHED', 'COMPLETED'] },
          clockOut: { not: null }
        }
      });
      
      res.status(200).json({
        lastWorkDate: lastWork?.date || null,
        monthlyAttendance,
        monthlySalary: 0, // 簡略化
        isMonthlyEmployee: false,
        overtimeHours: 0,
        overtimePay: 0
      });
      return;
    }

    // /api/staff/:id - 個別スタッフ操作
    if (pathSegments[2] && !pathSegments[3]) {
      const staffId = parseInt(pathSegments[2]);

      if (req.method === 'GET') {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId }
        });
        
        if (!staff) {
          res.status(404).json({ error: 'Staff not found' });
          return;
        }
        
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
        const updateData: any = {};
        const { 
          name, hourlyWage, isActive, holidayAllowance,
          overtimeRate, otherAllowance, transportationAllowance,
          hasTransportation, hireDate, mbtiType
        } = req.body;
        
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
          where: { id: staffId },
          data: updateData
        });

        res.status(200).json(staff);
      } else if (req.method === 'DELETE') {
        await prisma.staff.delete({
          where: { id: staffId }
        });
        res.status(204).end();
      }
      return;
    }

    // /api/staff - スタッフ作成
    if (!pathSegments[2] && req.method === 'POST') {
      const { 
        name, hourlyWage, storeId,
        holidayAllowance, overtimeRate, otherAllowance,
        transportationAllowance, hasTransportation, hireDate
      } = req.body;

      const actualStoreId = storeId || decoded?.storeId;

      if (!actualStoreId) {
        res.status(400).json({ error: 'Store ID is required' });
        return;
      }

      const existing = await prisma.staff.findFirst({
        where: {
          storeId: actualStoreId,
          name
        }
      });

      if (existing) {
        res.status(400).json({ error: 'Staff name already exists in this store' });
        return;
      }

      const createData: any = {
        name,
        hourlyWage,
        storeId: actualStoreId
      };

      if (holidayAllowance !== undefined) createData.holidayAllowance = holidayAllowance;
      if (overtimeRate !== undefined) createData.overtimeRate = overtimeRate;
      if (otherAllowance !== undefined) createData.otherAllowance = otherAllowance;
      if (transportationAllowance !== undefined) createData.transportationAllowance = transportationAllowance;
      if (hasTransportation !== undefined) createData.hasTransportation = hasTransportation;
      if (hireDate) createData.hireDate = new Date(hireDate);

      const staff = await prisma.staff.create({
        data: createData
      });

      res.status(201).json(staff);
      return;
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Staff API error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}