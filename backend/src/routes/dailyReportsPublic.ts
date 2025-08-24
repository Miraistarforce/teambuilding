import { Router } from 'express';
import prisma from '../lib/prisma';
import multer from 'multer';
import { uploadImage, getPublicUrl } from '../lib/supabase';

const router = Router();

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// 公開日報提出（QRコード経由）
router.post('/submit', upload.any(), async (req, res) => {
  try {
    const { storeId, staffId, date, ...formData } = req.body;
    const files = req.files as Express.Multer.File[];
    
    // Verify store exists (skip QR check for now)
    const store = await prisma.store.findUnique({
      where: { id: parseInt(storeId) },
      select: { id: true },
    });

    if (!store) {
      return res.status(403).json({ error: 'Store not found' });
    }

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Process uploaded images
    const processedFormData = { ...formData };
    if (files && files.length > 0) {
      for (const file of files) {
        // Extract field name from the file fieldname (e.g., image_field1 -> field1)
        const fieldName = file.fieldname.replace('image_', '');
        
        // Upload to Supabase
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileName = `daily-reports/${uniqueSuffix}-${file.originalname}`;
        const uploadPath = await uploadImage(file.buffer, fileName, file.mimetype);
        
        if (uploadPath) {
          // Store the Supabase path in formData
          processedFormData[`${fieldName}_image`] = uploadPath;
        }
      }
    }

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
          content: processedFormData.content || '',
          formData: JSON.stringify(processedFormData),
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
          content: processedFormData.content || '',
          formData: JSON.stringify(processedFormData),
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