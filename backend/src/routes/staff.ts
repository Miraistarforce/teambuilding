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
// 一時的に無効化 - データベース接続問題の調査のため
/*
router.get('/:id/employee-settings', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        mbtiType: true,
        hourlyWage: true,
        overtimeRate: true
      }
    });
    
    if (!staff) {
      throw new AppError('Staff not found', 404);
    }
    
    // Parse employee settings from mbtiType field (using it as JSON storage)
    let employeeSettings = {
      employeeType: 'hourly' as 'hourly' | 'monthly',
      monthlyBaseSalary: 0,
      scheduledStartTime: '09:00',
      scheduledEndTime: '18:00',
      includeEarlyArrivalAsOvertime: false
    };
    
    if (staff.mbtiType) {
      try {
        const parsed = JSON.parse(staff.mbtiType);
        if (parsed.employeeSettings) {
          employeeSettings = { ...employeeSettings, ...parsed.employeeSettings };
        }
      } catch (e) {
        // Not JSON, it's actual MBTI type
      }
    }
    
    res.json({
      ...employeeSettings,
      currentHourlyWage: staff.hourlyWage,
      overtimeRate: staff.overtimeRate
    });
  } catch (error) {
    next(error);
  }
});
*/

/*
router.put('/:id/employee-settings', authenticate, authorizeStore, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      employeeType,
      monthlyBaseSalary,
      scheduledStartTime,
      scheduledEndTime,
      includeEarlyArrivalAsOvertime
    } = req.body;
    
    // Get current staff data
    const staff = await prisma.staff.findUnique({
      where: { id: parseInt(id) },
      select: {
        mbtiType: true
      }
    });
    
    if (!staff) {
      throw new AppError('Staff not found', 404);
    }
    
    // Parse existing data
    let existingData: any = {};
    if (staff.mbtiType) {
      try {
        existingData = JSON.parse(staff.mbtiType);
      } catch (e) {
        // If it's not JSON, preserve as MBTI
        existingData = { mbti: staff.mbtiType };
      }
    }
    
    // Update employee settings
    const employeeSettings = {
      employeeType: employeeType || 'hourly',
      monthlyBaseSalary: monthlyBaseSalary || 0,
      scheduledStartTime: scheduledStartTime || '09:00',
      scheduledEndTime: scheduledEndTime || '18:00',
      includeEarlyArrivalAsOvertime: includeEarlyArrivalAsOvertime || false
    };
    
    existingData.employeeSettings = employeeSettings;
    
    // If monthly, calculate equivalent hourly wage for storage
    let hourlyWageUpdate = undefined;
    if (employeeType === 'monthly' && monthlyBaseSalary) {
      // Calculate hourly wage based on monthly salary
      // Assuming 20 working days, 8 hours per day = 160 hours per month
      const workHoursPerMonth = 160;
      hourlyWageUpdate = Math.round(monthlyBaseSalary / workHoursPerMonth);
    }
    
    const updateData: any = {
      mbtiType: JSON.stringify(existingData)
    };
    
    if (hourlyWageUpdate !== undefined) {
      updateData.hourlyWage = hourlyWageUpdate;
    }
    
    await prisma.staff.update({
      where: { id: parseInt(id) },
      data: updateData
    });
    
    res.json({ success: true, employeeSettings });
  } catch (error) {
    next(error);
  }
});
*/

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
      },
      include: {
        staff: true
      }
    });
    
    let monthlySalary = 0;
    monthRecords.forEach(record => {
      if (record.workMinutes) {
        const hourlyWage = record.staff.hourlyWage;
        const overtimeRate = record.staff.overtimeRate || 1.25;
        const regularMinutes = Math.min(record.workMinutes, 480); // 8 hours
        const overtimeMinutes = Math.max(0, record.workMinutes - 480);
        
        const regularPay = (regularMinutes / 60) * hourlyWage;
        const overtimePay = (overtimeMinutes / 60) * hourlyWage * overtimeRate;
        
        monthlySalary += regularPay + overtimePay;
      }
    });
    
    // Add monthly allowances
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { otherAllowance: true }
    });
    
    if (staff?.otherAllowance) {
      monthlySalary += staff.otherAllowance;
    }
    
    res.json({
      lastWorkDate: lastWork?.date || null,
      monthlyAttendance,
      monthlySalary: Math.floor(monthlySalary)
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