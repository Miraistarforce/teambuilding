import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import prisma from './lib/prisma';
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import storeRoutes from './routes/stores';
import staffRoutes from './routes/staff';
import timeRecordRoutes from './routes/timeRecords';
import reportsRoutes from './routes/reports';
import interviewsRoutes from './routes/interviews';
import dailyReportsRoutes from './routes/dailyReports';
import commentTemplatesRoutes from './routes/commentTemplates';
import reportFormatRoutes from './routes/reportFormat';
import tensionRoutes from './routes/tension';
import aiConsultRoutes from './routes/aiConsult';
import healthRoutes from './routes/health';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import { csrfTokenEndpoint, conditionalCSRFProtection } from './middlewares/csrf';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// プロキシ信頼設定（Renderなどのプラットフォーム用）
app.set('trust proxy', 1);

// CORS設定
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:4000', 'http://localhost:4001', 'http://localhost:4002'];

// セキュリティ設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// レート制限設定
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: 'Too many requests from this IP, please try again later.'
});

// APIエンドポイントにレート制限を適用
app.use('/api/', limiter);

// ログイン試行の厳しい制限
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 最大5回の試行
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later.'
});

app.use('/api/auth/login', authLimiter);

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// セッション設定
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'default-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000 // 1時間
  }
}));

// ヘルスチェックエンドポイント（CSRF保護をスキップ）
app.use('/', healthRoutes);

// CSRFトークンエンドポイント
app.get('/api/csrf-token', csrfTokenEndpoint);

// 認証ルートは先に登録（CSRF保護なし）
app.use('/api/auth', authRoutes);

// 出退勤記録ルートもCSRF保護なし
app.use('/api/time-records', timeRecordRoutes);

// CSRF保護を適用（認証と出退勤記録以外のルート）
app.use('/api', conditionalCSRFProtection);

app.use('/api/companies', companyRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/daily-reports', dailyReportsRoutes);
app.use('/api/comment-templates', commentTemplatesRoutes);
app.use('/api/report-format', reportFormatRoutes);
app.use('/api/tension', tensionRoutes);
app.use('/api/ai-consult', aiConsultRoutes);

// 404ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export { prisma };