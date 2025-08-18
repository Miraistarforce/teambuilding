import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middlewares/auth';

const router = Router();
const prisma = new PrismaClient();

// テンプレート一覧を取得
router.get('/', authenticate, async (req, res) => {
  try {
    const { storeId } = req.query;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const templates = await prisma.commentTemplate.findMany({
      where: {
        storeId: parseInt(storeId as string),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(templates);
  } catch (error) {
    console.error('テンプレート取得エラー:', error);
    res.status(500).json({ error: 'テンプレートの取得に失敗しました' });
  }
});

// テンプレートを作成
router.post('/', authenticate, async (req, res) => {
  try {
    const { storeId, template } = req.body;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const newTemplate = await prisma.commentTemplate.create({
      data: {
        storeId: parseInt(storeId),
        template,
      },
    });

    res.json(newTemplate);
  } catch (error) {
    console.error('テンプレート作成エラー:', error);
    res.status(500).json({ error: 'テンプレートの作成に失敗しました' });
  }
});

// テンプレートを削除
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await prisma.commentTemplate.delete({
      where: {
        id: parseInt(id),
      },
    });

    res.json({ message: 'テンプレートを削除しました' });
  } catch (error) {
    console.error('テンプレート削除エラー:', error);
    res.status(500).json({ error: 'テンプレートの削除に失敗しました' });
  }
});

export default router;