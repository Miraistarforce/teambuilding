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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { id } = req.query;
    const staffId = parseInt(id as string);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get last work date
    const lastWork = await prisma.timeRecord.findFirst({
      where: {
        staffId,
        status: { in: ['FINISHED', 'COMPLETED'] },
        clockOut: { not: null }
      },
      orderBy: { date: 'desc' },
      select: { date: true }
    });
    
    // Get monthly attendance count
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
    
    // Get employee settings to check if monthly employee
    const employeeSettings = await prisma.employeeSettings.findUnique({
      where: { staffId }
    });
    
    // Get staff info
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { 
        hourlyWage: true,
        overtimeRate: true,
        otherAllowance: true 
      }
    });
    
    const isMonthlyEmployee = employeeSettings?.employeeType === 'monthly';
    
    // Calculate monthly salary
    const monthRecords = await prisma.timeRecord.findMany({
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
    
    let monthlySalary = 0;
    let overtimeHours = 0;
    let overtimePay = 0;
    
    if (isMonthlyEmployee && employeeSettings) {
      // For monthly employees, only calculate overtime
      const scheduledStartTime = employeeSettings.scheduledStartTime || '09:00';
      const scheduledEndTime = employeeSettings.scheduledEndTime || '18:00';
      const [startHour, startMin] = scheduledStartTime.split(':').map(Number);
      const [endHour, endMin] = scheduledEndTime.split(':').map(Number);
      
      monthRecords.forEach(record => {
        if (record.clockIn && record.clockOut && record.workMinutes) {
          const clockInTime = new Date(record.clockIn);
          const clockOutTime = new Date(record.clockOut);
          
          // Calculate scheduled time for that day
          const scheduledStart = new Date(record.date);
          scheduledStart.setHours(startHour, startMin, 0, 0);
          const scheduledEnd = new Date(record.date);
          scheduledEnd.setHours(endHour, endMin, 0, 0);
          
          let overtimeMinutes = 0;
          
          // Calculate overtime after scheduled end time
          if (clockOutTime > scheduledEnd) {
            const afterWorkMinutes = Math.floor((clockOutTime.getTime() - scheduledEnd.getTime()) / 60000);
            overtimeMinutes += afterWorkMinutes;
          }
          
          // Calculate early arrival overtime if enabled
          if (employeeSettings.includeEarlyArrivalAsOvertime && clockInTime < scheduledStart) {
            const earlyMinutes = Math.floor((scheduledStart.getTime() - clockInTime.getTime()) / 60000);
            overtimeMinutes += earlyMinutes;
          }
          
          // Calculate overtime pay
          if (overtimeMinutes > 0) {
            const hourlyWage = staff?.hourlyWage || 0;
            const overtimeRate = staff?.overtimeRate || 1.25;
            overtimeHours += overtimeMinutes / 60;
            overtimePay += (overtimeMinutes / 60) * hourlyWage * overtimeRate;
          }
        }
      });
      
      // For monthly employees, only overtime pay is included
      monthlySalary = overtimePay;
    } else {
      // For hourly employees, calculate as before
      monthRecords.forEach(record => {
        if (record.workMinutes) {
          const hourlyWage = staff?.hourlyWage || 0;
          const overtimeRate = staff?.overtimeRate || 1.25;
          const regularMinutes = Math.min(record.workMinutes, 480); // 8 hours
          const overtimeMinutes = Math.max(0, record.workMinutes - 480);
          
          const regularPay = (regularMinutes / 60) * hourlyWage;
          const overtimePay = (overtimeMinutes / 60) * hourlyWage * overtimeRate;
          
          monthlySalary += regularPay + overtimePay;
        }
      });
      
      // Add monthly allowances for hourly employees
      if (staff?.otherAllowance) {
        monthlySalary += staff.otherAllowance;
      }
    }
    
    res.status(200).json({
      lastWorkDate: lastWork?.date || null,
      monthlyAttendance,
      monthlySalary: Math.floor(monthlySalary),
      isMonthlyEmployee,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      overtimePay: Math.floor(overtimePay)
    });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Staff stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}