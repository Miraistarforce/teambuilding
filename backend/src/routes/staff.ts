import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorizeStore, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { validateRequest, commonValidations, validators } from '../middlewares/validation';

const router = Router();

router.get('/store/:storeId', authenticate, authorizeStore, validateRequest({ params: { storeId: { required: true, type: 'number', min: 1 } } }), async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const staff = await prisma.staff.findMany({
      where: { 
        storeId: parseInt(storeId)
      },
      orderBy: { name: 'asc' }
    });

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeStore, validateRequest(commonValidations.staff), async (req: AuthRequest, res, next) => {
  try {
    const { 
      name, 
      hourlyWage, 
      storeId,
      holidayAllowance,
      overtimeRate,
      otherAllowance,
      hireDate
    } = req.body;

    const actualStoreId = storeId || req.user?.storeId;

    if (!actualStoreId) {
      throw new AppError('Store ID is required', 400);
    }

    const existing = await prisma.staff.findFirst({
      where: {
        storeId: actualStoreId,
        name
      }
    });

    if (existing) {
      throw new AppError('Staff name already exists in this store', 400);
    }

    const createData: any = {
      name,
      hourlyWage,
      storeId: actualStoreId
    };

    if (holidayAllowance !== undefined) createData.holidayAllowance = holidayAllowance;
    if (overtimeRate !== undefined) createData.overtimeRate = overtimeRate;
    if (otherAllowance !== undefined) createData.otherAllowance = otherAllowance;
    if (hireDate) createData.hireDate = new Date(hireDate);

    const staff = await prisma.staff.create({
      data: createData
    });

    res.status(201).json(staff);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!staff) {
      throw new AppError('Staff not found', 404);
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
    
    res.json({ ...staff, store });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeStore, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      hourlyWage, 
      isActive,
      holidayAllowance,
      overtimeRate,
      otherAllowance,
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
    if (hireDate !== undefined) updateData.hireDate = hireDate ? new Date(hireDate) : null;
    if (mbtiType !== undefined) updateData.mbtiType = mbtiType;

    const staff = await prisma.staff.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

// Get or update employee settings (full-time employee configuration)
router.get('/:id/employee-settings', authenticate, authorizeStore, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id);
    
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
      throw new AppError('Staff not found', 404);
    }
    
    // Check if user has access to this staff's store
    const user = req.user;
    if (user?.type === 'store' && user.storeId !== staff.storeId) {
      throw new AppError('Access denied to this staff member', 403);
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
    
    res.json({
      ...employeeSettings,
      currentHourlyWage: staff.hourlyWage,
      overtimeRate: staff.overtimeRate
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/employee-settings', authenticate, authorizeStore, async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id);
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
      throw new AppError('Staff not found', 404);
    }
    
    // Check if user has access to this staff's store
    const user = req.user;
    if (user?.type === 'store' && user.storeId !== staff.storeId) {
      throw new AppError('Access denied to this staff member', 403);
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
    
    res.json({ success: true, employeeSettings: settings });
  } catch (error) {
    next(error);
  }
});

// Get staff stats (last work, monthly attendance, monthly salary)
router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const staffId = parseInt(id);
    
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
      const scheduledMinutesPerDay = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      
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
    
    res.json({
      lastWorkDate: lastWork?.date || null,
      monthlyAttendance,
      monthlySalary: Math.floor(monthlySalary),
      isMonthlyEmployee,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      overtimePay: Math.floor(overtimePay)
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeStore, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.staff.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/list/:storeId', async (req, res, next) => {
  try {
    const { storeId } = req.params;

    const staff = await prisma.staff.findMany({
      where: {
        storeId: parseInt(storeId),
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    res.json(staff);
  } catch (error) {
    next(error);
  }
});

export default router;