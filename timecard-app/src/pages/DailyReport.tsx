import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { staffApi } from '../lib/api';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { API_BASE_URL } from '../config/api';

interface ReportField {
  id: string;
  type: 'text' | 'rating' | 'image';
  title: string;
  placeholder?: string;
  required?: boolean;
  maxRating?: number;
}

interface DailyReportProps {
  store: { id: number; name: string };
}

export default function DailyReport({ store }: DailyReportProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [reportContent, setReportContent] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [useNewFormat, setUseNewFormat] = useState(false);

  const { data: staffList } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: () => staffApi.getByStore(store.id),
  });

  // 日報フォーマット取得
  const { data: reportFormat } = useQuery({
    queryKey: ['report-format', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/report-format/${store.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
  });

  useEffect(() => {
    if (reportFormat?.fields && reportFormat.fields.length > 0) {
      setUseNewFormat(true);
      // フォームデータの初期化
      const initialData: Record<string, any> = {};
      reportFormat.fields.forEach((field: ReportField) => {
        if (field.type === 'rating') {
          initialData[field.id] = 3; // デフォルト値
        } else if (field.type === 'image') {
          initialData[field.id] = null;
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    }
  }, [reportFormat]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true);
      
      // Check if we have images to upload
      const hasImages = Object.keys(imageFiles).length > 0;
      
      if (hasImages) {
        // Use FormData for image uploads
        const formDataPayload = new FormData();
        formDataPayload.append('staffId', String(selectedStaffId));
        formDataPayload.append('storeId', String(store.id));
        formDataPayload.append('date', new Date().toISOString());
        
        // Add text data
        const textData = { ...formData };
        // Add image filenames to formData
        Object.keys(imageFiles).forEach(fieldId => {
          textData[fieldId] = `image_${fieldId}_${Date.now()}.jpg`;
        });
        
        formDataPayload.append('content', useNewFormat ? JSON.stringify(textData) : reportContent);
        formDataPayload.append('formData', JSON.stringify(useNewFormat ? textData : null));
        
        // Add image files
        Object.entries(imageFiles).forEach(([fieldId, file]) => {
          formDataPayload.append(`image_${fieldId}`, file);
        });
        
        const response = await axios.post(
          `${API_BASE_URL}/daily-reports/with-images`,
          formDataPayload,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        // テンション分析を実行
        const reportText = useNewFormat 
          ? Object.values(formData).filter(v => typeof v === 'string').join(' ')
          : reportContent;
        
        try {
          await axios.post(
            `${API_BASE_URL}/tension/analyze`,
            {
              reportId: response.data.id,
              text: reportText
            },
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
              },
            }
          );
        } catch (error) {
          console.error('テンション分析エラー:', error);
        }
        
        return response.data;
      } else {
        // Regular submission without images
        const response = await axios.post(
          `${API_BASE_URL}/daily-reports`,
          {
            staffId: selectedStaffId,
            storeId: store.id,
            content: useNewFormat ? JSON.stringify(formData) : reportContent,
            formData: useNewFormat ? formData : null,
            date: new Date().toISOString(),
          },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
            },
          }
        );
        
        // テンション分析を実行
        const reportText = useNewFormat 
          ? Object.values(formData).filter(v => typeof v === 'string').join(' ')
          : reportContent;
        
        try {
          await axios.post(
            `${API_BASE_URL}/tension/analyze`,
            {
              reportId: response.data.id,
              text: reportText
            },
            {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
              },
            }
          );
        } catch (error) {
          console.error('テンション分析エラー:', error);
        }
        
        return response.data;
      }
    },
    onSuccess: () => {
      setIsSubmitting(false);
      setSuccessMessage('日報を送信しました');
      setReportContent('');
      
      // フォームデータをリセット
      if (reportFormat?.fields) {
        const resetData: Record<string, any> = {};
        reportFormat.fields.forEach((field: ReportField) => {
          if (field.type === 'rating') {
            resetData[field.id] = 3;
          } else if (field.type === 'image') {
            resetData[field.id] = null;
          } else {
            resetData[field.id] = '';
          }
        });
        setFormData(resetData);
        setImageFiles({}); // Clear image files
      }
      
      // 3秒後にメッセージを消す
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      console.error('日報送信エラー:', error);
      
      // 既に今日の日報が提出されている場合
      if (error.response?.status === 409) {
        alert('本日の日報は既に提出されています');
      } else {
        alert('日報の送信に失敗しました');
      }
    },
  });

  const handleSubmit = () => {
    if (!selectedStaffId) {
      alert('スタッフを選択してください');
      return;
    }
    
    if (useNewFormat) {
      // 新フォーマットの場合、必須フィールドをチェック
      const hasRequiredFields = reportFormat?.fields?.some((field: ReportField) => {
        if (field.required && field.type === 'text') {
          return !formData[field.id] || formData[field.id].trim() === '';
        }
        return false;
      });
      
      if (hasRequiredFields) {
        alert('必須項目を入力してください');
        return;
      }
    } else {
      // 旧フォーマットの場合
      if (!reportContent.trim()) {
        alert('日報の内容を入力してください');
        return;
      }
    }
    
    submitMutation.mutate();
  };

  const renderStarRating = (field: ReportField) => {
    const maxRating = field.maxRating || 5;
    const currentRating = formData[field.id] || 0;

    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: maxRating }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setFormData({ ...formData, [field.id]: i + 1 })}
            className={`text-3xl transition-colors ${
              i < currentRating
                ? 'text-yellow-400'
                : 'text-gray-300'
            } hover:text-yellow-500`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-text-sub">
          {currentRating} / {maxRating}
        </span>
      </div>
    );
  };

  const today = format(new Date(), 'yyyy年M月d日(E)', { locale: ja });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-background-main rounded-lg shadow-subtle p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">日報作成</h2>
          <p className="text-sm text-text-sub">{today}</p>
        </div>

        {/* スタッフ選択 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">スタッフ選択</label>
          <select
            value={selectedStaffId || ''}
            onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            disabled={isSubmitting}
          >
            <option value="">スタッフを選択してください</option>
            {staffList?.map((staff: any) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        {/* 日報内容入力 */}
        {useNewFormat && reportFormat?.fields ? (
          <div className="mb-6 space-y-4">
            <h3 className="text-sm font-semibold mb-3">日報内容</h3>
            {reportFormat.fields.map((field: ReportField) => (
              <div key={field.id} className="">
                <label className="block text-sm font-medium mb-2">
                  {field.title}
                  {field.required && <span className="text-accent-error ml-1">*</span>}
                </label>
                {field.type === 'text' ? (
                  <>
                    <textarea
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder={field.placeholder || ''}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                      rows={4}
                      disabled={isSubmitting}
                    />
                    <p className="text-xs text-text-sub mt-1">
                      {(formData[field.id] || '').length} 文字
                    </p>
                  </>
                ) : field.type === 'rating' ? (
                  renderStarRating(field)
                ) : field.type === 'image' ? (
                  <div className="space-y-2">
                    {formData[field.id] && (
                      <div className="text-sm text-text-sub">
                        コメント: {formData[field.id]}
                      </div>
                    )}
                    <input
                      type="text"
                      value={formData[field.id] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                      placeholder="画像についてのコメント（任意）"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      disabled={isSubmitting}
                    />
                    <div className="border-2 border-dashed border-border-default rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFiles({ ...imageFiles, [field.id]: file });
                          }
                        }}
                        className="w-full"
                        disabled={isSubmitting}
                      />
                      {imageFiles[field.id] && (
                        <p className="mt-2 text-sm text-text-sub">
                          選択済み: {imageFiles[field.id].name}
                        </p>
                      )}
                    </div>
                    {field.placeholder && (
                      <p className="text-xs text-text-sub">{field.placeholder}</p>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">日報内容</label>
            <textarea
              value={reportContent}
              onChange={(e) => setReportContent(e.target.value)}
              placeholder="今日の業務内容、気づいたこと、改善提案など..."
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              rows={10}
              disabled={isSubmitting}
            />
            <p className="text-xs text-text-sub mt-1">
              {reportContent.length} 文字
            </p>
          </div>
        )}

        {/* 送信ボタン */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || submitMutation.isPending}
          className="w-full bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
        >
          {isSubmitting || submitMutation.isPending ? '送信中...' : '日報を送信'}
        </button>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="mt-4 p-4 bg-accent-success/10 border border-accent-success rounded-lg">
            <p className="text-accent-success font-medium">{successMessage}</p>
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 p-4 bg-background-main rounded-lg">
        <h3 className="text-sm font-semibold mb-2">日報作成のポイント</h3>
        <ul className="space-y-1 text-sm text-text-sub">
          <li className="flex items-start">
            <span className="text-accent-primary mr-2">•</span>
            <span>今日の業務内容を具体的に記載してください</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-2">•</span>
            <span>困ったことや相談事項があれば記載してください</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-2">•</span>
            <span>改善提案やアイデアがあれば共有してください</span>
          </li>
          <li className="flex items-start">
            <span className="text-accent-primary mr-2">•</span>
            <span>1日1回のみ提出可能です</span>
          </li>
        </ul>
      </div>
    </div>
  );
}