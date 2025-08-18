import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';
import { getMBTIProfile } from '../utils/mbtiProfiles';
import { generateMBTIAdvice, isOpenAIEnabled } from '../services/openaiService';

const router = Router();

// MBTI性格タイプに基づくAI相談
router.post('/mbti-advice', authenticate, async (req, res, next) => {
  try {
    const { mbtiType, consultText, staffName } = req.body;
    
    if (!mbtiType || !consultText) {
      throw new AppError('MBTIタイプと相談内容は必須です', 400);
    }
    
    const mbtiProfile = getMBTIProfile(mbtiType);
    if (!mbtiProfile) {
      throw new AppError('無効なMBTIタイプです', 400);
    }
    
    // OpenAI APIが有効な場合は高度なアドバイス、無効な場合は簡易アドバイス
    const advice = isOpenAIEnabled()
      ? await generateMBTIAdvice(mbtiType, staffName, consultText)
      : generateMBTIAdviceSimple(mbtiType, consultText, staffName, mbtiProfile);
    
    res.json({
      advice,
      mbtiType,
      staffName
    });
  } catch (error) {
    next(error);
  }
});

// MBTIタイプに基づくアドバイス生成（簡易版）
function generateMBTIAdviceSimple(
  mbtiType: string,
  consultText: string,
  staffName: string,
  profile: any
): string {
  const consultation = consultText.toLowerCase();
  let advice = `${staffName}さん（${mbtiType}）への対応アドバイス：\n\n`;
  
  // モチベーション関連の相談
  if (consultation.includes('やる気') || consultation.includes('モチベーション')) {
    advice += generateMotivationAdvice(mbtiType, profile);
  }
  // コミュニケーション関連の相談
  else if (consultation.includes('話') || consultation.includes('コミュニケーション') || consultation.includes('伝え')) {
    advice += generateCommunicationAdvice(mbtiType, profile);
  }
  // 仕事の割り振り関連
  else if (consultation.includes('仕事') || consultation.includes('タスク') || consultation.includes('業務')) {
    advice += generateTaskAdvice(mbtiType, profile);
  }
  // 問題・トラブル関連
  else if (consultation.includes('問題') || consultation.includes('ミス') || consultation.includes('トラブル')) {
    advice += generateProblemSolvingAdvice(mbtiType, profile);
  }
  // 成長・育成関連
  else if (consultation.includes('成長') || consultation.includes('育成') || consultation.includes('スキル')) {
    advice += generateGrowthAdvice(mbtiType, profile);
  }
  // デフォルトアドバイス
  else {
    advice += generateGeneralAdvice(mbtiType, profile);
  }
  
  advice += `\n\n【${mbtiType}タイプの特性】\n`;
  advice += `・${profile.description}\n`;
  advice += `・強み: ${profile.strengths.join('、')}\n`;
  advice += `\n【推奨される接し方】\n`;
  advice += `・${profile.communicationStyle.distance}`;
  
  return advice;
}

function generateMotivationAdvice(mbtiType: string, profile: any): string {
  const adviceMap: Record<string, string> = {
    'INTJ': '明確な目標と戦略を示し、自律的に取り組める環境を提供してください。成果と能力を認め、新しい挑戦の機会を与えることが効果的です。',
    'INTP': '知的な刺激と学習機会を提供し、創造的な問題解決に取り組ませてください。論理的な説明と自由な探求時間が重要です。',
    'ENTJ': 'リーダーシップを発揮できる役割を与え、野心的な目標を設定してください。権限と責任を明確にし、成果を評価することが大切です。',
    'ENTP': '革新的なプロジェクトに参加させ、アイデアを自由に提案できる環境を作ってください。議論と挑戦を楽しめる機会が必要です。',
    'INFJ': '仕事の意味と価値を説明し、チームへの貢献を認めてください。静かな環境と深い信頼関係が重要です。',
    'INFP': '個人の価値観を尊重し、創造的な表現の機会を提供してください。感情的なサポートと柔軟な働き方が効果的です。',
    'ENFJ': '他者を助ける役割を与え、チームの成長に貢献できる機会を作ってください。感謝と承認を頻繁に伝えることが大切です。',
    'ENFP': '情熱を持てるプロジェクトに関わらせ、新しい経験を積ませてください。ポジティブなフィードバックと自由な雰囲気が必要です。',
    'ISTJ': '明確な手順と期待を示し、安定した環境を提供してください。実績と信頼性を評価し、段階的な成長を支援することが重要です。',
    'ISFJ': '細やかな配慮を認め、チームのサポート役として評価してください。安心感と感謝の言葉が効果的です。',
    'ESTJ': '効率的な目標達成を評価し、組織への貢献を認めてください。明確な成果指標と昇進の機会が重要です。',
    'ESFJ': 'チームの調和への貢献を認め、協力的な環境を維持してください。具体的な感謝と承認が必要です。',
    'ISTP': '実践的なスキルを活かせる仕事を与え、自主性を尊重してください。技術的な挑戦と自由な作業時間が効果的です。',
    'ISFP': '個性を尊重し、美的センスを活かせる機会を提供してください。プレッシャーを避け、穏やかな環境を作ることが大切です。',
    'ESTP': '即座に結果が見える仕事を与え、行動的な役割を任せてください。競争と実践的な学習機会が重要です。',
    'ESFP': '楽しい雰囲気を作り、人との交流がある仕事を任せてください。即座のフィードバックと柔軟な対応が必要です。'
  };
  
  return adviceMap[mbtiType] || '個人の特性を理解し、適切なサポートを提供してください。';
}

function generateCommunicationAdvice(mbtiType: string, profile: any): string {
  let advice = '';
  
  // 内向型の場合
  if (mbtiType.startsWith('I')) {
    advice += '• 1対1の静かな環境で話す機会を設けてください\n';
    advice += '• 事前に議題を共有し、考える時間を与えてください\n';
    advice += '• メールやチャットでの連絡も活用してください\n';
  } else {
    advice += '• オープンな議論の場を設けてください\n';
    advice += '• アイデアを自由に共有できる雰囲気を作ってください\n';
    advice += '• 対面でのコミュニケーションを重視してください\n';
  }
  
  // 思考型の場合
  if (mbtiType.includes('T')) {
    advice += '• 論理的で客観的な説明を心がけてください\n';
    advice += '• データと事実に基づいた議論をしてください\n';
  } else {
    advice += '• 感情に配慮した温かいコミュニケーションを心がけてください\n';
    advice += '• 個人的な関心を示し、共感を表現してください\n';
  }
  
  return advice;
}

function generateTaskAdvice(mbtiType: string, profile: any): string {
  let advice = '';
  
  // 判断型の場合
  if (mbtiType.endsWith('J')) {
    advice += '• 明確な締切とスケジュールを設定してください\n';
    advice += '• 計画的に進められる構造化されたタスクを割り当ててください\n';
    advice += '• 進捗管理と定期的なチェックポイントを設けてください\n';
  } else {
    advice += '• 柔軟なスケジュールと自由度のあるタスクを割り当ててください\n';
    advice += '• 創造性を発揮できる余地を残してください\n';
    advice += '• 複数のプロジェクトを並行して進められるようにしてください\n';
  }
  
  // 直観型の場合
  if (mbtiType.includes('N')) {
    advice += '• 全体像と長期的なビジョンを示してください\n';
    advice += '• 革新的なアプローチを奨励してください\n';
  } else {
    advice += '• 具体的で実践的な指示を提供してください\n';
    advice += '• 段階的な手順と明確な例を示してください\n';
  }
  
  return advice;
}

function generateProblemSolvingAdvice(mbtiType: string, profile: any): string {
  const praise = profile.communicationStyle.praise[0] || '';
  const feedback = profile.communicationStyle.feedback[0] || '';
  
  let advice = `問題への対処法：\n`;
  advice += `• ${feedback}\n`;
  advice += `• 改善策を一緒に考え、サポートを提供してください\n`;
  advice += `• 失敗から学ぶ機会として前向きに捉えてください\n`;
  advice += `• ${praise}\n`;
  
  return advice;
}

function generateGrowthAdvice(mbtiType: string, profile: any): string {
  let advice = '成長支援のアプローチ：\n';
  
  // タイプ別の成長支援
  if (mbtiType.includes('NT')) {
    advice += '• 専門知識を深める機会を提供してください\n';
    advice += '• 戦略的思考を活かせる役割を与えてください\n';
  } else if (mbtiType.includes('NF')) {
    advice += '• 人間関係スキルを活かせる機会を作ってください\n';
    advice += '• 価値観に沿った成長目標を設定してください\n';
  } else if (mbtiType.includes('ST')) {
    advice += '• 実践的なスキルトレーニングを提供してください\n';
    advice += '• 段階的で具体的な成長計画を立ててください\n';
  } else if (mbtiType.includes('SF')) {
    advice += '• チームワークスキルを伸ばす機会を提供してください\n';
    advice += '• 人をサポートする役割で経験を積ませてください\n';
  }
  
  advice += '• 定期的なフィードバックと承認を提供してください\n';
  advice += '• 個人のペースと学習スタイルを尊重してください\n';
  
  return advice;
}

function generateGeneralAdvice(mbtiType: string, profile: any): string {
  let advice = '全般的な対応方法：\n';
  
  // コミュニケーションスタイルから主要なアドバイスを抽出
  if (profile.communicationStyle.tips && profile.communicationStyle.tips.length > 0) {
    profile.communicationStyle.tips.forEach((tip: string, index: number) => {
      if (index < 3) {
        advice += `• ${tip}\n`;
      }
    });
  }
  
  advice += `\n褒め方のポイント：\n`;
  if (profile.communicationStyle.praise && profile.communicationStyle.praise.length > 0) {
    advice += `• ${profile.communicationStyle.praise[0]}\n`;
  }
  
  advice += `\n注意の仕方：\n`;
  if (profile.communicationStyle.feedback && profile.communicationStyle.feedback.length > 0) {
    advice += `• ${profile.communicationStyle.feedback[0]}\n`;
  }
  
  return advice;
}

export default router;