import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import QRSettings from './QRSettings';

interface SettingsProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
}

interface Template {
  id: number;
  template: string;
  createdAt: string;
}

interface ReportField {
  id: string;
  type: 'text' | 'rating' | 'image';
  title: string;
  placeholder?: string;
  required?: boolean;
  maxRating?: number;
}

type SettingSection = 'main' | 'report-format' | 'comment-templates' | 'tension-alerts' | 'profile' | 'qr-settings';

export default function Settings({ store, role }: SettingsProps) {
  const [currentSection, setCurrentSection] = useState<SettingSection>('main');
  const [newTemplate, setNewTemplate] = useState('');
  const [reportFields, setReportFields] = useState<ReportField[]>([]);
  const [newFieldTitle, setNewFieldTitle] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'rating' | 'image'>('text');
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState('');
  const [newFieldMaxRating, setNewFieldMaxRating] = useState(5);
  const [alertThreshold, setAlertThreshold] = useState(0.3);
  const [consecutiveDays, setConsecutiveDays] = useState(3);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const queryClient = useQueryClient();

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
    enabled: currentSection === 'report-format',
  });

  // reportFormatが取得されたらreportFieldsを更新
  if (reportFormat?.fields && reportFields.length === 0) {
    setReportFields(reportFormat.fields);
  }

  // テンプレート一覧を取得
  const { data: templates, refetch } = useQuery({
    queryKey: ['comment-templates', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/comment-templates`,
        {
          params: { storeId: store.id },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data as Template[];
    },
    enabled: currentSection === 'comment-templates',
  });
  
  // 賞与設定を取得
  useQuery({
    queryKey: ['bonus-setting', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/stores/${store.id}/bonus-setting`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      setBonusEnabled(response.data.bonusEnabled ?? true);
      return response.data;
    },
    enabled: currentSection === 'comment-templates',
  });
  
  // テンションアラート設定を取得
  useQuery({
    queryKey: ['tension-settings', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/tension/alert-settings/${store.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      const data = response.data;
      setAlertThreshold(data.alertThreshold);
      setConsecutiveDays(data.consecutiveDays);
      setAlertsEnabled(data.isEnabled);
      return data;
    },
    enabled: currentSection === 'tension-alerts',
  });

  // テンプレート追加
  const addMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/comment-templates`,
        {
          storeId: store.id,
          template: newTemplate,
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
      setNewTemplate('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['comment-templates'] });
    },
    onError: (error) => {
      console.error('テンプレート追加エラー:', error);
      alert('テンプレートの追加に失敗しました');
    },
  });

  // テンプレート削除
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(
        `${API_BASE_URL}/comment-templates/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
    },
    onSuccess: () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['comment-templates'] });
    },
    onError: (error) => {
      console.error('テンプレート削除エラー:', error);
      alert('テンプレートの削除に失敗しました');
    },
  });

  const handleAddTemplate = () => {
    if (!newTemplate.trim()) {
      alert('テンプレートを入力してください');
      return;
    }
    addMutation.mutate();
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('このテンプレートを削除しますか？')) {
      deleteMutation.mutate(id);
    }
  };

  // 日報フォーマット保存
  const saveFormatMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${API_BASE_URL}/report-format/${store.id}`,
        {
          fields: reportFields,
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
      queryClient.invalidateQueries({ queryKey: ['report-format'] });
      alert('日報フォーマットを保存しました');
    },
    onError: (error) => {
      console.error('フォーマット保存エラー:', error);
      alert('フォーマットの保存に失敗しました');
    },
  });
  
  // パスワード変更
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.put(
        `${API_BASE_URL}/stores/${store.id}/change-password`,
        {
          currentPassword,
          newPassword,
          role,
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
      alert('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      console.error('パスワード変更エラー:', error);
      if (error.response?.status === 401) {
        alert('現在のパスワードが正しくありません');
      } else {
        alert('パスワードの変更に失敗しました');
      }
    },
  });
  
  // 賞与設定保存
  const saveBonusSettingMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.put(
        `${API_BASE_URL}/stores/${store.id}/bonus-setting`,
        {
          bonusEnabled,
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
      queryClient.invalidateQueries({ queryKey: ['bonus-setting'] });
      alert('賞与設定を保存しました');
    },
    onError: (error) => {
      console.error('賞与設定保存エラー:', error);
      alert('設定の保存に失敗しました');
    },
  });
  
  // テンションアラート設定保存
  const saveTensionSettingsMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.put(
        `${API_BASE_URL}/tension/alert-settings/${store.id}`,
        {
          alertThreshold,
          consecutiveDays,
          isEnabled: alertsEnabled,
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
      queryClient.invalidateQueries({ queryKey: ['tension-settings'] });
      alert('テンションアラート設定を保存しました');
    },
    onError: (error) => {
      console.error('設定保存エラー:', error);
      alert('設定の保存に失敗しました');
    },
  });

  const [newFieldRequired, setNewFieldRequired] = useState(false);

  const addReportField = () => {
    if (!newFieldTitle.trim()) {
      alert('項目タイトルを入力してください');
      return;
    }

    const newField: ReportField = {
      id: `field-${Date.now()}`,
      type: newFieldType,
      title: newFieldTitle,
      ...(newFieldType === 'text' && { placeholder: newFieldPlaceholder }),
      ...(newFieldType === 'rating' && { maxRating: newFieldMaxRating }),
      required: newFieldRequired,
    };

    setReportFields([...reportFields, newField]);
    setNewFieldTitle('');
    setNewFieldPlaceholder('');
    setNewFieldType('text');
    setNewFieldMaxRating(5);
    setNewFieldRequired(false);
  };

  const removeReportField = (id: string) => {
    setReportFields(reportFields.filter(field => field.id !== id));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...reportFields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setReportFields(newFields);
  };

  const toggleFieldRequired = (id: string) => {
    setReportFields(reportFields.map(field => 
      field.id === id ? { ...field, required: !field.required } : field
    ));
  };

  // メイン設定画面
  if (currentSection === 'main') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">設定</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 日報フォーマット設定カード */}
            <button
              onClick={() => setCurrentSection('report-format')}
              className="bg-background-sub p-6 rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">📝 日報フォーマット</h3>
                  <p className="text-sm text-text-sub">
                    スタッフが記入する日報の項目をカスタマイズできます
                  </p>
                </div>
                <span className="text-2xl text-text-sub">→</span>
              </div>
            </button>

            {/* コメントテンプレート設定カード */}
            <button
              onClick={() => setCurrentSection('comment-templates')}
              className="bg-background-sub p-6 rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">💬 コメントテンプレート</h3>
                  <p className="text-sm text-text-sub">
                    日報へのコメントで使用するテンプレートを管理できます
                  </p>
                </div>
                <span className="text-2xl text-text-sub">→</span>
              </div>
            </button>

            {/* テンションアラート設定カード */}
            <button
              onClick={() => setCurrentSection('tension-alerts')}
              className="bg-background-sub p-6 rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">⚠️ テンションアラート</h3>
                  <p className="text-sm text-text-sub">
                    スタッフのテンション低下を検知する設定を管理できます
                  </p>
                </div>
                <span className="text-2xl text-text-sub">→</span>
              </div>
            </button>

            {/* 日報QR設定カード */}
            <button
              onClick={() => setCurrentSection('qr-settings')}
              className="bg-background-sub p-6 rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">📱 日報QR</h3>
                  <p className="text-sm text-text-sub">
                    スタッフが日報を簡単に送信できるQRコードを管理できます
                  </p>
                </div>
                <span className="text-2xl text-text-sub">→</span>
              </div>
            </button>

            {/* プロフィール設定カード */}
            <button
              onClick={() => setCurrentSection('profile')}
              className="bg-background-sub p-6 rounded-lg hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2">👤 プロフィール設定</h3>
                  <p className="text-sm text-text-sub">
                    パスワードの変更などアカウント設定を管理できます
                  </p>
                </div>
                <span className="text-2xl text-text-sub">→</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 日報フォーマット設定画面
  if (currentSection === 'report-format') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentSection('main')}
              className="mr-4 text-text-sub hover:text-text-main"
            >
              ← 戻る
            </button>
            <h2 className="text-xl font-semibold">日報フォーマット設定</h2>
          </div>

          {/* 既存フィールド一覧 */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">現在の日報項目</h3>
            {reportFields.length > 0 ? (
              <div className="space-y-2">
                {reportFields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-3 p-3 bg-background-sub rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium">{field.title}</span>
                      <span className="ml-2 text-xs text-text-sub">
                        ({field.type === 'text' ? 'テキスト' : field.type === 'rating' ? `評価（★${field.maxRating}）` : '画像添付'})
                      </span>
                      {field.placeholder && (
                        <p className="text-xs text-text-sub mt-1">プレースホルダー: {field.placeholder}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleFieldRequired(field.id)}
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          field.required 
                            ? 'bg-accent-error text-white' 
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {field.required ? '必須' : '任意'}
                      </button>
                      {index > 0 && (
                        <button
                          onClick={() => moveField(index, 'up')}
                          className="text-text-sub hover:text-text-main"
                        >
                          ↑
                        </button>
                      )}
                      {index < reportFields.length - 1 && (
                        <button
                          onClick={() => moveField(index, 'down')}
                          className="text-text-sub hover:text-text-main"
                        >
                          ↓
                        </button>
                      )}
                      <button
                        onClick={() => removeReportField(field.id)}
                        className="text-accent-error hover:underline text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-sub text-sm">日報項目が設定されていません</p>
            )}
          </div>

          {/* 新規フィールド追加 */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">新しい項目を追加</h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">項目タイトル</label>
                  <input
                    type="text"
                    value={newFieldTitle}
                    onChange={(e) => setNewFieldTitle(e.target.value)}
                    placeholder="例: 今日の調子"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">入力タイプ</label>
                  <select
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as 'text' | 'rating' | 'image')}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="text">テキスト入力</option>
                    <option value="rating">星評価</option>
                    <option value="image">画像添付</option>
                  </select>
                </div>
              </div>
              
              {newFieldType === 'text' ? (
                <div>
                  <label className="block text-xs font-medium mb-1">プレースホルダー（任意）</label>
                  <input
                    type="text"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="例: 今日の体調や気分を入力してください"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
              ) : newFieldType === 'rating' ? (
                <div>
                  <label className="block text-xs font-medium mb-1">最大星数</label>
                  <select
                    value={newFieldMaxRating}
                    onChange={(e) => setNewFieldMaxRating(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    {[3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}つ星</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium mb-1">画像添付の説明</label>
                  <input
                    type="text"
                    value={newFieldPlaceholder}
                    onChange={(e) => setNewFieldPlaceholder(e.target.value)}
                    placeholder="例: 今日の作業風景や成果物の写真"
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="w-4 h-4 text-accent-primary rounded"
                  />
                  <span className="text-sm">必須項目にする</span>
                </label>
              </div>
              
              <button
                onClick={addReportField}
                className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                項目を追加
              </button>
            </div>
          </div>

          {/* 保存ボタン */}
          {reportFields.length > 0 && (
            <div className="mt-6">
              <button
                onClick={() => saveFormatMutation.mutate()}
                disabled={saveFormatMutation.isPending}
                className="w-full px-4 py-3 bg-accent-success text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {saveFormatMutation.isPending ? '保存中...' : '日報フォーマットを保存'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // コメントテンプレート設定画面
  if (currentSection === 'comment-templates') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          {/* ヘッダー */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentSection('main')}
              className="mr-4 text-text-sub hover:text-text-main"
            >
              ← 戻る
            </button>
            <h2 className="text-xl font-semibold">コメントテンプレート管理</h2>
          </div>

          {/* 賞与プレゼント設定 */}
          <div className="mb-6 p-4 bg-background-sub rounded-lg">
            <h3 className="text-sm font-semibold mb-3">賞与プレゼント設定</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">日報コメントで賞与をプレゼントできるボタンを表示</p>
                <p className="text-xs text-text-sub mt-1">
                  オンにすると、日報にコメントする際に賞与プレゼントボタンが表示されます
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={bonusEnabled}
                  onChange={(e) => setBonusEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-primary"></div>
              </label>
            </div>
            <button
              onClick={() => saveBonusSettingMutation.mutate()}
              disabled={saveBonusSettingMutation.isPending}
              className="mt-3 px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
            >
              {saveBonusSettingMutation.isPending ? '保存中...' : '設定を保存'}
            </button>
          </div>

          {/* 新規テンプレート追加 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">新しいテンプレートを追加</label>
            <div className="flex gap-3">
              <textarea
                value={newTemplate}
                onChange={(e) => setNewTemplate(e.target.value)}
                placeholder="例: よく頑張りました！この調子で明日も頑張ってください。"
                className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                rows={3}
              />
              <button
                onClick={handleAddTemplate}
                disabled={addMutation.isPending}
                className="px-6 py-3 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50 self-start"
              >
                {addMutation.isPending ? '追加中...' : '追加'}
              </button>
            </div>
          </div>

          {/* テンプレート一覧 */}
          <div>
            <h4 className="text-sm font-medium mb-3">登録済みテンプレート</h4>
            {templates && templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-start justify-between p-4 bg-background-sub rounded-lg"
                  >
                    <p className="flex-1 text-sm whitespace-pre-wrap">{template.template}</p>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      disabled={deleteMutation.isPending}
                      className="ml-4 text-accent-error hover:underline text-sm font-medium disabled:opacity-50"
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-sub text-sm">テンプレートが登録されていません</p>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // テンションアラート設定画面
  if (currentSection === 'tension-alerts') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentSection('main')}
              className="mr-4 text-text-sub hover:text-text-main"
            >
              ←
            </button>
            <h2 className="text-xl font-semibold">テンションアラート設定</h2>
          </div>
          
          <div className="space-y-6">
            {/* アラート有効/無効 */}
            <div className="flex items-center justify-between p-4 bg-background-sub rounded-lg">
              <div>
                <h3 className="font-medium">アラート機能</h3>
                <p className="text-sm text-text-sub mt-1">
                  スタッフのテンション低下を検知してアラートを表示します
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertsEnabled}
                  onChange={(e) => setAlertsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-accent-primary"></div>
              </label>
            </div>
            
            {/* 連続日数設定 */}
            <div className="p-4 bg-background-sub rounded-lg">
              <h3 className="font-medium mb-3">アラート発生条件</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm">テンションが</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={consecutiveDays}
                  onChange={(e) => setConsecutiveDays(parseInt(e.target.value) || 3)}
                  className="w-16 px-2 py-1 border rounded text-center"
                  disabled={!alertsEnabled}
                />
                <span className="text-sm">日連続で低い場合にアラートを表示</span>
              </div>
            </div>
            
            {/* 閾値設定 */}
            <div className="p-4 bg-background-sub rounded-lg">
              <h3 className="font-medium mb-3">テンション低下の判定基準</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">平均値から</span>
                  <select
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(parseFloat(e.target.value))}
                    className="px-3 py-1 border rounded"
                    disabled={!alertsEnabled}
                  >
                    <option value="0.2">20%</option>
                    <option value="0.3">30%</option>
                    <option value="0.4">40%</option>
                    <option value="0.5">50%</option>
                  </select>
                  <span className="text-sm">以上低い場合を「テンション低下」と判定</span>
                </div>
                <p className="text-xs text-text-sub">
                  ※個人の平均テンションスコアと比較して判定します
                </p>
              </div>
            </div>
            
            {/* 保存ボタン */}
            <button
              onClick={() => saveTensionSettingsMutation.mutate()}
              disabled={saveTensionSettingsMutation.isPending}
              className="w-full bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
            >
              {saveTensionSettingsMutation.isPending ? '保存中...' : '設定を保存'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // プロフィール設定画面
  // QR設定画面
  if (currentSection === 'qr-settings') {
    return <QRSettings store={store} onBack={() => setCurrentSection('main')} />;
  }

  if (currentSection === 'profile') {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-background-main rounded-lg shadow-subtle p-6">
          <div className="flex items-center mb-6">
            <button
              onClick={() => setCurrentSection('main')}
              className="mr-4 text-text-sub hover:text-text-main"
            >
              ← 戻る
            </button>
            <h2 className="text-xl font-semibold">プロフィール設定</h2>
          </div>
          
          <div className="space-y-6">
            {/* 現在のロール表示 */}
            <div className="p-4 bg-background-sub rounded-lg">
              <h3 className="font-medium mb-2">アカウント情報</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-sub">店舗名:</span>
                  <span className="text-sm font-medium">{store.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-sub">ロール:</span>
                  <span className="text-sm font-medium">{role === 'owner' ? 'オーナー' : '店長'}</span>
                </div>
              </div>
            </div>
            
            {/* パスワード変更 */}
            <div className="p-4 bg-background-sub rounded-lg">
              <h3 className="font-medium mb-4">パスワード変更</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">現在のパスワード</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="現在のパスワードを入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">新しいパスワード</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="新しいパスワードを入力"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">新しいパスワード（確認）</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    placeholder="新しいパスワードを再入力"
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-accent-error">パスワードが一致しません</p>
                )}
              </div>
              
              <button
                onClick={() => {
                  if (!currentPassword || !newPassword || !confirmPassword) {
                    alert('すべての項目を入力してください');
                    return;
                  }
                  if (newPassword !== confirmPassword) {
                    alert('新しいパスワードが一致しません');
                    return;
                  }
                  if (newPassword.length < 4) {
                    alert('パスワードは4文字以上で設定してください');
                    return;
                  }
                  changePasswordMutation.mutate();
                }}
                disabled={changePasswordMutation.isPending}
                className="mt-6 w-full bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
              >
                {changePasswordMutation.isPending ? '変更中...' : 'パスワードを変更'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}