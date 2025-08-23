import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/auth';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new AppError('No token provided', 401);
    }

    const decoded = verifyToken(token);
    (req as any).user = decoded; // 型の問題を回避
    next();
  } catch (error) {
    next(new AppError('Invalid token', 401));
  }
};

export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.type !== 'admin') {
    return next(new AppError('Admin access required', 403));
  }
  next();
};

export const authorizeCompany = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.type !== 'company' && req.user?.type !== 'admin') {
    return next(new AppError('Company access required', 403));
  }
  next();
};

export const authorizeStore = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || (req.user.type !== 'store' && req.user.type !== 'company' && req.user.type !== 'admin')) {
    return next(new AppError('Store access required', 403));
  }
  next();
};