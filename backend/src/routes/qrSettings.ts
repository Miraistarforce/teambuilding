import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middlewares/auth';
import crypto from 'crypto';

const router = Router();

// QR設定を取得
router.get('/:storeId', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) },
      select: {
        id: true,
        name: true,
        qrEnabled: true,
        qrToken: true,
      },
    });

    if (!store) {
      return res.status(404).json({ error: 'Store not found' });
    }

    // QRトークンがない場合は生成
    if (!store.qrToken) {
      const token = crypto.randomBytes(32).toString('hex');
      await prisma.store.update({
        where: { id: parseInt(storeId) },
        data: { qrToken: token },
      });
      store.qrToken = token;
    }

    res.json(store);
  } catch (error) {
    console.error('QR設定取得エラー:', error);
    res.status(500).json({ error: 'QR設定の取得に失敗しました' });
  }
});

// QR設定を更新（有効/無効の切り替え）
router.put('/:storeId', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const { qrEnabled } = req.body;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const store = await prisma.store.update({
      where: { id: parseInt(storeId) },
      data: { qrEnabled },
      select: {
        id: true,
        qrEnabled: true,
        qrToken: true,
      },
    });

    res.json(store);
  } catch (error) {
    console.error('QR設定更新エラー:', error);
    res.status(500).json({ error: 'QR設定の更新に失敗しました' });
  }
});

// QRトークンを再生成
router.post('/:storeId/regenerate', authenticate, async (req, res) => {
  try {
    const { storeId } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const store = await prisma.store.update({
      where: { id: parseInt(storeId) },
      data: { qrToken: token },
      select: {
        id: true,
        qrEnabled: true,
        qrToken: true,
      },
    });

    res.json(store);
  } catch (error) {
    console.error('QRトークン再生成エラー:', error);
    res.status(500).json({ error: 'QRトークンの再生成に失敗しました' });
  }
});

// QRコードから日報フォーマットと店舗情報を取得（認証不要）
router.get('/public/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const store = await prisma.store.findUnique({
      where: { qrToken: token },
      include: {
        dailyReportFormat: true,
        staff: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!store || !store.qrEnabled) {
      return res.status(404).json({ error: 'Invalid or disabled QR code' });
    }

    res.json({
      storeId: store.id,
      storeName: store.name,
      format: store.dailyReportFormat,
      staff: store.staff,
    });
  } catch (error) {
    console.error('QR公開情報取得エラー:', error);
    res.status(500).json({ error: '情報の取得に失敗しました' });
  }
});

export default router;