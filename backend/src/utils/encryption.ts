import CryptoJS from 'crypto-js';
import { logger } from './logger';

// 暗号化キー（環境変数から取得、なければデフォルト値）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key';

/**
 * 文字列を暗号化
 */
export function encrypt(text: string): string {
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('暗号化に失敗しました');
  }
}

/**
 * 暗号化された文字列を復号化
 */
export function decrypt(encryptedText: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    logger.error('Decryption failed:', error);
    throw new Error('復号化に失敗しました');
  }
}

/**
 * APIキーを暗号化して保存用の形式にする
 */
export function encryptApiKey(apiKey: string): string {
  // APIキーの先頭数文字をマスク表示用に保存
  const prefix = apiKey.substring(0, 8);
  const encrypted = encrypt(apiKey);
  
  return JSON.stringify({
    prefix,
    encrypted,
    encryptedAt: new Date().toISOString()
  });
}

/**
 * 暗号化されたAPIキーを復号化
 */
export function decryptApiKey(encryptedData: string): string {
  try {
    const data = JSON.parse(encryptedData);
    return decrypt(data.encrypted);
  } catch (error) {
    logger.error('API key decryption failed:', error);
    throw new Error('APIキーの復号化に失敗しました');
  }
}

/**
 * 環境変数から暗号化されたAPIキーを取得
 */
export function getDecryptedApiKey(envKey: string): string | undefined {
  const encryptedValue = process.env[envKey];
  if (!encryptedValue) return undefined;
  
  // 暗号化されているかチェック（JSONフォーマットの場合）
  if (encryptedValue.startsWith('{') && encryptedValue.includes('encrypted')) {
    return decryptApiKey(encryptedValue);
  }
  
  // 暗号化されていない場合はそのまま返す（開発環境用）
  return encryptedValue;
}

/**
 * APIキーをマスク表示用に変換
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return '****';
  
  const visibleStart = apiKey.substring(0, 4);
  const visibleEnd = apiKey.substring(apiKey.length - 4);
  const maskedMiddle = '*'.repeat(Math.min(apiKey.length - 8, 20));
  
  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

/**
 * セキュアランダム文字列の生成
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  // Node.js環境
  const crypto = require('crypto');
  crypto.randomFillSync(array);
  
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}