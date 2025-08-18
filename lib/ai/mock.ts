// Mock AI functions for MVP

export async function mockSTT(audioUrl: string): Promise<string> {
  // Mock speech-to-text
  return `これはモックの音声文字起こしテキストです。
  
  本日の面談では、スタッフの最近の業務状況について話し合いました。
  最近は料理の盛り付けに興味を持っており、特にフレンチの技法を勉強しています。
  来月の目標は、新メニューの開発に挑戦することです。
  趣味はカメラで、休日は風景写真を撮りに出かけることが多いです。
  
  今後の課題としては、チームコミュニケーションの向上と、
  より効率的な作業フローの確立が挙げられます。`;
}

export async function summarizeMeeting(transcript: string): Promise<{
  summary: string;
  categories: Array<{ name: string; items: string[] }>;
  profileUpdates: {
    hobby?: string;
    recentInterest?: string;
    monthlyGoal?: string;
  };
}> {
  // Mock meeting summarization
  return {
    summary: '業務状況の確認と今後の目標設定について話し合いました。料理技術の向上に意欲的で、特にフレンチの盛り付け技法に興味を示しています。',
    categories: [
      {
        name: '今後の課題',
        items: [
          'チームコミュニケーションの向上',
          '効率的な作業フローの確立',
        ],
      },
      {
        name: '来月の目標',
        items: ['新メニューの開発に挑戦'],
      },
      {
        name: '最近の関心事',
        items: ['フレンチの盛り付け技法', '料理の見た目の向上'],
      },
    ],
    profileUpdates: {
      hobby: 'カメラ（風景写真）',
      recentInterest: 'フレンチの盛り付け技法',
      monthlyGoal: '新メニューの開発',
    },
  };
}

export async function getMBTIAdvice(mbtiType: string, role: string): Promise<{
  praise: string[];
  criticism: string[];
  conversation: string[];
}> {
  const adviceMap: Record<string, any> = {
    INTJ: {
      staff: {
        praise: [
          '論理的な改善提案を具体的に評価する',
          '独自の視点や創造性を認める',
          '長期的な成果を数値で示す',
        ],
        criticism: [
          '改善点を論理的に説明する',
          '感情論ではなく事実ベースで話す',
          '改善の期限と目標を明確にする',
        ],
        conversation: [
          '将来のビジョンについて聞く',
          '効率化のアイデアを求める',
          '学びたいスキルについて話す',
        ],
      },
    },
    ENFP: {
      staff: {
        praise: [
          '熱意と前向きな姿勢を称える',
          'チームへの良い影響を伝える',
          '創造的なアイデアを評価する',
        ],
        criticism: [
          'ポジティブな面も認めながら改善点を伝える',
          '成長の機会として提示する',
          '具体例を使って優しく説明する',
        ],
        conversation: [
          '最近楽しかったことを聞く',
          'やりがいを感じる瞬間について話す',
          'チームの雰囲気について意見を聞く',
        ],
      },
    },
  };

  const defaultAdvice = {
    praise: [
      '具体的な行動を褒める',
      '努力と成果を認める',
      'チームへの貢献を評価する',
    ],
    criticism: [
      '改善点を明確に伝える',
      '期待を具体的に示す',
      'サポートの意思を示す',
    ],
    conversation: [
      '最近の調子を聞く',
      '困っていることがないか確認する',
      '目標や希望について話す',
    ],
  };

  return adviceMap[mbtiType]?.[role] || defaultAdvice;
}

export async function estimateTone(text: string): Promise<{
  score: number;
  reason: string;
}> {
  // Mock tone estimation based on simple keyword analysis
  const positiveWords = ['頑張った', '嬉しい', '楽しい', '良かった', '成功', '達成', '感謝'];
  const negativeWords = ['疲れた', '大変', '難しい', '困った', '失敗', '辛い', '厳しい'];
  
  let score = 50;
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (text.includes(word)) {
      score += 7;
      positiveCount++;
    }
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) {
      score -= 7;
      negativeCount++;
    }
  });
  
  score = Math.max(1, Math.min(100, score));
  
  let reason = '文章から';
  if (positiveCount > negativeCount) {
    reason += '前向きな気持ちが感じられます。';
  } else if (negativeCount > positiveCount) {
    reason += '疲労感や困難さが感じられます。';
  } else {
    reason += '平常な状態が感じられます。';
  }
  
  return { score, reason };
}