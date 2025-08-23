import { Router } from 'express';
import prisma from '../lib/prisma';
import { comparePassword, generateToken, hashPassword } from '../utils/auth';
import { AppError } from '../middlewares/errorHandler';
import { logLoginAttempt, auditMiddleware } from '../utils/auditLogger';

const router = Router();

router.post('/admin/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (username !== 'admin' || password !== 'admin123') {
      await logLoginAttempt(username, false, req.ip || 'unknown', req.get('user-agent'), 'Invalid credentials');
      throw new AppError('Invalid credentials', 401);
    }
    
    await logLoginAttempt(username, true, req.ip || 'unknown', req.get('user-agent'));

    const token = generateToken({ id: 0, type: 'admin' });
    res.json({ token, type: 'admin' });
  } catch (error) {
    next(error);
  }
});

router.post('/company/login', async (req, res, next) => {
  try {
    const { name, password } = req.body;

    const company = await prisma.company.findUnique({
      where: { name }
    });

    if (!company || !await comparePassword(password, company.password)) {
      await logLoginAttempt(name, false, req.ip || 'unknown', req.get('user-agent'), 'Invalid credentials');
      throw new AppError('Invalid credentials', 401);
    }
    
    await logLoginAttempt(name, true, req.ip || 'unknown', req.get('user-agent'));

    if (!company.isActive) {
      throw new AppError('Company is not active', 403);
    }

    const token = generateToken({ 
      id: company.id, 
      type: 'company',
      companyId: company.id 
    });

    res.json({ 
      token, 
      type: 'company',
      company: {
        id: company.id,
        name: company.name
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/store/login', async (req, res, next) => {
  try {
    const { companyName, storeName, password, role } = req.body;

    const company = await prisma.company.findUnique({
      where: { name: companyName }
    });

    if (!company || !company.isActive) {
      throw new AppError('Invalid company', 404);
    }

    const store = await prisma.store.findFirst({
      where: {
        companyId: company.id,
        name: storeName,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        companyId: true,
        managerPassword: true,
        ownerPassword: true,
        isActive: true
      }
    });

    if (!store) {
      throw new AppError('Invalid store', 404);
    }

    // スタッフの場合は固定パスワードをチェック
    if (role === 'staff') {
      const validStaffPassword = await comparePassword(password, '$2b$10$37U1XaUWMvuatvTDYZ1Ov.K5tOxeJq46FZh5mTMRVorsxE4.fHIa6'); // staff123
      if (!validStaffPassword) {
        throw new AppError('Invalid staff password', 401);
      }
    }

    if (role === 'manager' && !await comparePassword(password, store.managerPassword)) {
      throw new AppError('Invalid manager password', 401);
    }

    if (role === 'owner' && !await comparePassword(password, store.ownerPassword)) {
      throw new AppError('Invalid owner password', 401);
    }

    const token = generateToken({
      id: store.id,
      type: 'store',
      companyId: company.id,
      storeId: store.id,
      role: role as 'staff' | 'manager' | 'owner'
    });

    res.json({
      token,
      type: 'store',
      role,
      store: {
        id: store.id,
        name: store.name,
        companyId: company.id
      }
    });
  } catch (error: any) {
    console.error('Store login error detail:', error.message, error.stack);
    next(error);
  }
});

router.get('/companies/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    
    const companies = await prisma.company.findMany({
      where: {
        name: {
          contains: q as string
        },
        isActive: true
      },
      select: {
        name: true
      }
    });

    res.json(companies.map(c => c.name));
  } catch (error) {
    next(error);
  }
});

export default router;