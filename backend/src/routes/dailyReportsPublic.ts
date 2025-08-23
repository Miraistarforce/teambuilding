import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 公開日報提出（QRコード経由）
router.post('/submit', async (req, res) => {
  try {
    const { storeId, staffId, date, ...formData } = req.body;
    
    // Verify store exists and QR is enabled
    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) },
      select: { qrEnabled: true },
    });

    if (!store || !store.qrEnabled) {
      return res.status(403).json({ error: 'QR submission is disabled for this store' });
    }

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Check for existing report
    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        staffId: parseInt(staffId),
        date: reportDate,
      },
    });

    let report;
    if (existingReport) {
      // Update existing report
      report = await prisma.dailyReport.update({
        where: {
          id: existingReport.id,
        },
        data: {
          content: formData.content || '',
          formData: JSON.stringify(formData),
          isRead: false,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new report
      report = await prisma.dailyReport.create({
        data: {
          staffId: parseInt(staffId),
          storeId: parseInt(storeId),
          date: reportDate,
          content: formData.content || '',
          formData: JSON.stringify(formData),
          isRead: false,
        },
      });
    }

    res.json({
      id: report.id,
      message: '日報を送信しました',
    });
  } catch (error) {
    console.error('公開日報作成エラー:', error);
    res.status(500).json({ error: '日報の送信に失敗しました' });
  }
});

export default router;