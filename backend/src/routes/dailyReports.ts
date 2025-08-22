import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middlewares/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/daily-reports');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Only allow images
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

// 日報を作成
router.post('/', authenticate, async (req, res) => {
  try {
    const { staffId, storeId, content, formData, date } = req.body;
    const user = (req as any).user;

    // 権限のチェック（全ロール許可）
    // 日報は全ロールで作成可能とする

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // 既存の日報をチェック
    const existingReport = await prisma.dailyReport.findFirst({
      where: {
        staffId: parseInt(staffId),
        date: reportDate,
      },
    });

    let report;
    if (existingReport) {
      // 既存の日報を更新
      report = await prisma.dailyReport.update({
        where: {
          id: existingReport.id,
        },
        data: {
          content,
          formData: formData ? JSON.stringify(formData) : null,
          isRead: false,
          updatedAt: new Date(),
        },
        include: {
          staff: {
            select: {
              name: true,
            },
          },
        },
      });
    } else {
      // 新規作成
      report = await prisma.dailyReport.create({
        data: {
          staffId: parseInt(staffId),
          storeId: parseInt(storeId),
          date: reportDate,
          content,
          formData: formData ? JSON.stringify(formData) : null,
          isRead: false,
        },
        include: {
          staff: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    res.json({
      id: report.id,
      message: '日報を送信しました',
    });
  } catch (error) {
    console.error('日報作成エラー:', error);
    res.status(500).json({ error: '日報の作成に失敗しました' });
  }
});

// 日報を作成（画像付き）
router.post('/with-images', authenticate, upload.any(), async (req, res) => {
  try {
    const { staffId, storeId, content, formData: formDataString, date } = req.body;
    const user = (req as any).user;
    const files = req.files as Express.Multer.File[];

    const reportDate = new Date(date);
    reportDate.setHours(0, 0, 0, 0);

    // Parse formData and add image URLs
    let formDataObj = formDataString ? JSON.parse(formDataString) : null;
    
    if (formDataObj && files) {
      // Map uploaded files to their field IDs
      files.forEach(file => {
        const fieldMatch = file.fieldname.match(/^image_(.+)$/);
        if (fieldMatch) {
          const fieldId = fieldMatch[1];
          // Store the URL path for the image (replacing the placeholder)
          if (formDataObj[fieldId] === 'pending_upload') {
            formDataObj[fieldId] = `/uploads/daily-reports/${file.filename}`;
          }
        }
      });
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
          content,
          formData: formDataObj ? JSON.stringify(formDataObj) : null,
          isRead: false,
          updatedAt: new Date(),
        },
        include: {
          staff: {
            select: {
              name: true,
            },
          },
        },
      });
    } else {
      // Create new report
      report = await prisma.dailyReport.create({
        data: {
          staffId: parseInt(staffId),
          storeId: parseInt(storeId),
          date: reportDate,
          content,
          formData: formDataObj ? JSON.stringify(formDataObj) : null,
          isRead: false,
        },
        include: {
          staff: {
            select: {
              name: true,
            },
          },
        },
      });
    }

    res.json({
      id: report.id,
      message: '日報を送信しました',
    });
  } catch (error) {
    console.error('日報作成エラー（画像付き）:', error);
    res.status(500).json({ error: '日報の作成に失敗しました' });
  }
});

// 日報一覧を取得
router.get('/list', authenticate, async (req, res) => {
  try {
    const { storeId, date } = req.query;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // whereの条件を動的に構築
    const whereCondition: any = {
      storeId: parseInt(storeId as string),
    };

    // 日付が指定されている場合のみフィルタリング
    if (date && date !== 'all') {
      const queryDate = new Date(date as string);
      queryDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(queryDate);
      endDate.setHours(23, 59, 59, 999);

      whereCondition.date = {
        gte: queryDate,
        lte: endDate,
      };
    }

    // 日報を取得
    const reports = await prisma.dailyReport.findMany({
      where: whereCondition,
      include: {
        staff: {
          select: {
            name: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // formDataがある場合はパースする
    const parsedReports = reports.map(report => ({
      ...report,
      formData: report.formData ? JSON.parse(report.formData) : null,
    }));

    res.json(parsedReports);
  } catch (error) {
    console.error('日報一覧取得エラー:', error);
    res.status(500).json({ error: '日報の取得に失敗しました' });
  }
});

// 日報を既読にする
router.patch('/:reportId/read', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await prisma.dailyReport.update({
      where: {
        id: parseInt(reportId),
      },
      data: {
        isRead: true,
      },
    });

    res.json({ message: '既読にしました' });
  } catch (error) {
    console.error('既読更新エラー:', error);
    res.status(500).json({ error: '既読の更新に失敗しました' });
  }
});

// スタッフの日報履歴を取得
router.get('/staff/:staffId', authenticate, async (req, res) => {
  try {
    const { staffId } = req.params;
    const user = (req as any).user;

    // 権限チェック（全ロール許可）

    const reports = await prisma.dailyReport.findMany({
      where: {
        staffId: parseInt(staffId),
      },
      orderBy: {
        date: 'desc',
      },
      take: 365, // 最新365件（1年分）
    });

    res.json(reports);
  } catch (error) {
    console.error('日報履歴取得エラー:', error);
    res.status(500).json({ error: '日報履歴の取得に失敗しました' });
  }
});

// 全スタッフの日報を取得（スタッフ用）
router.get('/all-staff', authenticate, async (req, res) => {
  try {
    const { storeId } = req.query;
    const user = (req as any).user;

    const reports = await prisma.dailyReport.findMany({
      where: {
        storeId: parseInt(storeId as string),
      },
      include: {
        staff: {
          select: {
            name: true,
          },
        },
        comments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 365, // 最新365件（1年分）
    });

    // formDataがある場合はパースする
    const parsedReports = reports.map(report => ({
      ...report,
      formData: report.formData ? JSON.parse(report.formData) : null,
    }));

    // 日報フォーマットも取得
    const reportFormat = await prisma.dailyReportFormat.findUnique({
      where: {
        storeId: parseInt(storeId as string),
      },
    });

    const format = reportFormat ? {
      ...reportFormat,
      fields: JSON.parse(reportFormat.fields),
    } : null;

    res.json({ reports: parsedReports, format });
  } catch (error) {
    console.error('全スタッフ日報取得エラー:', error);
    res.status(500).json({ error: '日報の取得に失敗しました' });
  }
});

// 画像を削除
router.delete('/images/:imageUrl(*)', authenticate, async (req, res) => {
  try {
    const { imageUrl } = req.params;
    const { storeId } = req.query;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // 画像URLから実際のファイルパスを取得
    const fileName = imageUrl.split('/').pop();
    const filePath = path.join(__dirname, '../../uploads/daily-reports', fileName || '');

    // ファイルを削除
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // データベースから画像URLを削除
    const reports = await prisma.dailyReport.findMany({
      where: {
        storeId: parseInt(storeId as string),
        formData: {
          contains: imageUrl
        }
      }
    });

    // 各レポートから画像URLを削除
    for (const report of reports) {
      if (report.formData) {
        const formData = JSON.parse(report.formData);
        for (const key in formData) {
          if (formData[key] === `/uploads/daily-reports/${fileName}`) {
            formData[key] = '';
          }
        }
        await prisma.dailyReport.update({
          where: { id: report.id },
          data: { formData: JSON.stringify(formData) }
        });
      }
    }

    res.json({ success: true, message: '画像を削除しました' });
  } catch (error) {
    console.error('画像削除エラー:', error);
    res.status(500).json({ error: '画像の削除に失敗しました' });
  }
});

// 画像一覧を取得
router.get('/images', authenticate, async (req, res) => {
  try {
    const { storeId } = req.query;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    // Get all reports with images
    const reports = await prisma.dailyReport.findMany({
      where: {
        storeId: parseInt(storeId as string),
        formData: {
          not: null,
        },
      },
      include: {
        staff: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Extract images from formData
    const images: any[] = [];
    reports.forEach(report => {
      if (report.formData) {
        const formData = JSON.parse(report.formData);
        
        // Check each field for image URLs
        Object.entries(formData).forEach(([fieldId, value]) => {
          if (typeof value === 'string' && value.startsWith('/uploads/daily-reports/')) {
            images.push({
              id: `${report.id}_${fieldId}`,
              reportId: report.id,
              staffName: report.staff.name,
              date: report.date,
              createdAt: report.createdAt,
              imageUrl: value,
              comment: formData[`${fieldId}_comment`] || '',
            });
          }
        });
      }
    });

    res.json(images);
  } catch (error) {
    console.error('画像一覧取得エラー:', error);
    res.status(500).json({ error: '画像の取得に失敗しました' });
  }
});

// 日報にコメントを追加
router.post('/:reportId/comment', authenticate, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { emoji, comment, hasBonus } = req.body;
    const user = (req as any).user;

    // 権限チェック（manager/ownerのみ）
    if (user.role !== 'manager' && user.role !== 'owner') {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const newComment = await prisma.dailyReportComment.create({
      data: {
        reportId: parseInt(reportId),
        emoji: emoji || null,
        comment: comment || null,
        hasBonus,
        createdBy: user.role,
      },
    });

    res.json(newComment);
  } catch (error) {
    console.error('コメント追加エラー:', error);
    res.status(500).json({ error: 'コメントの追加に失敗しました' });
  }
});

export default router;