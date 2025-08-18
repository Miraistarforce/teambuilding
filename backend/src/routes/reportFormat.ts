import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// 日報フォーマット取得
router.get('/:storeId', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;

    const format = await prisma.dailyReportFormat.findUnique({
      where: {
        storeId: parseInt(storeId),
      },
    });

    if (!format) {
      // デフォルトフォーマットを返す
      return res.json({
        fields: [
          {
            id: 'default-1',
            type: 'text',
            title: '今日の業務内容',
            placeholder: '今日行った業務を記入してください',
            required: true
          }
        ]
      });
    }

    res.json({
      ...format,
      fields: JSON.parse(format.fields)
    });
  } catch (error) {
    console.error('フォーマット取得エラー:', error);
    res.status(500).json({ error: 'フォーマットの取得に失敗しました' });
  }
});

// 日報フォーマット保存
router.post('/:storeId', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { fields } = req.body;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const format = await prisma.dailyReportFormat.upsert({
      where: {
        storeId: parseInt(storeId),
      },
      update: {
        fields: JSON.stringify(fields),
      },
      create: {
        storeId: parseInt(storeId),
        fields: JSON.stringify(fields),
      },
    });

    res.json({
      ...format,
      fields: JSON.parse(format.fields)
    });
  } catch (error) {
    console.error('フォーマット保存エラー:', error);
    res.status(500).json({ error: 'フォーマットの保存に失敗しました' });
  }
});

export default router;