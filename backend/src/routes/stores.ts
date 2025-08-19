import { Router } from 'express';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/auth';
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

export default router;