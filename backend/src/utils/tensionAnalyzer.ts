// テンション分析用のユーティリティ関数

// ポジティブ/ネガティブキーワード辞書
const POSITIVE_KEYWORDS = [
  // 感情
  '嬉しい', 'うれしい', '楽しい', 'たのしい', '幸せ', 'しあわせ', 
  '最高', 'さいこう', 'ハッピー', 'わくわく', 'ワクワク', 'ドキドキ',
  
  // 達成・成功
  '頑張った', 'がんばった', '頑張る', 'がんばる', '達成', 'できた', 
  '成功', 'うまくいった', '完了', '終わった', 'クリア',
  
  // ポジティブな状態
  '元気', 'げんき', '充実', 'やる気', 'モチベーション', '調子いい',
  'スムーズ', '順調', '快適', '良い', 'よい', 'いい感じ',
  
  // 感謝・称賛
  'ありがとう', 'ありがと', '感謝', 'おかげ', 'すごい', 'すばらしい',
  '素晴らしい', '良かった', 'よかった',
  
  // 絵文字・記号
  '😊', '😄', '😃', '🎉', '✨', '💪', '👍', '！！', '♪',
];

const NEGATIVE_KEYWORDS = [
  // ネガティブな感情
  '疲れた', 'つかれた', '辛い', 'つらい', '大変', 'たいへん',
  '憂鬱', 'ゆううつ', '不安', 'ふあん', '心配', 'しんぱい',
  'イライラ', 'いらいら', 'ムカつく', 'むかつく', '腹立つ',
  
  // 体調不良
  '痛い', 'いたい', '具合悪い', '体調悪い', '風邪', 'かぜ',
  'だるい', 'しんどい', '眠い', 'ねむい',
  
  // 問題・困難
  'ミス', '失敗', 'しっぱい', 'トラブル', '問題', 'もんだい',
  '困った', 'こまった', '難しい', 'むずかしい', 'できない',
  
  // ネガティブな状態
  'バタバタ', '忙しい', 'いそがしい', '混乱', 'こんらん',
  'ストレス', 'プレッシャー', '無理', 'むり',
  
  // 謝罪・後悔
  'すみません', 'ごめん', '申し訳', 'もうしわけ', '反省',
  
  // 絵文字
  '😢', '😭', '😰', '😱', '😞', '😔', '💦', '😵',
];

// 文の長さによる補正係数
const LENGTH_FACTOR = {
  SHORT: 0.8,  // 50文字未満
  MEDIUM: 1.0, // 50-200文字
  LONG: 1.2,   // 200文字以上
};

export function analyzeTension(text: string): {
  score: number;
  positiveKeywords: string[];
  negativeKeywords: string[];
  confidence: number;
} {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      positiveKeywords: [],
      negativeKeywords: [],
      confidence: 0,
    };
  }

  const lowerText = text.toLowerCase();
  
  // キーワードマッチング
  const positiveKeywords: string[] = [];
  const negativeKeywords: string[] = [];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  // ポジティブキーワードのチェック
  for (const keyword of POSITIVE_KEYWORDS) {
    const count = (lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    if (count > 0) {
      positiveKeywords.push(keyword);
      positiveCount += count;
    }
  }
  
  // ネガティブキーワードのチェック
  for (const keyword of NEGATIVE_KEYWORDS) {
    const count = (lowerText.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
    if (count > 0) {
      negativeKeywords.push(keyword);
      negativeCount += count;
    }
  }
  
  // 文の長さによる補正
  const textLength = text.length;
  let lengthFactor = LENGTH_FACTOR.MEDIUM;
  if (textLength < 50) {
    lengthFactor = LENGTH_FACTOR.SHORT;
  } else if (textLength > 200) {
    lengthFactor = LENGTH_FACTOR.LONG;
  }
  
  // 感嘆符の数（ポジティブ指標）
  const exclamationCount = (text.match(/[！!]+/g) || []).length;
  positiveCount += exclamationCount * 0.5;
  
  // 疑問符の数（不安の指標）
  const questionCount = (text.match(/[？?]+/g) || []).length;
  if (questionCount > 2) {
    negativeCount += questionCount * 0.3;
  }
  
  // スコア計算（-1.0 〜 1.0）
  const totalCount = positiveCount + negativeCount;
  let score = 0;
  
  if (totalCount > 0) {
    // 基本スコア
    score = (positiveCount - negativeCount) / totalCount;
    
    // 長さ補正
    score *= lengthFactor;
    
    // スコアを -1.0 〜 1.0 の範囲に制限
    score = Math.max(-1, Math.min(1, score));
  }
  
  // 信頼度（キーワードがどれだけ見つかったか）
  const confidence = Math.min(1, totalCount / 5);
  
  return {
    score,
    positiveKeywords: [...new Set(positiveKeywords)], // 重複を除去
    negativeKeywords: [...new Set(negativeKeywords)], // 重複を除去
    confidence,
  };
}

// 平均と標準偏差を計算
export function calculateStats(scores: number[]): {
  mean: number;
  stdDev: number;
} {
  if (scores.length === 0) {
    return { mean: 0, stdDev: 0 };
  }
  
  // 平均
  const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  
  // 標準偏差
  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length;
  const stdDev = Math.sqrt(avgSquaredDiff);
  
  return { mean, stdDev };
}

// アラートが必要かチェック
export function shouldAlert(
  currentScore: number,
  avgScore: number,
  stdDev: number,
  threshold: number = 0.3
): boolean {
  // 平均から threshold 以上下がっているか
  const deviation = avgScore - currentScore;
  
  // 標準偏差を考慮した閾値
  const adjustedThreshold = Math.max(threshold, stdDev * 1.5);
  
  return deviation > adjustedThreshold;
}