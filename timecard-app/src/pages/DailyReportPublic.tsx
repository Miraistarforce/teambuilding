import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';

interface ReportField {
  id: string;
  type: 'text' | 'rating' | 'number' | 'image';
  title: string;
  placeholder?: string;
  maxRating?: number;
  required?: boolean;
}

interface Staff {
  id: number;
  name: string;
}

export default function DailyReportPublic() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchStoreInfo();
  }, [token]);

  const fetchStoreInfo = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/qr-settings/public/${token}`);
      setStoreInfo(response.data);
      
      // Initialize form data with default values
      const initialData: Record<string, any> = {};
      if (response.data.format?.fields) {
        const fields = JSON.parse(response.data.format.fields);
        fields.forEach((field: ReportField) => {
          if (field.type === 'rating') {
            initialData[field.id] = 3; // Default rating
          } else if (field.type === 'number') {
            initialData[field.id] = '';
          } else {
            initialData[field.id] = '';
          }
        });
      }
      setFormData(initialData);
      setLoading(false);
    } catch (err) {
      setError('このQRコードは無効か、無効化されています');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStaffId) {
      alert('スタッフを選択してください');
      return;
    }

    // Validate required fields
    if (storeInfo?.format?.fields) {
      const fields = JSON.parse(storeInfo.format.fields);
      for (const field of fields) {
        if (field.required && !formData[field.id]) {
          alert(`${field.title}を入力してください`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      // Prepare form data with images
      const submitData = new FormData();
      submitData.append('storeId', storeInfo.storeId.toString());
      submitData.append('staffId', selectedStaffId.toString());
      submitData.append('date', new Date().toISOString().split('T')[0]);
      
      // Add text data
      Object.keys(formData).forEach(key => {
        if (!key.endsWith('_preview')) {
          submitData.append(key, formData[key]);
        }
      });
      
      // Add image files
      Object.keys(imageFiles).forEach(key => {
        submitData.append(`image_${key}`, imageFiles[key]);
      });

      await axios.post(`${API_BASE_URL}/daily-reports-public/submit`, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSubmitted(true);
      setFormData({});
      setImageFiles({});
      
      // Reset form after 3 seconds
      setTimeout(() => {
        setSubmitted(false);
        setSelectedStaffId(null);
        // Re-initialize form data
        const initialData: Record<string, any> = {};
        if (storeInfo?.format?.fields) {
          const fields = JSON.parse(storeInfo.format.fields);
          fields.forEach((field: ReportField) => {
            if (field.type === 'rating') {
              initialData[field.id] = 3;
            } else {
              initialData[field.id] = '';
            }
          });
        }
        setFormData(initialData);
        setImageFiles({});
      }, 3000);
    } catch (err) {
      alert('日報の送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageChange = (fieldId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFiles({ ...imageFiles, [fieldId]: file });
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [`${fieldId}_preview`]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderField = (field: ReportField) => {
    switch (field.type) {
      case 'rating':
        return (
          <div className="flex gap-2">
            {[...Array(field.maxRating || 5)].map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFormData({ ...formData, [field.id]: i + 1 })}
                className={`w-10 h-10 rounded-full ${
                  formData[field.id] >= i + 1
                    ? 'bg-yellow-400'
                    : 'bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border rounded-lg"
            required={field.required}
          />
        );
      
      case 'image':
        return (
          <div className="space-y-2">
            <textarea
              value={formData[field.id] || ''}
              onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
              placeholder={field.placeholder || 'コメントを入力（任意）'}
              className="w-full px-4 py-2 border rounded-lg resize-none"
              rows={1}
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(field.id, e)}
                className="hidden"
                id={`image-${field.id}`}
              />
              <label
                htmlFor={`image-${field.id}`}
                className="cursor-pointer block text-center py-2"
              >
                {formData[`${field.id}_preview`] ? (
                  <div>
                    <img 
                      src={formData[`${field.id}_preview`]} 
                      alt="プレビュー" 
                      className="max-h-24 mx-auto mb-1"
                    />
                    <p className="text-sm text-blue-600">画像を変更</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <p className="text-sm text-gray-600">画像を選択</p>
                  </div>
                )}
              </label>
            </div>
          </div>
        );
      
      default:
        return (
          <textarea
            value={formData[field.id] || ''}
            onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
            placeholder={field.placeholder}
            className="w-full px-4 py-2 border rounded-lg resize-none"
            rows={2}
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-green-600 text-6xl mb-4">✓</div>
          <p className="text-xl font-semibold">日報を送信しました</p>
          <p className="text-gray-600 mt-2">お疲れ様でした！</p>
        </div>
      </div>
    );
  }

  const fields = storeInfo?.format?.fields ? JSON.parse(storeInfo.format.fields) : [];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">日報提出</h1>
            <p className="text-gray-600 mt-2">{storeInfo?.storeName}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* スタッフ選択 */}
            <div>
              <label className="block text-sm font-medium mb-2">
                スタッフ名 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStaffId || ''}
                onChange={(e) => setSelectedStaffId(Number(e.target.value))}
                className="w-full px-4 py-2 border rounded-lg"
                required
              >
                <option value="">選択してください</option>
                {storeInfo?.staff?.map((staff: Staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Dynamic fields */}
            {fields.map((field: ReportField) => (
              <div key={field.id}>
                <label className="block text-sm font-medium mb-2">
                  {field.title}
                  {field.required && <span className="text-red-500"> *</span>}
                </label>
                {renderField(field)}
              </div>
            ))}

            {/* Default fields if no format is set */}
            {fields.length === 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    今日のテンション <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFormData({ ...formData, tension: i })}
                        className={`w-10 h-10 rounded-full ${
                          formData.tension >= i
                            ? 'bg-yellow-400'
                            : 'bg-gray-200'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    今日の業務内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg resize-none"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    改善点・気づき
                  </label>
                  <textarea
                    value={formData.improvements || ''}
                    onChange={(e) => setFormData({ ...formData, improvements: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg resize-none"
                    rows={3}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {submitting ? '送信中...' : '日報を送信'}
            </button>
          </form>
        </div>

        <div className="text-center mt-4 text-sm text-gray-500">
          Powered by チムビル
        </div>
      </div>
    </div>
  );
}