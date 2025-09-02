import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 認証ミドルウェア
const authenticate = (token: string | undefined) => {
  if (!token) throw new Error('No token provided');
  
  try {
    return jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// ポジティブ/ネガティブキーワード辞書
const POSITIVE_KEYWORDS = [
  '嬉しい', 'うれしい', '楽しい', 'たのしい', '幸せ', 'しあわせ', 
  '最高', 'さいこう', 'ハッピー', 'わくわく', 'ワクワク', 'ドキドキ',
  '頑張った', 'がんばった', '頑張る', 'がんばる', '達成', 'できた', 
  '成功', 'うまくいった', '完了', '終わった', 'クリア',
  '元気', 'げんき', '充実', 'やる気', 'モチベーション', '調子いい',
  'スムーズ', '順調', '快適', '良い', 'よい', 'いい感じ',
  'ありがとう', 'ありがと', '感謝', 'おかげ', 'すごい', 'すばらしい',
  '素晴らしい', '良かった', 'よかった',
  '😊', '😄', '😃', '🎉', '✨', '💪', '👍', '！！', '♪',
];

const NEGATIVE_KEYWORDS = [
  '疲れた', 'つかれた', '辛い', 'つらい', '大変', 'たいへん',
  '憂鬱', 'ゆううつ', '不安', 'ふあん', '心配', 'しんぱい',
  'イライラ', 'いらいら', 'ムカつく', 'むかつく', '腹立つ',
  '痛い', 'いたい', '具合悪い', '体調悪い', '風邪', 'かぜ',
  'だるい', 'しんどい', '眠い', 'ねむい',
  'ミス', '失敗', 'しっぱい', 'トラブル', '問題', 'もんだい',
  '困った', 'こまった', '難しい', 'むずかしい', 'できない',
  'バタバタ', '忙しい', 'いそがしい', '混乱', 'こんらん',
  'ストレス', 'プレッシャー', '無理', 'むり',
  'すみません', 'ごめん', '申し訳', 'もうしわけ', '反省',
  '😢', '😭', '😰', '😱', '😞', '😔', '💦', '😵',
];

// 簡易テンション分析
function simpleAnalyzeTension(text: string) {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      positiveKeywords: [],
      negativeKeywords: [],
      confidence: 0,
    };
  }

  const lowerText = text.toLowerCase();
  const positiveKeywords: string[] = [];
  const negativeKeywords: string[] = [];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // キーワードマッチング
  for (const keyword of POSITIVE_KEYWORDS) {
    const count = (lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    if (count > 0) {
      positiveKeywords.push(keyword);
      positiveCount += count;
    }
  }
  
  for (const keyword of NEGATIVE_KEYWORDS) {
    const count = (lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    if (count > 0) {
      negativeKeywords.push(keyword);
      negativeCount += count;
    }
  }
  
  // スコア計算（-1.0 〜 1.0）
  const totalCount = positiveCount + negativeCount;
  let score = 0;
  
  if (totalCount > 0) {
    score = (positiveCount - negativeCount) / totalCount;
    score = Math.max(-1, Math.min(1, score));
  }
  
  const confidence = Math.min(1, totalCount / 5);
  
  return {
    score,
    positiveKeywords: [...new Set(positiveKeywords)],
    negativeKeywords: [...new Set(negativeKeywords)],
    confidence,
  };
}

// AI分析
async function aiAnalyzeTension(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    return simpleAnalyzeTension(text);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `日報のテキストから書いた人のテンション（気分・モチベーション）を分析してください。
結果は以下のJSON形式で返してください：
{
  "score": -1.0から1.0の数値（-1が最もネガティブ、1が最もポジティブ）,
  "positiveKeywords": ["ポジティブなキーワード"],
  "negativeKeywords": ["ネガティブなキーワード"],
  "confidence": 0.0から1.0の信頼度
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = response.choices[0].message.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('AI analysis error:', error);
  }

  return simpleAnalyzeTension(text);
}

// 統計計算
function calculateStats(scores: number[]) {
  if (scores.length === 0) {
    return { mean: 0, stdDev: 0 };
  }
  
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  return { mean, stdDev };
}

// アラートチェック
function shouldAlert(
  currentScore: number,
  avgScore: number,
  stdDev: number,
  threshold: number = 0.3
): boolean {
  const deviation = avgScore - currentScore;
  const adjustedThreshold = Math.max(threshold, stdDev * 1.5);
  return deviation > adjustedThreshold;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { reportId, text } = req.body;
    
    if (!reportId || !text) {
      res.status(400).json({ error: 'Report ID and text are required' });
      return;
    }
    
    // 日報を取得
    const report = await prisma.dailyReport.findUnique({
      where: { id: reportId },
      include: { staff: true }
    });
    
    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    
    // テンション分析
    const analysis = process.env.OPENAI_API_KEY 
      ? await aiAnalyzeTension(text)
      : simpleAnalyzeTension(text);
    
    // 既存の分析結果をチェック
    const existingAnalysis = await prisma.tensionAnalysis.findUnique({
      where: { reportId: report.id }
    });

    // 分析結果を保存または更新
    await (existingAnalysis
      ? prisma.tensionAnalysis.update({
          where: { reportId: report.id },
          data: {
            tensionScore: analysis.score,
            keywords: JSON.stringify({
              positive: analysis.positiveKeywords,
              negative: analysis.negativeKeywords
            })
          }
        })
      : prisma.tensionAnalysis.create({
          data: {
            staffId: report.staffId,
            reportId: report.id,
            date: report.date,
            tensionScore: analysis.score,
            keywords: JSON.stringify({
              positive: analysis.positiveKeywords,
              negative: analysis.negativeKeywords
            })
          }
        }));
    
    // スタッフの統計を更新
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const analyses = await prisma.tensionAnalysis.findMany({
      where: {
        staffId: report.staffId,
        date: { gte: thirtyDaysAgo }
      },
      select: { tensionScore: true }
    });
    
    if (analyses.length > 0) {
      const scores = analyses.map(a => a.tensionScore);
      const stats = calculateStats(scores);
      
      await prisma.staffTensionStats.upsert({
        where: { staffId: report.staffId },
        update: {
          avgScore: stats.mean,
          stdDeviation: stats.stdDev,
          dataCount: scores.length
        },
        create: {
          staffId: report.staffId,
          avgScore: stats.mean,
          stdDeviation: stats.stdDev,
          dataCount: scores.length
        }
      });
    }
    
    // アラートチェック
    const settings = await prisma.tensionAlertSettings.findUnique({
      where: { storeId: report.storeId }
    });
    
    let alertStatus = { shouldAlert: false, consecutiveLowDays: 0 };
    
    if (settings && settings.isEnabled) {
      const stats = await prisma.staffTensionStats.findUnique({
        where: { staffId: report.staffId }
      });
      
      if (stats && stats.dataCount >= 3) {
        const recentAnalyses = await prisma.tensionAnalysis.findMany({
          where: { staffId: report.staffId },
          orderBy: { date: 'desc' },
          take: settings.consecutiveDays
        });
        
        let consecutiveLowDays = 0;
        for (const a of recentAnalyses) {
          if (shouldAlert(a.tensionScore, stats.avgScore, stats.stdDeviation, settings.alertThreshold)) {
            consecutiveLowDays++;
          } else {
            break;
          }
        }
        
        alertStatus = {
          shouldAlert: consecutiveLowDays >= settings.consecutiveDays,
          consecutiveLowDays
        };
      }
    }
    
    res.status(200).json({
      tensionScore: analysis.score,
      confidence: analysis.confidence,
      keywords: {
        positive: analysis.positiveKeywords,
        negative: analysis.negativeKeywords
      },
      shouldAlert: alertStatus.shouldAlert,
      consecutiveLowDays: alertStatus.consecutiveLowDays
    });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Tension analysis error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}