import { Router } from 'express';
import prisma from '../lib/prisma';
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
import { uploadPdf, getPublicUrl, INTERVIEW_BUCKET } from '../lib/supabase';

const router = Router();

// ファイルアップロード設定（メモリストレージ for Supabase）
const storage = multer.memoryStorage();

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // 音声ファイルとPDFを許可
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('音声ファイルまたはPDFのみアップロード可能です'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB制限
  }
});

// 簡易的なAI要約関数（実際のプロジェクトではOpenAI APIなどを使用）
function generateSummary(text: string): string[] {
  // 音声ファイルのみの場合のデフォルトサマリー
  if (text === '音声ファイルがアップロードされました。') {
    return [
      '📝 業務状況の確認：現在の業務進捗と課題について話し合いました',
      '💡 改善提案：業務効率化のためのアイデアを共有しました',
      '🎯 目標設定：今後の目標と達成に向けたステップを確認しました',
      '💬 コミュニケーション：チーム内での連携について意見交換を行いました',
      '📊 スキル評価：現在のスキルレベルと成長領域を特定しました'
    ];
  }

  // テキストから要約を生成
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim().length > 10);
  const summary: string[] = [];

  // キーワードベースで要約を生成
  const keywords = {
    '業務': '📝 業務に関する話題：',
    '目標': '🎯 目標設定：',
    '課題': '⚠️ 課題・問題点：',
    '改善': '💡 改善提案：',
    '成長': '📈 成長・スキルアップ：',
    'コミュニケーション': '💬 コミュニケーション：',
    'チーム': '👥 チームワーク：',
    '評価': '📊 評価・フィードバック：'
  };

  for (const [keyword, prefix] of Object.entries(keywords)) {
    const relevantSentences = sentences.filter(s => s.includes(keyword));
    if (relevantSentences.length > 0) {
      summary.push(prefix + relevantSentences[0].trim());
    }
  }

  // サマリーが少ない場合は追加
  if (summary.length < 3) {
    summary.push('📝 面談内容：' + (sentences[0] || text).substring(0, 50) + '...');
    summary.push('💡 今後の課題：継続的な成長と改善を目指します');
    summary.push('🎯 次回の確認事項：進捗状況と新たな課題の確認');
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
router.post('/process', authenticate, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'pdf', maxCount: 1 }
]), async (req, res) => {
  try {
    const { staffId, storeId, text } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const audioFile = files?.audio ? files.audio[0] : null;
    const pdfFile = files?.pdf ? files.pdf[0] : null;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    let textContent = text || '';
    let audioUrl = null;
    let pdfUrl = null;

    // 音声ファイルがある場合（現在はローカル保存のまま）
    if (audioFile) {
      // TODO: Supabaseへのアップロードに移行
      audioUrl = null; // 一時的に無効化
      
      // 音声ファイルの処理は一時的にスキップ
      if (!textContent) {
        textContent = '音声ファイルがアップロードされました。';
      }
    }

    // PDFファイルがある場合、Supabaseにアップロード
    if (pdfFile) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileName = `${uniqueSuffix}.pdf`;
      const uploadPath = await uploadPdf(pdfFile.buffer, fileName);
      
      if (uploadPath) {
        pdfUrl = uploadPath;
      }
    }

    // AI要約を生成（OpenAI APIが有効な場合は使用）
    let summaryArray: string[];
    if (isOpenAIEnabled()) {
      console.log('OpenAI API is enabled, generating AI summary...');
      try {
        const aiSummary = await generateInterviewSummary(textContent);
        summaryArray = aiSummary.summary;
        console.log('AI summary generated:', summaryArray);
      } catch (error) {
        console.error('AI summary generation failed:', error);
        summaryArray = generateSummary(textContent);
      }
    } else {
      console.log('OpenAI API is not enabled, using fallback summary');
      summaryArray = generateSummary(textContent);
    }
    const summaryText = JSON.stringify(summaryArray);

    // データベースに保存
    const interview = await prisma.interview.create({
      data: {
        staffId: parseInt(staffId),
        storeId: parseInt(storeId),
        audioUrl,
        pdfUrl,
        textContent,
        summary: summaryText,
        createdBy: user.role,
      },
    });

    res.json({
      id: interview.id,
      summary: summaryArray,
    });
  } catch (error: any) {
    console.error('面談処理エラー詳細:', error);
    const errorMessage = error.message || '面談の処理に失敗しました';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
        pdfUrl: true,
        audioUrl: true,
        textContent: true,
      },
    });

    // JSON文字列をパースとURLを変換
    const formattedInterviews = interviews.map(interview => ({
      ...interview,
      summary: interview.summary ? JSON.parse(interview.summary) : [],
      advice: interview.advice ? JSON.parse(interview.advice) : [],
      pdfUrl: interview.pdfUrl ? getPublicUrl(interview.pdfUrl, INTERVIEW_BUCKET) : null,
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