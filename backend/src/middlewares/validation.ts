import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

// 共通バリデーション関数
export const validators = {
  // ID検証
  isValidId: (id: any): boolean => {
    return !isNaN(id) && parseInt(id) > 0;
  },

  // 文字列長検証
  isValidLength: (str: string, min: number, max: number): boolean => {
    return str.length >= min && str.length <= max;
  },

  // パスワード強度検証
  isStrongPassword: (password: string): boolean => {
    // 最低8文字、英数字を含む
    return password.length >= 8 && 
           /[a-zA-Z]/.test(password) && 
           /[0-9]/.test(password);
  },

  // メール形式検証
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // 日付形式検証
  isValidDate: (date: string): boolean => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  },

  // 時給検証（0以上の整数）
  isValidWage: (wage: any): boolean => {
    return !isNaN(wage) && parseInt(wage) >= 0;
  },

  // MBTIタイプ検証
  isValidMBTI: (mbti: string): boolean => {
    const validTypes = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP',
      'INFJ', 'INFP', 'ENFJ', 'ENFP',
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
      'ISTP', 'ISFP', 'ESTP', 'ESFP'
    ];
    return validTypes.includes(mbti.toUpperCase());
  },

  // SQLインジェクション対策
  sanitizeInput: (input: string): string => {
    return input.replace(/[;<>'"\\]/g, '');
  },

  // XSS対策
  escapeHtml: (text: string): string => {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
};

// バリデーションミドルウェア
export const validateRequest = (validationRules: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // パラメータ検証
      if (validationRules.params) {
        for (const [key, rules] of Object.entries(validationRules.params)) {
          const value = req.params[key];
          if (!validateField(value, rules as any, key)) {
            throw new AppError(`Invalid parameter: ${key}`, 400);
          }
        }
      }

      // ボディ検証
      if (validationRules.body) {
        for (const [key, rules] of Object.entries(validationRules.body)) {
          const value = req.body[key];
          if (!validateField(value, rules as any, key)) {
            throw new AppError(`Invalid field: ${key}`, 400);
          }
        }
      }

      // クエリ検証
      if (validationRules.query) {
        for (const [key, rules] of Object.entries(validationRules.query)) {
          const value = req.query[key];
          if (!validateField(value, rules as any, key)) {
            throw new AppError(`Invalid query parameter: ${key}`, 400);
          }
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// フィールド検証
function validateField(value: any, rules: any, fieldName: string): boolean {
  // 必須チェック
  if (rules.required && (value === undefined || value === null || value === '')) {
    return false;
  }

  // 値が存在しない場合で必須でない場合はOK
  if (!rules.required && (value === undefined || value === null || value === '')) {
    return true;
  }

  // 型チェック
  if (rules.type) {
    switch (rules.type) {
      case 'number':
        if (isNaN(value)) return false;
        break;
      case 'string':
        if (typeof value !== 'string') return false;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
      case 'date':
        if (!validators.isValidDate(value)) return false;
        break;
    }
  }

  // 最小値・最大値チェック
  if (rules.min !== undefined && Number(value) < rules.min) {
    return false;
  }
  if (rules.max !== undefined && Number(value) > rules.max) {
    return false;
  }

  // 文字列長チェック
  if (rules.minLength !== undefined && value.length < rules.minLength) {
    return false;
  }
  if (rules.maxLength !== undefined && value.length > rules.maxLength) {
    return false;
  }

  // パターンチェック
  if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
    return false;
  }

  // カスタムバリデーション
  if (rules.custom && !rules.custom(value)) {
    return false;
  }

  return true;
}

// よく使うバリデーションルール
export const commonValidations = {
  // スタッフ作成・更新
  staff: {
    body: {
      name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      hourlyWage: { required: true, type: 'number', min: 0, max: 100000 },
      holidayAllowance: { type: 'number', min: 0, max: 10000 },
      overtimeRate: { type: 'number', min: 1.0, max: 3.0 },
      otherAllowance: { type: 'number', min: 0, max: 1000000 },
      mbtiType: { type: 'string', custom: validators.isValidMBTI }
    }
  },

  // 店舗作成・更新
  store: {
    body: {
      name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
      managerPassword: { type: 'string', custom: validators.isStrongPassword },
      ownerPassword: { type: 'string', custom: validators.isStrongPassword }
    }
  },

  // 日報作成
  dailyReport: {
    body: {
      content: { required: true, type: 'string', minLength: 1, maxLength: 5000 },
      date: { required: true, type: 'date' }
    }
  },

  // IDパラメータ
  idParam: {
    params: {
      id: { required: true, type: 'number', min: 1 }
    }
  },

  // ページネーション
  pagination: {
    query: {
      page: { type: 'number', min: 1 },
      limit: { type: 'number', min: 1, max: 100 }
    }
  }
};