import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { 
  generateInterviewSummary, 
  generateInterviewAdvice,
  transcribeAudio,
  isOpenAIEnabled 
} from '../services/openaiService';

const router = Router();
const prisma = new PrismaClient();

// ファイルアップロード設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/interviews');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // 音声ファイルのみ許可
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('音声ファイルのみアップロード可能です'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB制限
  }
});

// 簡易的なAI要約関数（実際のプロジェクトではOpenAI APIなどを使用）
function generateSummary(text: string): string[] {
  // テキストを段落に分割
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  // 各段落から重要なポイントを抽出（簡易版）
  const summary = paragraphs.map(para => {
    // 最初の文または重要そうな部分を抽出
    const sentences = para.split(/[。！？]/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      return sentences[0].trim() + '。';
    }
    return para.substring(0, 100) + '...';
  });

  // デフォルトの要約を追加
  if (summary.length === 0) {
    return [
      '面談の内容が記録されました',
      'スタッフとのコミュニケーションが実施されました',
      '今後のフォローアップが必要です'
    ];
  }

  return summary.slice(0, 5); // 最大5項目
}

// 次回のアドバイスを生成（簡易版）
function generateAdvice(summary: string[]): string[] {
  const advice = [
    '前回の面談内容を踏まえて、進捗状況を確認してください',
    '目標達成に向けた具体的なアクションプランを設定しましょう',
    '業務上の課題や悩みがないか確認してください',
    'モチベーション向上のための施策を検討してください',
    'スキルアップのための研修や教育機会について話し合いましょう'
  ];

  // summaryの内容に基づいて追加のアドバイス
  if (summary.some(s => s.includes('課題') || s.includes('問題'))) {
    advice.unshift('前回指摘された課題の改善状況を確認してください');
  }
  if (summary.some(s => s.includes('目標') || s.includes('成長'))) {
    advice.unshift('設定した目標の達成度を評価してください');
  }

  return advice.slice(0, 5); // 最大5項目
}

// 面談内容を処理
router.post('/process', authenticate, upload.single('audio'), async (req, res) => {
  try {
    const { staffId, storeId, text } = req.body;
    const audioFile = req.file;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    let textContent = text || '';
    let audioUrl = null;

    // 音声ファイルがある場合
    if (audioFile) {
      audioUrl = `/uploads/interviews/${audioFile.filename}`;
      
      // OpenAI Whisper APIで音声をテキスト化
      if (isOpenAIEnabled() && !textContent) {
        const filePath = path.join(__dirname, '../../uploads/interviews', audioFile.filename);
        const transcribedText = await transcribeAudio(filePath);
        if (transcribedText) {
          textContent = transcribedText;
        } else {
          textContent = '音声ファイルがアップロードされました。';
        }
      } else if (!textContent) {
        textContent = '音声ファイルがアップロードされました。';
      }
    }

    // AI要約を生成（OpenAI APIが有効な場合は使用）
    let summaryArray: string[];
    if (isOpenAIEnabled()) {
      const aiSummary = await generateInterviewSummary(textContent);
      summaryArray = aiSummary.summary;
    } else {
      summaryArray = generateSummary(textContent);
    }
    const summaryText = JSON.stringify(summaryArray);

    // データベースに保存
    const interview = await prisma.interview.create({
      data: {
        staffId: parseInt(staffId),
        storeId: parseInt(storeId),
        audioUrl,
        textContent,
        summary: summaryText,
        createdBy: user.role,
      },
    });

    res.json({
      id: interview.id,
      summary: summaryArray,
    });
  } catch (error) {
    console.error('面談処理エラー:', error);
    res.status(500).json({ error: '面談の処理に失敗しました' });
  }
});

// 次回のアドバイスを取得
router.post('/advice', authenticate, async (req, res) => {
  try {
    const { staffId, storeId, currentSummary } = req.body;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 過去の面談記録を取得
    const pastInterviews = await prisma.interview.findMany({
      where: {
        staffId: parseInt(staffId),
        storeId: parseInt(storeId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5, // 最新5件
    });

    // アドバイスを生成
    const adviceArray = generateAdvice(currentSummary || []);
    const adviceText = JSON.stringify(adviceArray);

    // 最新の面談記録にアドバイスを保存
    if (pastInterviews.length > 0) {
      await prisma.interview.update({
        where: {
          id: pastInterviews[0].id,
        },
        data: {
          advice: adviceText,
        },
      });
    }

    res.json({
      advice: adviceArray,
    });
  } catch (error) {
    console.error('アドバイス生成エラー:', error);
    res.status(500).json({ error: 'アドバイスの生成に失敗しました' });
  }
});

// 面談履歴を取得
router.get('/history/:staffId', authenticate, async (req, res) => {
  try {
    const { staffId } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const interviews = await prisma.interview.findMany({
      where: {
        staffId: parseInt(staffId),
        storeId: user.storeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        summary: true,
        advice: true,
        createdBy: true,
      },
    });

    // JSON文字列をパース
    const formattedInterviews = interviews.map(interview => ({
      ...interview,
      summary: interview.summary ? JSON.parse(interview.summary) : [],
      advice: interview.advice ? JSON.parse(interview.advice) : [],
    }));

    res.json(formattedInterviews);
  } catch (error) {
    console.error('履歴取得エラー:', error);
    res.status(500).json({ error: '履歴の取得に失敗しました' });
  }
});

// スタッフの最新面談を取得
router.get('/staff/:staffId/latest', authenticate, async (req, res) => {
  try {
    const { staffId } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const interview = await prisma.interview.findFirst({
      where: {
        staffId: parseInt(staffId),
        storeId: user.storeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        createdAt: true,
        summary: true,
        textContent: true,
      },
    });

    if (!interview) {
      return res.json(null);
    }

    // JSON文字列をパース
    const formattedInterview = {
      id: interview.id,
      createdAt: interview.createdAt,
      summary: interview.textContent || (interview.summary ? JSON.parse(interview.summary).join('\n') : ''),
    };

    res.json(formattedInterview);
  } catch (error) {
    console.error('最新面談取得エラー:', error);
    res.status(500).json({ error: '最新面談の取得に失敗しました' });
  }
});

export default router;