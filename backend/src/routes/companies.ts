import { Router } from 'express';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/auth';
import { authenticate, authorizeAdmin, AuthRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

const router = Router();

router.get('/', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { stores: true }
        }
      }
    });

    res.json(companies);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { name, password } = req.body;

    const existing = await prisma.company.findUnique({
      where: { name }
    });

    if (existing) {
      throw new AppError('Company name already exists', 400);
    }

    const hashedPassword = await hashPassword(password);

    const company = await prisma.company.create({
      data: {
        name,
        password: hashedPassword
      }
    });

    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, password, isActive } = req.body;

    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) updateData.password = await hashPassword(password);

    const company = await prisma.company.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.json(company);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.company.delete({
      where: { id: parseInt(id) }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;