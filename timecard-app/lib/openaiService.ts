import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeDailyReport = async (content: string) => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "あなたは日報を分析するアシスタントです。日報の内容を分析し、ポジティブな点、改善点、アドバイスを簡潔に提供してください。"
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI analysis error:', error);
    return null;
  }
};

export const analyzeTension = async (content: string) => {
  if (!process.env.OPENAI_API_KEY) {
    return { score: 0, keywords: [] };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `日報のテンションを分析してください。
-1.0から1.0のスコアで評価してください。
-1.0: 非常にネガティブ
0: 中立
1.0: 非常にポジティブ

また、テンションを判断した主要なキーワードを抽出してください。
JSON形式で返してください: {"score": 0.5, "keywords": ["楽しい", "充実"]}`
        },
        {
          role: "user",
          content: content
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    const result = JSON.parse(response.choices[0].message.content || '{"score": 0, "keywords": []}');
    return result;
  } catch (error) {
    console.error('Tension analysis error:', error);
    return { score: 0, keywords: [] };
  }
};