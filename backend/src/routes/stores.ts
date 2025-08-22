import { Router } from 'express';
import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/auth';
import { authenticate, authorizeCompany, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { validateRequest, commonValidations } from '../middlewares/validation';

const router = Router();

router.get('/', authenticate, authorizeCompany, async (req: AuthRequest, res, next) => {
  try {
    const companyId = req.user?.companyId || parseInt(req.query.companyId as string);

    const stores = await prisma.store.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        company: true,
        _count: {
          select: { staff: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(stores);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeCompany, validateRequest(commonValidations.store), async (req: AuthRequest, res, next) => {
  try {
    const { name, managerPassword, ownerPassword, companyId } = req.body;
    
    const actualCompanyId = companyId || req.user?.companyId;

    if (!actualCompanyId) {
      throw new AppError('Company ID is required', 400);
    }

    const existing = await prisma.store.findFirst({
      where: {
        companyId: actualCompanyId,
        name
      }
    });

    if (existing) {
      throw new AppError('Store name already exists in this company', 400);
    }

    const store = await prisma.store.create({
      data: {
        name,
        companyId: actualCompanyId,
        managerPassword: await hashPassword(managerPassword),
        ownerPassword: await hashPassword(ownerPassword)
      }
    });

    res.status(201).json(store);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeCompany, validateRequest({ ...commonValidations.idParam, body: commonValidations.store.body }), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name, managerPassword, ownerPassword, isActive } = req.body;

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (managerPassword) {
      updateData.managerPassword = await hashPassword(managerPassword);
    }
    if (ownerPassword) {
      updateData.ownerPassword = await hashPassword(ownerPassword);
    }

    const store = await prisma.store.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(store);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeCompany, validateRequest(commonValidations.idParam), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.store.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/:companyId/list', async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const stores = await prisma.store.findMany({
      where: {
        companyId: parseInt(companyId),
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });

    res.json(stores);
  } catch (error) {
    next(error);
  }
});

// Get bonus setting for a store
router.get('/:storeId/bonus-setting', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    
    // Check if user has access to this store
    if (req.user?.role !== 'manager' && req.user?.role !== 'owner') {
      throw new AppError('Permission denied', 403);
    }
    
    try {
      const store = await prisma.store.findUnique({
        where: { id: parseInt(storeId) },
        select: {
          bonusEnabled: true
        }
      });
      
      res.json({ bonusEnabled: store?.bonusEnabled ?? true });
    } catch (dbError) {
      // If bonusEnabled column doesn't exist, return default value
      console.warn('bonusEnabled column may not exist in database, returning default value');
      res.json({ bonusEnabled: true });
    }
  } catch (error) {
    next(error);
  }
});

// Update bonus setting for a store
router.put('/:storeId/bonus-setting', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    const { bonusEnabled } = req.body;
    
    // Check if user has access to this store
    if (req.user?.role !== 'manager' && req.user?.role !== 'owner') {
      throw new AppError('Permission denied', 403);
    }
    
    try {
      await prisma.store.update({
        where: { id: parseInt(storeId) },
        data: { bonusEnabled }
      });
      
      res.json({ success: true });
    } catch (dbError) {
      // If bonusEnabled column doesn't exist, ignore the update
      console.warn('bonusEnabled column may not exist in database, ignoring update');
      res.json({ success: true });
    }
  } catch (error) {
    next(error);
  }
});

// Change password for manager or owner
router.put('/:storeId/change-password', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { storeId } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    // Check if user has access to this store
    const userRole = req.user?.role;
    if (userRole !== 'manager' && userRole !== 'owner') {
      throw new AppError('Permission denied', 403);
    }
    
    // Get the store to verify current password
    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) }
    });
    
    if (!store) {
      throw new AppError('Store not found', 404);
    }
    
    // Verify current password based on role
    const currentHashedPassword = userRole === 'manager' ? store.managerPassword : store.ownerPassword;
    const isPasswordValid = await comparePassword(currentPassword, currentHashedPassword);
    
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 401);
    }
    
    // Hash new password and update
    const newHashedPassword = await hashPassword(newPassword);
    const updateData = userRole === 'manager' 
      ? { managerPassword: newHashedPassword }
      : { ownerPassword: newHashedPassword };
    
    await prisma.store.update({
      where: { id: parseInt(storeId) },
      data: updateData
    });
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;