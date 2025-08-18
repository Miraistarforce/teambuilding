import OpenAI from 'openai';
import { logger } from '../utils/logger';

// OpenAI APIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * 日報のテンション分析
 */
export async function analyzeTension(text: string): Promise<{
  score: number;
  confidence: number;
  positiveKeywords: string[];
  negativeKeywords: string[];
  analysis: string;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは日報のテンション分析を行うAIアシスタントです。
日報のテキストから感情を分析し、以下の形式でJSONを返してください：
{
  "score": -1.0から1.0の数値（-1:非常にネガティブ、0:中立、1:非常にポジティブ）,
  "confidence": 0から1の数値（分析の確信度）,
  "positiveKeywords": [ポジティブな単語・フレーズの配列],
  "negativeKeywords": [ネガティブな単語・フレーズの配列],
  "analysis": "簡潔な分析コメント（50文字以内）"
}`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      score: result.score || 0,
      confidence: result.confidence || 0.5,
      positiveKeywords: result.positiveKeywords || [],
      negativeKeywords: result.negativeKeywords || [],
      analysis: result.analysis || ''
    };
  } catch (error) {
    logger.error('OpenAI tension analysis failed:', error);
    // フォールバック：簡易分析を返す
    return {
      score: 0,
      confidence: 0,
      positiveKeywords: [],
      negativeKeywords: [],
      analysis: 'AIによる分析に失敗しました'
    };
  }
}

/**
 * 面談内容の要約生成
 */
export async function generateInterviewSummary(text: string): Promise<{
  summary: string[];
  keyPoints: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは面談内容を要約するAIアシスタントです。
面談内容から重要なポイントを抽出し、以下の形式でJSONを返してください：
{
  "summary": ["要約ポイント1", "要約ポイント2", "要約ポイント3"],
  "keyPoints": ["重要事項1", "重要事項2", "重要事項3"]
}
各項目は簡潔に（30文字以内）まとめてください。`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      summary: result.summary || ['面談内容を記録しました'],
      keyPoints: result.keyPoints || []
    };
  } catch (error) {
    logger.error('OpenAI interview summary failed:', error);
    return {
      summary: ['面談内容を記録しました'],
      keyPoints: []
    };
  }
}

/**
 * 次回面談のアドバイス生成
 */
export async function generateInterviewAdvice(
  staffName: string,
  previousSummary: string[]
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたは人事管理のアドバイザーです。
前回の面談内容を踏まえて、次回の面談で確認すべきポイントをアドバイスしてください。
以下の形式でJSONを返してください：
{
  "advice": ["アドバイス1", "アドバイス2", "アドバイス3", "アドバイス4", "アドバイス5"]
}
各アドバイスは実践的で具体的に（40文字以内）してください。`
        },
        {
          role: 'user',
          content: `スタッフ名: ${staffName}\n前回の面談要約:\n${previousSummary.join('\n')}`
        }
      ],
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return result.advice || [
      '前回の面談内容を踏まえて進捗を確認してください',
      '新たな課題や悩みがないか聞いてください'
    ];
  } catch (error) {
    logger.error('OpenAI interview advice failed:', error);
    return [
      '前回の面談内容を踏まえて進捗を確認してください',
      '新たな課題や悩みがないか聞いてください'
    ];
  }
}

/**
 * MBTI性格タイプに基づくAIアドバイス
 */
export async function generateMBTIAdvice(
  mbtiType: string,
  staffName: string,
  consultText: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `あなたはMBTI性格分析の専門家であり、人事管理のアドバイザーです。
スタッフのMBTI性格タイプを考慮して、管理者からの相談に対して実践的なアドバイスを提供してください。

MBTI性格タイプの特性を踏まえて：
1. その性格タイプの強みと弱みを考慮
2. 効果的なコミュニケーション方法を提案
3. モチベーション向上の具体的な方法を提示
4. 注意すべきポイントを明確に

アドバイスは具体的で実践的にし、500文字以内でまとめてください。`
        },
        {
          role: 'user',
          content: `スタッフ: ${staffName}さん（${mbtiType}タイプ）
相談内容: ${consultText}`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    return response.choices[0].message.content || 'アドバイスの生成に失敗しました。';
  } catch (error) {
    logger.error('OpenAI MBTI advice failed:', error);
    
    // フォールバック：簡易アドバイスを返す
    return `${staffName}さん（${mbtiType}タイプ）への対応について：

${mbtiType}タイプの方は、それぞれ独自の特性を持っています。
相談内容を踏まえて、以下の点に注意してください：

1. 個人の特性を理解し、尊重する
2. 明確で具体的なコミュニケーションを心がける
3. 適切なフィードバックのタイミングを見極める
4. 個人のペースと学習スタイルを考慮する

より詳細なアドバイスが必要な場合は、再度お試しください。`;
  }
}

/**
 * 音声ファイルのテキスト変換（Whisper API）
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  try {
    const fs = require('fs');
    const audioFile = fs.createReadStream(audioFilePath);
    
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ja'
    });

    return response.text;
  } catch (error) {
    logger.error('OpenAI audio transcription failed:', error);
    return '';
  }
}

/**
 * OpenAI APIが利用可能かチェック
 */
export function isOpenAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}