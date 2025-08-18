// MBTI性格タイプ別コミュニケーションガイド

export const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP'
] as const;

export type MBTIType = typeof MBTI_TYPES[number];

interface MBTIProfile {
  type: MBTIType;
  title: string;
  description: string;
  strengths: string[];
  communicationStyle: {
    praise: string[];
    feedback: string[];
    distance: string;
    tips: string[];
  };
}

export const MBTI_PROFILES: Record<MBTIType, MBTIProfile> = {
  INTJ: {
    type: 'INTJ',
    title: '建築家',
    description: '独立心が強く、戦略的な思考を持つ',
    strengths: ['戦略的思考', '高い独立性', '効率重視', '長期的視野'],
    communicationStyle: {
      praise: [
        '具体的な成果や戦略的な判断を認める',
        '「あなたの分析は的確で、プロジェクトの成功に貢献しました」',
        '能力や専門知識を認める形で褒める'
      ],
      feedback: [
        '論理的で具体的な改善点を提示する',
        '感情的にならず、事実ベースで話す',
        '改善の必要性と期待される成果を明確に伝える'
      ],
      distance: '個人の空間を尊重し、必要な時のみ関わる。過度な社交は避ける',
      tips: [
        '効率性を重視する',
        '無駄な会議や雑談は最小限に',
        'メールやチャットでの連絡を好む傾向'
      ]
    }
  },
  INTP: {
    type: 'INTP',
    title: '論理学者',
    description: '革新的で論理的な問題解決者',
    strengths: ['論理的思考', '創造性', '客観性', '知的好奇心'],
    communicationStyle: {
      praise: [
        '独創的なアイデアや論理的な解決策を評価',
        '「あなたの革新的なアプローチは問題解決に大きく貢献しました」',
        '知的な成果を認める'
      ],
      feedback: [
        '論理的な根拠を示して説明',
        '理論的な観点から改善点を提案',
        '新しい視点や可能性を提示'
      ],
      distance: '知的な議論は歓迎するが、感情的な関わりは控えめに',
      tips: [
        '抽象的な概念の議論を楽しむ',
        '細かい規則より原理原則を重視',
        '独立して働ける環境を好む'
      ]
    }
  },
  ENTJ: {
    type: 'ENTJ',
    title: '指揮官',
    description: '天性のリーダーで目標達成に向けて組織を導く',
    strengths: ['リーダーシップ', '決断力', '効率性', '戦略的計画'],
    communicationStyle: {
      praise: [
        'リーダーシップや成果を直接的に認める',
        '「あなたのリーダーシップでチームが目標を達成できました」',
        '具体的な数字や成果で評価'
      ],
      feedback: [
        '率直で建設的なフィードバック',
        '改善により得られる成果を強調',
        '挑戦的な目標を設定'
      ],
      distance: 'プロフェッショナルな関係を保ち、成果重視の交流',
      tips: [
        '時間を無駄にしない',
        '要点を簡潔に伝える',
        '権限と責任を明確にする'
      ]
    }
  },
  ENTP: {
    type: 'ENTP',
    title: '討論者',
    description: '知的な挑戦を楽しむ革新的な思考者',
    strengths: ['革新性', '適応力', '分析力', '議論好き'],
    communicationStyle: {
      praise: [
        '革新的なアイデアや知的な貢献を評価',
        '「あなたの斬新な視点がブレークスルーをもたらしました」',
        '創造性と柔軟性を認める'
      ],
      feedback: [
        '知的な議論として提示',
        '複数の視点から検討を促す',
        '新しい挑戦として位置づける'
      ],
      distance: '知的な刺激のある対話を楽しむ、オープンな関係',
      tips: [
        '議論を楽しむ性質を理解',
        'ブレインストーミングに積極的',
        'ルーティンワークは苦手'
      ]
    }
  },
  INFJ: {
    type: 'INFJ',
    title: '提唱者',
    description: '理想主義的で思いやりのある静かなサポーター',
    strengths: ['洞察力', '共感力', '創造性', '計画性'],
    communicationStyle: {
      praise: [
        '価値観や貢献の意味を認める',
        '「あなたの思いやりがチームの雰囲気を良くしています」',
        '個人的で心のこもった感謝'
      ],
      feedback: [
        '優しく建設的なアプローチ',
        '改善が全体にもたらす良い影響を説明',
        'プライベートな環境で1対1で'
      ],
      distance: '深い信頼関係を築いてから親密に。表面的な関係は避ける',
      tips: [
        '価値観を大切にする',
        '批判に敏感な傾向',
        '静かな環境を好む'
      ]
    }
  },
  INFP: {
    type: 'INFP',
    title: '仲介者',
    description: '理想主義的で創造的、個人の価値観を大切にする',
    strengths: ['創造性', '共感力', '柔軟性', '誠実さ'],
    communicationStyle: {
      praise: [
        '個人の価値観や努力を認める',
        '「あなたの誠実な姿勢に感動しました」',
        '個性や創造性を評価'
      ],
      feedback: [
        '感情に配慮した優しいアプローチ',
        '成長の機会として前向きに提示',
        '個人の価値観を尊重しながら'
      ],
      distance: '自然体で接し、個人の空間を尊重。強制は避ける',
      tips: [
        '感情を大切にする',
        '競争より協力を好む',
        '意味のある仕事を求める'
      ]
    }
  },
  ENFJ: {
    type: 'ENFJ',
    title: '主人公',
    description: 'カリスマ的で人を鼓舞し、成長を助ける',
    strengths: ['共感力', 'リーダーシップ', 'コミュニケーション', '利他主義'],
    communicationStyle: {
      praise: [
        '他者への貢献を認める',
        '「あなたのサポートでみんなが成長できています」',
        '人間関係構築の才能を評価'
      ],
      feedback: [
        '成長の機会として前向きに',
        'チーム全体への影響を考慮',
        '感謝を伝えてから改善点を'
      ],
      distance: '温かく親密な関係を築く。オープンなコミュニケーション',
      tips: [
        '人の成長を喜ぶ',
        '調和を重視',
        '承認と感謝が大切'
      ]
    }
  },
  ENFP: {
    type: 'ENFP',
    title: '運動家',
    description: '情熱的で創造的、可能性を追求する',
    strengths: ['熱意', '創造性', '共感力', '柔軟性'],
    communicationStyle: {
      praise: [
        '情熱と創造性を認める',
        '「あなたのエネルギーがチームを明るくしています」',
        'アイデアと熱意を評価'
      ],
      feedback: [
        'ポジティブで建設的に',
        '可能性と成長に焦点',
        '具体例を交えて優しく'
      ],
      distance: '親しみやすく温かい関係。形式的すぎない交流',
      tips: [
        '新しいことに挑戦したがる',
        'ルーティンは苦手',
        '感情表現が豊か'
      ]
    }
  },
  ISTJ: {
    type: 'ISTJ',
    title: '管理者',
    description: '責任感が強く、伝統と秩序を重んじる',
    strengths: ['責任感', '組織力', '信頼性', '実践的'],
    communicationStyle: {
      praise: [
        '信頼性と責任感を評価',
        '「あなたの正確な仕事ぶりに信頼を寄せています」',
        '具体的な成果と貢献を認める'
      ],
      feedback: [
        '明確で具体的な指示',
        '規則や手順に基づいて説明',
        '実践的な改善策を提示'
      ],
      distance: 'プロフェッショナルで礼儀正しい関係。段階的に信頼を築く',
      tips: [
        '計画と準備を重視',
        '突然の変更は苦手',
        '伝統と実績を尊重'
      ]
    }
  },
  ISFJ: {
    type: 'ISFJ',
    title: '擁護者',
    description: '献身的で思いやりがあり、他者を支える',
    strengths: ['思いやり', '信頼性', '観察力', '献身性'],
    communicationStyle: {
      praise: [
        '献身的なサポートを感謝',
        '「あなたの細やかな配慮に助けられています」',
        '具体的な行動を認める'
      ],
      feedback: [
        '優しく配慮深いアプローチ',
        '個人的に1対1で',
        '感謝を伝えてから改善点を'
      ],
      distance: '温かく安定した関係。急激な変化は避ける',
      tips: [
        '他者のニーズに敏感',
        '批判に傷つきやすい',
        '安定と調和を好む'
      ]
    }
  },
  ESTJ: {
    type: 'ESTJ',
    title: '幹部',
    description: '組織と伝統を重んじる生まれながらの管理者',
    strengths: ['組織力', 'リーダーシップ', '決断力', '実行力'],
    communicationStyle: {
      praise: [
        '成果とリーダーシップを評価',
        '「あなたの組織力で効率が大幅に向上しました」',
        '具体的な業績を認める'
      ],
      feedback: [
        '率直で明確なコミュニケーション',
        '事実とデータに基づく',
        '改善による効率向上を強調'
      ],
      distance: '明確な役割と責任のあるプロフェッショナルな関係',
      tips: [
        '結果を重視',
        '効率と生産性が大切',
        '明確な指揮系統を好む'
      ]
    }
  },
  ESFJ: {
    type: 'ESFJ',
    title: '領事',
    description: '協調性があり、他者を気遣う社交的なサポーター',
    strengths: ['協調性', '責任感', '実践的', '思いやり'],
    communicationStyle: {
      praise: [
        'チームへの貢献を認める',
        '「あなたの協力でチームがまとまっています」',
        '人間関係構築の才能を評価'
      ],
      feedback: [
        '感謝を示してから建設的に',
        'チーム全体の利益を説明',
        '具体的で実践的なアドバイス'
      ],
      distance: '親しみやすく協力的な関係。調和を保つ',
      tips: [
        '調和と協力を重視',
        '承認と感謝が重要',
        '具体的な指示を好む'
      ]
    }
  },
  ISTP: {
    type: 'ISTP',
    title: '巨匠',
    description: '実践的で論理的、手を動かして学ぶ',
    strengths: ['実践的', '論理的', '適応力', '独立性'],
    communicationStyle: {
      praise: [
        '技術的スキルと問題解決を評価',
        '「あなたの実践的な解決策が効果的でした」',
        '具体的な成果を認める'
      ],
      feedback: [
        '簡潔で論理的に',
        '実践的な改善策を提示',
        '自主性を尊重'
      ],
      distance: '必要最小限の交流。個人の空間を尊重',
      tips: [
        '行動で示すタイプ',
        '長い説明は苦手',
        '実践的な学習を好む'
      ]
    }
  },
  ISFP: {
    type: 'ISFP',
    title: '冒険家',
    description: '柔軟で魅力的、静かに情熱的',
    strengths: ['創造性', '柔軟性', '観察力', '美的センス'],
    communicationStyle: {
      praise: [
        '個性と創造性を認める',
        '「あなたのセンスが素晴らしい成果を生みました」',
        '個人的で心のこもった感謝'
      ],
      feedback: [
        '優しく個人的なアプローチ',
        'プライベートな環境で',
        '選択肢を提供しながら'
      ],
      distance: '穏やかで自然な関係。プレッシャーをかけない',
      tips: [
        '感情を内に秘める傾向',
        '競争は好まない',
        '美と調和を大切にする'
      ]
    }
  },
  ESTP: {
    type: 'ESTP',
    title: '起業家',
    description: '行動的でエネルギッシュ、現実的な問題解決者',
    strengths: ['行動力', '適応力', '観察力', '実践的'],
    communicationStyle: {
      praise: [
        '迅速な行動と成果を評価',
        '「あなたの素早い対応で問題が解決しました」',
        '具体的な行動を認める'
      ],
      feedback: [
        '率直で簡潔に',
        '実例を使って説明',
        'すぐに実践できる改善策'
      ],
      distance: 'カジュアルで活発な関係。形式張らない',
      tips: [
        '行動重視',
        '理論より実践',
        '退屈を嫌う'
      ]
    }
  },
  ESFP: {
    type: 'ESFP',
    title: 'エンターテイナー',
    description: '社交的で楽観的、人生を楽しむ',
    strengths: ['社交性', '適応力', '熱意', '実践的'],
    communicationStyle: {
      praise: [
        'エネルギーと前向きさを評価',
        '「あなたの明るさがチームを元気にしています」',
        '人を楽しませる才能を認める'
      ],
      feedback: [
        '前向きで励ましながら',
        '具体例を交えて',
        '楽しく学べる方法で'
      ],
      distance: '温かく楽しい関係。堅苦しさは避ける',
      tips: [
        '楽しさと実践を重視',
        '長期計画は苦手',
        '人との交流を楽しむ'
      ]
    }
  }
};

export function getMBTIProfile(type: MBTIType | null | undefined): MBTIProfile | null {
  if (!type) return null;
  return MBTI_PROFILES[type] || null;
}