import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

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

// MBTI プロファイルデータ
const MBTI_PROFILES: Record<string, any> = {
  INTJ: {
    title: '建築家',
    description: '独立心が強く、戦略的な思考を持つ',
    strengths: ['戦略的思考', '高い独立性', '効率重視', '長期的視野'],
    communicationStyle: {
      praise: ['具体的な成果や戦略的な判断を認める'],
      feedback: ['論理的で具体的な改善点を提示する'],
      distance: '個人の空間を尊重し、必要な時のみ関わる',
      tips: ['効率性を重視する', '無駄な会議や雑談は最小限に']
    }
  },
  INTP: {
    title: '論理学者',
    description: '革新的で論理的な問題解決者',
    strengths: ['論理的思考', '創造性', '客観性', '知的好奇心'],
    communicationStyle: {
      praise: ['独創的なアイデアや論理的な解決策を評価'],
      feedback: ['論理的な根拠を示して説明'],
      distance: '知的な議論は歓迎するが、感情的な関わりは控えめに',
      tips: ['抽象的な概念の議論を楽しむ', '独立して働ける環境を好む']
    }
  },
  ENTJ: {
    title: '指揮官',
    description: '天性のリーダーで目標達成に向けて組織を導く',
    strengths: ['リーダーシップ', '決断力', '効率性', '戦略的計画'],
    communicationStyle: {
      praise: ['リーダーシップや成果を直接的に認める'],
      feedback: ['率直で建設的なフィードバック'],
      distance: 'プロフェッショナルな関係を保ち、成果重視の交流',
      tips: ['時間を無駄にしない', '要点を簡潔に伝える']
    }
  },
  ENTP: {
    title: '討論者',
    description: '知的な挑戦を楽しむ革新的な思考者',
    strengths: ['革新性', '適応力', '論理的分析', '創造性'],
    communicationStyle: {
      praise: ['革新的なアイデアや知的な洞察を評価'],
      feedback: ['議論や討論の形式で改善点を探る'],
      distance: '知的な刺激のある関係を好む',
      tips: ['新しいアイデアを歓迎', '議論を楽しむ']
    }
  },
  INFJ: {
    title: '提唱者',
    description: '理想主義的で他者の成長を支援する',
    strengths: ['洞察力', '共感力', '創造性', '献身的'],
    communicationStyle: {
      praise: ['価値観や貢献を認める言葉'],
      feedback: ['個人的な成長につながる建設的な助言'],
      distance: '深い信頼関係を築くが、個人の時間も必要',
      tips: ['1対1の深い対話を好む', '意味のある仕事を重視']
    }
  },
  INFP: {
    title: '仲介者',
    description: '創造的で価値観を大切にする理想主義者',
    strengths: ['創造性', '共感力', '柔軟性', '価値観重視'],
    communicationStyle: {
      praise: ['個人の価値観や努力を認める'],
      feedback: ['優しく建設的な方法で伝える'],
      distance: '親密だが個人の空間も尊重',
      tips: ['感情に配慮', '創造的な自由を与える']
    }
  },
  ENFJ: {
    title: '主人公',
    description: 'カリスマ的で他者の可能性を引き出す',
    strengths: ['リーダーシップ', '共感力', 'コミュニケーション', '利他的'],
    communicationStyle: {
      praise: ['他者への貢献やチームへの影響を認める'],
      feedback: ['成長の機会として前向きに伝える'],
      distance: '温かく支援的な関係',
      tips: ['チームの調和を重視', '感謝を頻繁に伝える']
    }
  },
  ENFP: {
    title: '運動家',
    description: '情熱的で創造的な自由な精神の持ち主',
    strengths: ['創造性', '熱意', '社交性', '柔軟性'],
    communicationStyle: {
      praise: ['情熱や創造性を認める'],
      feedback: ['ポジティブな面を強調しながら改善点を伝える'],
      distance: '友好的で温かい関係',
      tips: ['新しいアイデアを歓迎', '楽しい雰囲気を作る']
    }
  },
  ISTJ: {
    title: '管理者',
    description: '実直で責任感が強く、伝統を重んじる',
    strengths: ['責任感', '組織力', '実用性', '信頼性'],
    communicationStyle: {
      praise: ['信頼性や実績を具体的に評価'],
      feedback: ['明確で具体的な改善指示'],
      distance: 'プロフェッショナルで安定した関係',
      tips: ['規則と手順を明確に', '実績を評価']
    }
  },
  ISFJ: {
    title: '擁護者',
    description: '献身的で他者を支援することに喜びを感じる',
    strengths: ['献身性', '実用性', '忍耐力', '細やかな配慮'],
    communicationStyle: {
      praise: ['細やかな配慮や献身を認める'],
      feedback: ['優しく配慮深い方法で伝える'],
      distance: '温かく支援的だが控えめな関係',
      tips: ['感謝を伝える', '安定した環境を提供']
    }
  },
  ESTJ: {
    title: '幹部',
    description: '組織的で効率を重視する天性の管理者',
    strengths: ['組織力', 'リーダーシップ', '実用性', '決断力'],
    communicationStyle: {
      praise: ['成果と効率性を認める'],
      feedback: ['直接的で明確な指示'],
      distance: '明確な役割と責任のある関係',
      tips: ['効率を重視', '成果を評価']
    }
  },
  ESFJ: {
    title: '領事',
    description: '協調性が高く、他者のニーズに敏感',
    strengths: ['協調性', '責任感', '実用性', '対人スキル'],
    communicationStyle: {
      praise: ['チームへの貢献を認める'],
      feedback: ['協力的な姿勢で改善を提案'],
      distance: '温かく協力的な関係',
      tips: ['チームワークを重視', '具体的な感謝']
    }
  },
  ISTP: {
    title: '巨匠',
    description: '実践的で論理的な問題解決者',
    strengths: ['実用性', '論理性', '適応力', '独立性'],
    communicationStyle: {
      praise: ['技術的なスキルや実践的な解決を評価'],
      feedback: ['具体的で実用的な改善提案'],
      distance: '必要最小限の関わり',
      tips: ['実践的なアプローチ', '自主性を尊重']
    }
  },
  ISFP: {
    title: '冒険家',
    description: '柔軟で創造的、個性を大切にする',
    strengths: ['創造性', '柔軟性', '感受性', '実用性'],
    communicationStyle: {
      praise: ['個性や創造性を認める'],
      feedback: ['穏やかで配慮深い方法で伝える'],
      distance: '穏やかで非侵襲的な関係',
      tips: ['個性を尊重', 'プレッシャーを避ける']
    }
  },
  ESTP: {
    title: '起業家',
    description: '行動的で現実的な問題解決者',
    strengths: ['行動力', '適応力', '実用性', '社交性'],
    communicationStyle: {
      praise: ['即座の成果や行動力を評価'],
      feedback: ['簡潔で行動指向の改善提案'],
      distance: '活発で直接的な関係',
      tips: ['行動重視', '実践的な学習']
    }
  },
  ESFP: {
    title: 'エンターテイナー',
    description: '陽気で柔軟、人生を楽しむ',
    strengths: ['社交性', '柔軟性', '実用性', '熱意'],
    communicationStyle: {
      praise: ['熱意や人への影響を認める'],
      feedback: ['ポジティブで励ましの言葉と共に'],
      distance: '楽しく友好的な関係',
      tips: ['楽しい雰囲気', '柔軟な対応']
    }
  }
};

// 簡易アドバイス生成
function generateSimpleAdvice(mbtiType: string, consultText: string, staffName: string): string {
  const profile = MBTI_PROFILES[mbtiType];
  if (!profile) {
    return '無効なMBTIタイプです。';
  }

  const consultation = consultText.toLowerCase();
  let advice = `${staffName}さん（${mbtiType}）への対応アドバイス：\n\n`;
  
  // モチベーション関連
  if (consultation.includes('やる気') || consultation.includes('モチベーション')) {
    advice += generateMotivationAdvice(mbtiType, profile);
  }
  // コミュニケーション関連
  else if (consultation.includes('話') || consultation.includes('コミュニケーション')) {
    advice += generateCommunicationAdvice(mbtiType);
  }
  // 仕事関連
  else if (consultation.includes('仕事') || consultation.includes('タスク')) {
    advice += generateTaskAdvice(mbtiType);
  }
  // デフォルト
  else {
    advice += generateGeneralAdvice(profile);
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
    'INTJ': '明確な目標と戦略を示し、自律的に取り組める環境を提供してください。',
    'INTP': '知的な刺激と学習機会を提供し、創造的な問題解決に取り組ませてください。',
    'ENTJ': 'リーダーシップを発揮できる役割を与え、野心的な目標を設定してください。',
    'ENTP': '革新的なプロジェクトに参加させ、アイデアを自由に提案できる環境を作ってください。',
    'INFJ': '仕事の意味と価値を説明し、チームへの貢献を認めてください。',
    'INFP': '個人の価値観を尊重し、創造的な表現の機会を提供してください。',
    'ENFJ': '他者を助ける役割を与え、チームの成長に貢献できる機会を作ってください。',
    'ENFP': '情熱を持てるプロジェクトに関わらせ、新しい経験を積ませてください。',
    'ISTJ': '明確な手順と期待を示し、安定した環境を提供してください。',
    'ISFJ': '細やかな配慮を認め、チームのサポート役として評価してください。',
    'ESTJ': '効率的な目標達成を評価し、組織への貢献を認めてください。',
    'ESFJ': 'チームの調和への貢献を認め、協力的な環境を維持してください。',
    'ISTP': '実践的なスキルを活かせる仕事を与え、自主性を尊重してください。',
    'ISFP': '個性を尊重し、美的センスを活かせる機会を提供してください。',
    'ESTP': '即座に結果が見える仕事を与え、行動的な役割を任せてください。',
    'ESFP': '楽しい雰囲気を作り、人との交流がある仕事を任せてください。'
  };
  
  return adviceMap[mbtiType] || '個人の特性を理解し、適切なサポートを提供してください。';
}

function generateCommunicationAdvice(mbtiType: string): string {
  let advice = '';
  
  if (mbtiType.startsWith('I')) {
    advice += '• 1対1の静かな環境で話す機会を設けてください\n';
    advice += '• 事前に議題を共有し、考える時間を与えてください\n';
  } else {
    advice += '• オープンな議論の場を設けてください\n';
    advice += '• アイデアを自由に共有できる雰囲気を作ってください\n';
  }
  
  if (mbtiType.includes('T')) {
    advice += '• 論理的で客観的な説明を心がけてください\n';
    advice += '• データと事実に基づいた議論をしてください\n';
  } else {
    advice += '• 感情に配慮した温かいコミュニケーションを心がけてください\n';
    advice += '• 個人的な関心を示し、共感を表現してください\n';
  }
  
  return advice;
}

function generateTaskAdvice(mbtiType: string): string {
  let advice = '';
  
  if (mbtiType.endsWith('J')) {
    advice += '• 明確な締切とスケジュールを設定してください\n';
    advice += '• 計画的に進められる構造化されたタスクを割り当ててください\n';
  } else {
    advice += '• 柔軟なスケジュールと自由度のあるタスクを割り当ててください\n';
    advice += '• 創造性を発揮できる余地を残してください\n';
  }
  
  if (mbtiType.includes('N')) {
    advice += '• 全体像と長期的なビジョンを示してください\n';
    advice += '• 革新的なアプローチを奨励してください\n';
  } else {
    advice += '• 具体的で実践的な指示を提供してください\n';
    advice += '• 段階的な手順と明確な例を示してください\n';
  }
  
  return advice;
}

function generateGeneralAdvice(profile: any): string {
  let advice = '全般的な対応方法：\n';
  
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
  
  return advice;
}

// AI生成アドバイス
async function generateAIAdvice(mbtiType: string, staffName: string, consultText: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `あなたはMBTI性格タイプに基づいた人材マネジメントの専門家です。
${mbtiType}タイプの特性を考慮して、具体的で実践的なアドバイスを提供してください。`
        },
        {
          role: 'user',
          content: `スタッフ名: ${staffName}
MBTIタイプ: ${mbtiType}
相談内容: ${consultText}

このスタッフへの適切な対応方法をアドバイスしてください。`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    return response.choices[0].message.content || generateSimpleAdvice(mbtiType, consultText, staffName);
  } catch (error) {
    console.error('AI advice generation error:', error);
    return generateSimpleAdvice(mbtiType, consultText, staffName);
  }
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

    const { mbtiType, consultText, staffName } = req.body;
    
    if (!mbtiType || !consultText) {
      res.status(400).json({ error: 'MBTIタイプと相談内容は必須です' });
      return;
    }
    
    const mbtiProfile = MBTI_PROFILES[mbtiType];
    if (!mbtiProfile) {
      res.status(400).json({ error: '無効なMBTIタイプです' });
      return;
    }
    
    // OpenAI APIが有効な場合は高度なアドバイス、無効な場合は簡易アドバイス
    const advice = process.env.OPENAI_API_KEY
      ? await generateAIAdvice(mbtiType, staffName, consultText)
      : generateSimpleAdvice(mbtiType, consultText, staffName);
    
    res.status(200).json({
      advice,
      mbtiType,
      staffName
    });
  } catch (error: any) {
    if (error.message === 'Invalid token' || error.message === 'No token provided') {
      res.status(401).json({ error: 'Unauthorized' });
    } else {
      console.error('AI consult error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}