import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 非同期エラーハンドラーラッパー
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Prismaエラーハンドラー
const handlePrismaError = (error: Prisma.PrismaClientKnownRequestError): AppError => {
  switch (error.code) {
    case 'P2002':
      // ユニーク制約違反
      const field = (error.meta?.target as string[])?.[0] || 'field';
      return new AppError(`${field}は既に使用されています`, 409);
    
    case 'P2003':
      // 外部キー制約違反
      return new AppError('関連するデータが存在しません', 400);
    
    case 'P2025':
      // レコードが見つからない
      return new AppError('指定されたデータが見つかりません', 404);
    
    case 'P2014':
      // 関係違反
      return new AppError('データの関係性に問題があります', 400);
    
    case 'P2016':
      // クエリ解釈エラー
      return new AppError('クエリの解釈に失敗しました', 400);
    
    default:
      return new AppError('データベース操作でエラーが発生しました', 500);
  }
};

// バリデーションエラーハンドラー
const handleValidationError = (error: any): AppError => {
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors)
      .map((err: any) => err.message)
      .join(', ');
    return new AppError(`入力エラー: ${messages}`, 400);
  }
  return new AppError('バリデーションエラーが発生しました', 400);
};

// JWT認証エラーハンドラー
const handleJWTError = (error: any): AppError => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('無効なトークンです', 401);
  }
  if (error.name === 'TokenExpiredError') {
    return new AppError('トークンの有効期限が切れています', 401);
  }
  return new AppError('認証に失敗しました', 401);
};

// メインエラーハンドラー
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError;

  // エラータイプの判定と変換
  if (err instanceof AppError) {
    error = err;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    error = handlePrismaError(err);
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    error = new AppError('データベースバリデーションエラー', 400);
  } else if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error = handleJWTError(err);
  } else if (err.name === 'CastError') {
    error = new AppError('無効なIDフォーマットです', 400);
  } else if (err.name === 'MulterError') {
    if ((err as any).code === 'LIMIT_FILE_SIZE') {
      error = new AppError('ファイルサイズが大きすぎます', 400);
    } else {
      error = new AppError('ファイルアップロードエラー', 400);
    }
  } else {
    // 予期しないエラー
    error = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'サーバーエラーが発生しました' 
        : err.message || 'Internal server error',
      500
    );
  }

  // エラーログの記録
  const logData = {
    message: error.message,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(error.isOperational ? {} : { stack: err.stack }),
    ...(error.details ? { details: error.details } : {})
  };

  // エラーレベルに応じたログ出力
  if (error.statusCode >= 500) {
    logger.error(logData);
  } else if (error.statusCode >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }

  // クライアントへのレスポンス
  const response: any = {
    status: 'error',
    message: error.message
  };

  // 開発環境では詳細情報を含める
  if (process.env.NODE_ENV === 'development') {
    response.details = error.details;
    response.stack = err.stack;
  }

  res.status(error.statusCode).json(response);
};

// 404エラーハンドラー
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(`エンドポイントが見つかりません: ${req.originalUrl}`, 404);
  next(error);
};

// 未処理のPromise拒否をキャッチ
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
  logger.error({
    message: 'Unhandled Promise Rejection',
    reason: reason?.message || reason,
    stack: reason?.stack
  });
  
  // 本番環境では適切にシャットダウン
  if (process.env.NODE_ENV === 'production') {
    // グレースフルシャットダウン
    process.exit(1);
  }
});

// 未処理の例外をキャッチ
process.on('uncaughtException', (error: Error) => {
  logger.error({
    message: 'Uncaught Exception',
    error: error.message,
    stack: error.stack
  });
  
  // グレースフルシャットダウン
  process.exit(1);
});