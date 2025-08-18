import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface DailyReportCommentProps {
  reportId: number;
  storeId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const emojis = ['🥹', '🙇', '☺️', '😊', '💯', '👏', '👍', '🎉'];

export default function DailyReportComment({ reportId, storeId, onClose, onSuccess }: DailyReportCommentProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [comment, setComment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [hasBonus, setHasBonus] = useState(false);

  // テンプレート取得
  const { data: templates } = useQuery({
    queryKey: ['comment-templates', storeId],
    queryFn: async () => {
      const response = await axios.get(
        `http://localhost:3001/api/comment-templates`,
        {
          params: { storeId },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data as { id: number; template: string }[];
    },
  });

  // コメント送信
  const submitMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `http://localhost:3001/api/daily-reports/${reportId}/comment`,
        {
          emoji: selectedEmoji,
          comment,
          hasBonus,
        },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error) => {
      console.error('コメント送信エラー:', error);
      alert('コメントの送信に失敗しました');
    },
  });

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates?.find(t => t.id.toString() === templateId);
    if (template) {
      setComment(template.template);
    }
  };

  const handleSubmit = () => {
    if (!selectedEmoji && !comment.trim()) {
      alert('顔スタンプかコメントのいずれかを入力してください');
      return;
    }
    submitMutation.mutate();
  };

  const handleBonus = () => {
    setHasBonus(true);
    submitMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-background-main rounded-lg shadow-xl p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">日報にコメント</h3>
          <button
            onClick={onClose}
            className="text-text-sub hover:text-text-main transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 顔スタンプ選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">顔スタンプを選択</label>
          <div className="flex gap-3 flex-wrap">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)}
                className={`text-3xl p-2 rounded-lg transition-all ${
                  selectedEmoji === emoji
                    ? 'bg-accent-primary/20 ring-2 ring-accent-primary transform scale-110'
                    : 'hover:bg-background-sub'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* コメント入力 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">コメント</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="よく頑張りました！これからも期待しています..."
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
            rows={4}
          />
        </div>

        {/* テンプレート選択 */}
        {templates && templates.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">テンプレート</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">テンプレートを選択...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.template.substring(0, 50)}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex-1 bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
          >
            {submitMutation.isPending ? '送信中...' : 'コメントを送信'}
          </button>
          <button
            onClick={handleBonus}
            disabled={submitMutation.isPending}
            className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 shadow-lg"
          >
            {submitMutation.isPending ? '送信中...' : '🎁 賞与をプレゼント'}
          </button>
        </div>
      </div>
    </div>
  );
}