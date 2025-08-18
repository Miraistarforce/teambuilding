import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(num);
}

export const commentTemplates = [
  'ありがとうございます！',
  'お疲れ様でした！',
  '助かりました！',
  '次も期待してます！',
  'ナイス改善案！',
];

export const faceStamps = [
  '😊', '😄', '🎉', '👏', '💪', '✨',
  '🌟', '👍', '🔥', '💯', '🎊', '🏆',
];