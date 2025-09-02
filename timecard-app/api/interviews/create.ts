import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default-jwt-secret-change-in-production';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

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

  // multerでファイル処理
  await new Promise((resolve, reject) => {
    upload.single('audio')(req as any, res as any, (err: any) => {
      if (err) reject(err);
      else resolve(undefined);
    });
  });

  try {
    // 認証チェック
    const token = req.headers.authorization;
    authenticate(token);

    const { staffId, storeId, textContent, createdBy } = (req as any).body;
    const audioFile = (req as any).file;

    let audioUrl = null;
    let transcription = textContent;

    // 音声ファイルがある場合、Supabaseにアップロード＆文字起こし
    if (audioFile) {
      const fileName = `interviews/${Date.now()}_${audioFile.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('daily-reports')
        .upload(fileName, audioFile.buffer, {
          contentType: audioFile.mimetype,
        });

      if (!uploadError && uploadData) {
        audioUrl = supabase.storage.from('daily-reports').getPublicUrl(uploadData.path).data.publicUrl;

        // OpenAIで文字起こし
        if (process.env.OPENAI_API_KEY && !textContent) {
          try {
            const file = new File([audioFile.buffer], audioFile.originalname, {
              type: audioFile.mimetype,
            });
            const response = await openai.audio.transcriptions.create({
              file,
              model: 'whisper-1',
              language: 'ja'
            });
            transcription = response.text;
          } catch (error) {
            console.error('Transcription error:', error);
          }
        }
      }
    }

    // 面談記録を保存
    const interview = await prisma.interview.create({
      data: {
        staffId: parseInt(staffId),
        storeId: parseInt(storeId),
        audioUrl,
        textContent: transcription,
        createdBy
      }
    });

    // AI要約を生成（非同期）
    if (transcription && process.env.OPENAI_API_KEY) {
      openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '面談内容を簡潔に要約し、重要なポイントと次回のアドバイスを提供してください。'
          },
          {
            role: 'user',
            content: transcription
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }).then(async (response) => {
        const content = response.choices[0].message.content || '';
        const [summary, advice] = content.split('\n\n');
        
        await prisma.interview.update({
          where: { id: interview.id },
          data: { summary, advice }
        });
      });
    }

    res.status(201).json(interview);
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('Interview error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}