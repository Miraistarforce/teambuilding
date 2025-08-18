import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface AuditLog {
  userId?: number;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  requestBody?: any;
  responseStatus?: number;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * 監査ログを記録
 */
export async function logAuditEvent(log: AuditLog): Promise<void> {
  try {
    // ログをファイルに出力
    logger.info('AUDIT_LOG', {
      ...log,
      timestamp: log.timestamp.toISOString()
    });
    
    // 重要なイベントはデータベースにも保存（オプション）
    if (isImportantEvent(log.action)) {
      await saveAuditLogToDatabase(log);
    }
  } catch (error) {
    logger.error('Failed to write audit log:', error);
  }
}

/**
 * HTTPリクエストから監査ログ情報を抽出
 */
export function extractAuditInfo(req: Request): Partial<AuditLog> {
  const user = (req as any).user;
  
  return {
    userId: user?.id,
    userRole: user?.role,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    requestMethod: req.method,
    requestPath: req.path,
    requestBody: sanitizeRequestBody(req.body),
    timestamp: new Date()
  };
}

/**
 * 重要なイベントかどうかを判定
 */
function isImportantEvent(action: string): boolean {
  const importantActions = [
    'LOGIN',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'USER_CREATE',
    'USER_DELETE',
    'USER_UPDATE',
    'ROLE_CHANGE',
    'STORE_CREATE',
    'STORE_DELETE',
    'SALARY_CALCULATION',
    'DATA_EXPORT',
    'SETTINGS_CHANGE',
    'SECURITY_EVENT'
  ];
  
  return importantActions.includes(action);
}

/**
 * リクエストボディから機密情報を除去
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'creditCard',
    'ssn'
  ];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * データベースに監査ログを保存（スキーマ拡張が必要）
 */
async function saveAuditLogToDatabase(log: AuditLog): Promise<void> {
  // 注: この機能を使用するには、Prismaスキーマに AuditLog モデルを追加する必要があります
  // 現在はログファイルのみに記録
  return;
}

/**
 * 監査ログミドルウェア
 */
export function auditMiddleware(action: string, resource: string) {
  return (req: Request, res: any, next: any) => {
    const startTime = Date.now();
    
    // レスポンスの送信をインターセプト
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      // 監査ログを記録
      logAuditEvent({
        ...extractAuditInfo(req),
        action,
        resource,
        resourceId: req.params.id || req.params.staffId || req.params.storeId,
        responseStatus: res.statusCode,
        metadata: {
          responseTime,
          success: res.statusCode < 400
        },
        timestamp: new Date()
      });
      
      // 元のsend関数を呼び出し
      return originalSend.call(this, data);
    };
    
    next();
  };
}

/**
 * ログイン試行の記録
 */
export async function logLoginAttempt(
  username: string,
  success: boolean,
  ipAddress: string,
  userAgent?: string,
  reason?: string
): Promise<void> {
  await logAuditEvent({
    action: success ? 'LOGIN' : 'LOGIN_FAILED',
    resource: 'AUTH',
    ipAddress,
    userAgent,
    metadata: {
      username,
      reason
    },
    timestamp: new Date()
  });
}

/**
 * セキュリティイベントの記録
 */
export async function logSecurityEvent(
  event: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  details: Record<string, any>,
  req?: Request
): Promise<void> {
  const auditInfo = req ? extractAuditInfo(req) : {};
  
  await logAuditEvent({
    ...auditInfo,
    action: 'SECURITY_EVENT',
    resource: 'SECURITY',
    metadata: {
      event,
      severity,
      ...details
    },
    timestamp: new Date()
  });
  
  // 重大なセキュリティイベントはアラートも送信
  if (severity === 'HIGH' || severity === 'CRITICAL') {
    logger.error(`SECURITY ALERT [${severity}]: ${event}`, details);
  }
}

/**
 * データアクセスログ
 */
export async function logDataAccess(
  operation: 'READ' | 'WRITE' | 'DELETE',
  table: string,
  recordId: string | number,
  req: Request
): Promise<void> {
  await logAuditEvent({
    ...extractAuditInfo(req),
    action: `DATA_${operation}`,
    resource: table,
    resourceId: String(recordId),
    timestamp: new Date()
  });
}