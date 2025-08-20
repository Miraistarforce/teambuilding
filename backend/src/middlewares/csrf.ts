import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

// CSRFトークンを保存するためのMapストレージ
const csrfTokens = new Map<string, { token: string; expires: number }>();

// トークンのクリーンアップ（期限切れトークンを削除）
const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < now) {
      csrfTokens.delete(key);
    }
  }
};

// 定期的にクリーンアップを実行（5分ごと）
setInterval(cleanupExpiredTokens, 5 * 60 * 1000);

// CSRFトークンの生成
export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// CSRFトークンの検証
export const validateCSRFToken = (sessionId: string, token: string): boolean => {
  const storedData = csrfTokens.get(sessionId);
  if (!storedData) return false;
  
  // 期限切れチェック
  if (storedData.expires < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return crypto.timingSafeEqual(
    Buffer.from(storedData.token),
    Buffer.from(token)
  );
};

// CSRFトークン発行エンドポイント
export const csrfTokenEndpoint = (req: Request, res: Response) => {
  const sessionId = (req as any).sessionID || crypto.randomBytes(16).toString('hex');
  const token = generateCSRFToken();
  
  // トークンを保存（有効期限: 1時間）
  csrfTokens.set(sessionId, {
    token,
    expires: Date.now() + 60 * 60 * 1000
  });
  
  // セッションIDをクッキーに設定
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000 // 1時間
  });
  
  res.json({ csrfToken: token });
};

// CSRF保護ミドルウェア
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // GETリクエストはスキップ
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  
  // 特定のエンドポイントはスキップ（Webhook等）
  const skipPaths = [
    '/api/webhooks', 
    '/api/health',
    '/api/auth/company/login',
    '/api/auth/store/login',
    '/api/auth/login'
  ];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // セッションIDの取得
  const sessionId = req.cookies?.sessionId || (req as any).sessionID;
  if (!sessionId) {
    throw new AppError('セッションが無効です', 403);
  }
  
  // CSRFトークンの取得（ヘッダーまたはボディから）
  const token = req.headers['x-csrf-token'] as string || 
                req.body?._csrf ||
                req.query?._csrf as string;
  
  if (!token) {
    throw new AppError('CSRFトークンが見つかりません', 403);
  }
  
  // トークンの検証
  if (!validateCSRFToken(sessionId, token)) {
    throw new AppError('CSRFトークンが無効です', 403);
  }
  
  next();
};

// 開発環境用：CSRF保護を無効化するオプション
export const conditionalCSRFProtection = (req: Request, res: Response, next: NextFunction) => {
  // 開発環境かつ環境変数でCSRF保護が無効化されている場合はスキップ
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
    return next();
  }
  
  return csrfProtection(req, res, next);
};