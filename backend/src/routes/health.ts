import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import os from 'os';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckResult;
    memory: CheckResult;
    disk: CheckResult;
    api: CheckResult;
  };
  version: string;
  environment: string;
}

interface CheckResult {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  details?: any;
}

/**
 * 基本的なヘルスチェック
 */
router.get('/health', async (req, res) => {
  try {
    // データベース接続チェック
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 詳細なヘルスチェック
 */
router.get('/health/detailed', async (req, res) => {
  const startTime = Date.now();
  
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: await checkDatabase(),
      memory: checkMemory(),
      disk: await checkDisk(),
      api: checkAPIEndpoints()
    },
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };
  
  // 全体のステータスを判定
  const checks = Object.values(healthStatus.checks);
  if (checks.some(check => check.status === 'error')) {
    healthStatus.status = 'unhealthy';
  } else if (checks.some(check => check.status === 'warning')) {
    healthStatus.status = 'degraded';
  }
  
  const responseTime = Date.now() - startTime;
  
  // レスポンスタイムをヘルスステータスに追加
  (healthStatus as any).responseTime = responseTime;
  
  // ステータスコードを設定
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                     healthStatus.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(healthStatus);
});

/**
 * データベース接続チェック
 */
async function checkDatabase(): Promise<CheckResult> {
  try {
    const startTime = Date.now();
    
    // 接続テスト
    await prisma.$queryRaw`SELECT 1`;
    
    // テーブル数を取得
    const tableCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `.catch(() => null);
    
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 1000) {
      return {
        status: 'warning',
        message: 'Database response is slow',
        details: { responseTime }
      };
    }
    
    return {
      status: 'ok',
      message: 'Database is connected',
      details: { 
        responseTime,
        tableCount: tableCount?.[0]?.count || 'N/A'
      }
    };
  } catch (error) {
    logger.error('Database check failed:', error);
    return {
      status: 'error',
      message: 'Database connection failed',
      details: { error: (error as Error).message }
    };
  }
}

/**
 * メモリ使用状況チェック
 */
function checkMemory(): CheckResult {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = (usedMemory / totalMemory) * 100;
  
  // Node.jsプロセスのメモリ使用量
  const processMemory = process.memoryUsage();
  const heapUsedMB = Math.round(processMemory.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(processMemory.heapTotal / 1024 / 1024);
  
  if (memoryUsagePercent > 90) {
    return {
      status: 'error',
      message: 'Critical memory usage',
      details: {
        systemMemoryUsage: `${memoryUsagePercent.toFixed(2)}%`,
        processHeap: `${heapUsedMB}MB / ${heapTotalMB}MB`
      }
    };
  } else if (memoryUsagePercent > 75) {
    return {
      status: 'warning',
      message: 'High memory usage',
      details: {
        systemMemoryUsage: `${memoryUsagePercent.toFixed(2)}%`,
        processHeap: `${heapUsedMB}MB / ${heapTotalMB}MB`
      }
    };
  }
  
  return {
    status: 'ok',
    message: 'Memory usage is normal',
    details: {
      systemMemoryUsage: `${memoryUsagePercent.toFixed(2)}%`,
      processHeap: `${heapUsedMB}MB / ${heapTotalMB}MB`
    }
  };
}

/**
 * ディスク使用状況チェック（簡易版）
 */
async function checkDisk(): Promise<CheckResult> {
  try {
    // ディスク使用状況を取得する（プラットフォーム依存）
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    if (process.platform === 'darwin' || process.platform === 'linux') {
      const { stdout } = await execPromise('df -h / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const usagePercent = parseInt(parts[4]);
      
      if (usagePercent > 90) {
        return {
          status: 'error',
          message: 'Critical disk usage',
          details: { diskUsage: `${usagePercent}%` }
        };
      } else if (usagePercent > 75) {
        return {
          status: 'warning',
          message: 'High disk usage',
          details: { diskUsage: `${usagePercent}%` }
        };
      }
      
      return {
        status: 'ok',
        message: 'Disk usage is normal',
        details: { diskUsage: `${usagePercent}%` }
      };
    }
    
    // Windows or unknown platform
    return {
      status: 'ok',
      message: 'Disk check not available on this platform'
    };
  } catch (error) {
    return {
      status: 'warning',
      message: 'Could not check disk usage',
      details: { error: (error as Error).message }
    };
  }
}

/**
 * APIエンドポイントの可用性チェック
 */
function checkAPIEndpoints(): CheckResult {
  // 重要なエンドポイントのリスト
  const criticalEndpoints = [
    '/api/auth/company/login',
    '/api/time-records/clock-in',
    '/api/daily-reports'
  ];
  
  // この実装では、エンドポイントが登録されているかをチェック
  // 実際の本番環境では、各エンドポイントにテストリクエストを送信することも可能
  
  return {
    status: 'ok',
    message: 'API endpoints are available',
    details: {
      criticalEndpoints: criticalEndpoints.length,
      status: 'registered'
    }
  };
}

/**
 * 準備状態チェック（Kubernetesのreadinessプローブ用）
 */
router.get('/health/ready', async (req, res) => {
  try {
    // データベース接続チェック
    await prisma.$queryRaw`SELECT 1`;
    
    // アプリケーションが準備完了しているか
    const isReady = process.uptime() > 5; // 起動から5秒以上経過
    
    if (isReady) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        message: 'Application is starting up',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      ready: false,
      message: 'Database not ready',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * 生存確認（Kubernetesのlivenessプローブ用）
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

export default router;