import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { MBTI_TYPES, getMBTIProfile, type MBTIType } from '../utils/mbtiGuide';
import { API_BASE_URL } from '../config/api';

interface StaffManagementProps {
  store: { id: number; name: string };
}

interface Staff {
  id: number;
  name: string;
  hourlyWage: number;
  holidayAllowance: number;
  overtimeRate: number;
  otherAllowance: number;
  hireDate: string | null;
  mbtiType: string | null;
  isActive: boolean;
}

interface StaffDetail extends Staff {
  lastWorkDate?: string;
  monthlyAttendance?: number;
  monthlySalary?: number;
  lastInterview?: {
    id: number;
    summary: string;
    createdAt: string;
  };
}

export default function StaffManagement({ store }: StaffManagementProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffDetail | null>(null);
  const [showCommunicationGuide, setShowCommunicationGuide] = useState(false);
  const [showMBTIEdit, setShowMBTIEdit] = useState(false);
  const [tempMBTIType, setTempMBTIType] = useState<string>('');
  const [showAIConsult, setShowAIConsult] = useState(false);
  const [consultText, setConsultText] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const queryClient = useQueryClient();
  
  // テンションアラート取得
  const { data: tensionAlerts } = useQuery({
    queryKey: ['tension-alerts', store.id],
    queryFn: async () => {
      const token = localStorage.getItem('timecardToken');
      const response = await axios.get(`${API_BASE_URL}/tension/store/${store.id}/alerts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    },
    refetchInterval: 60000 // 1分ごとに更新
  });

  // スタッフ一覧を取得
  const { data: staffList, isLoading } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: async () => {
      const token = localStorage.getItem('timecardToken');
      const response = await axios.get(`${API_BASE_URL}/staff/list/${store.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    }
  });

  // スタッフ詳細を取得
  const fetchStaffDetail = async (staffId: number) => {
    const token = localStorage.getItem('timecardToken');
    
    try {
      const [staffResponse, statsResponse, interviewResponse] = await Promise.all([
        // スタッフ基本情報
        axios.get(`${API_BASE_URL}/staff/${staffId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // 勤怠統計
        axios.get(`${API_BASE_URL}/staff/${staffId}/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        // 最新の面談
        axios.get(`${API_BASE_URL}/interviews/staff/${staffId}/latest`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: null })) // エラー時はnullを返す
      ]);

      return {
        ...staffResponse.data,
        ...statsResponse.data,
        lastInterview: interviewResponse.data
      };
    } catch (error) {
      console.error('Failed to fetch staff detail:', error);
      throw error;
    }
  };

  // MBTI更新
  const updateMBTIMutation = useMutation({
    mutationFn: async ({ staffId, mbtiType }: { staffId: number; mbtiType: string }) => {
      const token = localStorage.getItem('timecardToken');
      return axios.put(
        `${API_BASE_URL}/staff/${staffId}`,
        { mbtiType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      if (selectedStaff) {
        fetchStaffDetail(selectedStaff.id).then(setSelectedStaff);
      }
    }
  });

  const handleStaffClick = async (staff: Staff) => {
    const detail = await fetchStaffDetail(staff.id);
    setSelectedStaff(detail);
    setShowCommunicationGuide(false);
  };

  const handleMBTIChange = (mbtiType: string) => {
    if (selectedStaff) {
      updateMBTIMutation.mutate({ staffId: selectedStaff.id, mbtiType });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未設定';
    return format(new Date(dateString), 'yyyy年M月d日', { locale: ja });
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">スタッフ管理</h2>
      
      {/* テンションアラート表示 */}
      {tensionAlerts && tensionAlerts.length > 0 && (
        <div className="mb-6 bg-accent-warning/10 border-l-4 border-accent-warning rounded-lg p-4">
          <h3 className="font-semibold text-accent-warning mb-2">
            ⚠️ テンション低下アラート
          </h3>
          <div className="space-y-2">
            {tensionAlerts.map((alert: any) => (
              <div key={alert.staffId} className="text-sm">
                <span className="font-medium">{alert.staffName}</span>さんが
                <span className="text-accent-warning font-medium"> {alert.consecutiveLowDays}日連続</span>
                でテンションが低下しています
                <span className="text-text-sub ml-2">
                  (現在: {(alert.latestScore * 100).toFixed(0)}点 / 平均: {(alert.avgScore * 100).toFixed(0)}点)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* スタッフカード一覧 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-text-sub">
            読み込み中...
          </div>
        ) : (
          staffList?.map((staff: Staff) => (
            <div
              key={staff.id}
              onClick={() => handleStaffClick(staff)}
              className="bg-background-main rounded-lg shadow-subtle p-6 cursor-pointer hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{staff.name}</h3>
              <div className="text-sm text-text-sub space-y-1">
                <p>時給: {formatCurrency(staff.hourlyWage)}</p>
                <p>入社日: {formatDate(staff.hireDate)}</p>
                {staff.mbtiType && (
                  <p className="text-accent-primary font-medium">
                    MBTI: {staff.mbtiType}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* スタッフ詳細モーダル */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-main rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* ヘッダー */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="text-text-sub hover:text-text-main"
                >
                  ✕
                </button>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-background-sub rounded-lg p-4">
                  <h3 className="text-sm text-text-sub mb-1">入社日</h3>
                  <p className="font-semibold">{formatDate(selectedStaff.hireDate)}</p>
                </div>
                <div className="bg-background-sub rounded-lg p-4">
                  <h3 className="text-sm text-text-sub mb-1">直近の出勤日</h3>
                  <p className="font-semibold">
                    {selectedStaff.lastWorkDate
                      ? formatDate(selectedStaff.lastWorkDate)
                      : '記録なし'}
                  </p>
                </div>
                <div className="bg-background-sub rounded-lg p-4">
                  <h3 className="text-sm text-text-sub mb-1">今月の出勤数</h3>
                  <p className="font-semibold">{selectedStaff.monthlyAttendance || 0}日</p>
                </div>
                <div className="bg-background-sub rounded-lg p-4">
                  <h3 className="text-sm text-text-sub mb-1">今月の給与</h3>
                  <p className="font-semibold text-accent-primary">
                    {formatCurrency(selectedStaff.monthlySalary || 0)}
                  </p>
                </div>
              </div>

              {/* MBTI設定 */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">MBTI診断</h3>
                
                {!selectedStaff.mbtiType ? (
                  // MBTI未設定の場合はプルダウン表示
                  <div className="flex items-center space-x-4 mb-4">
                    <select
                      value={selectedStaff.mbtiType || ''}
                      onChange={(e) => handleMBTIChange(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    >
                      <option value="">未設定</option>
                      {MBTI_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type} - {getMBTIProfile(type as MBTIType)?.title}
                        </option>
                      ))}
                    </select>
                    {updateMBTIMutation.isPending && (
                      <span className="text-sm text-text-sub">保存中...</span>
                    )}
                  </div>
                ) : (
                  <>
                    {/* MBTI設定済みの場合 */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg font-medium text-accent-primary">
                          {selectedStaff.mbtiType}
                        </span>
                        <span className="text-lg">-</span>
                        <span className="text-lg">
                          {getMBTIProfile(selectedStaff.mbtiType as MBTIType)?.title}
                        </span>
                        <button
                          onClick={() => {
                            setTempMBTIType(selectedStaff.mbtiType || '');
                            setShowMBTIEdit(true);
                          }}
                          className="ml-2 text-sm text-accent-primary hover:underline"
                        >
                          編集
                        </button>
                      </div>
                      
                      {/* 説明文と特性 */}
                      {(() => {
                        const profile = getMBTIProfile(selectedStaff.mbtiType as MBTIType);
                        if (!profile) return null;
                        return (
                          <>
                            <p className="text-sm text-text-sub mb-3">{profile.description}</p>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {profile.strengths.map((strength, index) => (
                                <span
                                  key={index}
                                  className="px-3 py-1 bg-accent-primary/10 text-accent-primary rounded-full text-sm"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* 効果的なコミュニケーションボタンとAI相談ボタン */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCommunicationGuide(!showCommunicationGuide)}
                        className="px-4 py-2 bg-accent-primary text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                      >
                        効果的なコミュニケーション
                      </button>
                      <button
                        onClick={() => {
                          setShowAIConsult(true);
                          setConsultText('');
                          setAiAdvice('');
                        }}
                        className="px-4 py-2 bg-accent-success text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                      >
                        AIに相談
                      </button>
                    </div>

                    {/* コミュニケーションガイド */}
                    {showCommunicationGuide && (() => {
                      const profile = getMBTIProfile(selectedStaff.mbtiType as MBTIType);
                      if (!profile) return null;
                      return (
                        <div className="mt-4 bg-background-sub rounded-lg p-4 space-y-4">
                          <div>
                            <h5 className="font-semibold mb-2 text-accent-success">
                              💚 おすすめの褒め方
                            </h5>
                            <ul className="text-sm space-y-1">
                              {profile.communicationStyle.praise.map((item, index) => (
                                <li key={index} className="ml-4">• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2 text-accent-warning">
                              ⚠️ おすすめの注意の仕方
                            </h5>
                            <ul className="text-sm space-y-1">
                              {profile.communicationStyle.feedback.map((item, index) => (
                                <li key={index} className="ml-4">• {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2 text-accent-primary">
                              📏 おすすめの距離感
                            </h5>
                            <p className="text-sm ml-4">{profile.communicationStyle.distance}</p>
                          </div>
                          <div>
                            <h5 className="font-semibold mb-2">💡 その他のコツ</h5>
                            <ul className="text-sm space-y-1">
                              {profile.communicationStyle.tips.map((tip, index) => (
                                <li key={index} className="ml-4">• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>

              {/* 直近の面談内容 */}
              {selectedStaff.lastInterview && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-3">直近の面談内容</h3>
                  <div className="bg-background-sub rounded-lg p-4">
                    <p className="text-sm text-text-sub mb-2">
                      {format(
                        new Date(selectedStaff.lastInterview.createdAt),
                        'yyyy年M月d日',
                        { locale: ja }
                      )}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {selectedStaff.lastInterview.summary || '要約がありません'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* MBTI編集モーダル */}
      {showMBTIEdit && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-main rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">MBTIタイプを編集</h3>
            <select
              value={tempMBTIType}
              onChange={(e) => setTempMBTIType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary mb-4"
            >
              <option value="">未設定</option>
              {MBTI_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type} - {getMBTIProfile(type as MBTIType)?.title}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  handleMBTIChange(tempMBTIType);
                  setShowMBTIEdit(false);
                }}
                className="flex-1 bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                保存
              </button>
              <button
                onClick={() => setShowMBTIEdit(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI相談モーダル */}
      {showAIConsult && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background-main rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">
                {selectedStaff.name}さんについてAIに相談
              </h3>
              <button
                onClick={() => {
                  setShowAIConsult(false);
                  setConsultText('');
                  setAiAdvice('');
                }}
                className="text-text-sub hover:text-text-main"
              >
                ✕
              </button>
            </div>
            
            {selectedStaff.mbtiType && (
              <div className="mb-4 p-3 bg-background-sub rounded-lg">
                <span className="text-sm text-text-sub">MBTIタイプ: </span>
                <span className="font-medium text-accent-primary">
                  {selectedStaff.mbtiType} - {getMBTIProfile(selectedStaff.mbtiType as MBTIType)?.title}
                </span>
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">相談内容</label>
              <textarea
                value={consultText}
                onChange={(e) => setConsultText(e.target.value)}
                placeholder="例：最近モチベーションが下がっているようです。どのように接したら良いでしょうか？"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
                rows={5}
              />
            </div>
            
            <button
              onClick={async () => {
                if (!consultText.trim()) {
                  alert('相談内容を入力してください');
                  return;
                }
                
                setIsLoadingAdvice(true);
                try {
                  const token = localStorage.getItem('timecardToken');
                  const response = await axios.post(
                    `${API_BASE_URL}/ai-consult/mbti-advice`,
                    {
                      mbtiType: selectedStaff.mbtiType,
                      consultText,
                      staffName: selectedStaff.name
                    },
                    {
                      headers: { Authorization: `Bearer ${token}` }
                    }
                  );
                  setAiAdvice(response.data.advice);
                } catch (error) {
                  console.error('AI相談エラー:', error);
                  alert('アドバイスの取得に失敗しました');
                } finally {
                  setIsLoadingAdvice(false);
                }
              }}
              disabled={isLoadingAdvice || !consultText.trim()}
              className="w-full bg-accent-success text-white px-4 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
            >
              {isLoadingAdvice ? 'アドバイスを生成中...' : 'AIに相談する'}
            </button>
            
            {aiAdvice && (
              <div className="mt-6 p-4 bg-accent-success/10 border border-accent-success/30 rounded-lg">
                <h4 className="font-semibold mb-2 text-accent-success">AIからのアドバイス</h4>
                <div className="text-sm whitespace-pre-wrap">{aiAdvice}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}