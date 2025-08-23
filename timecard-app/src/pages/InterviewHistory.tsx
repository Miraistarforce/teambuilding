import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { staffApi } from '../lib/api';
import axios from 'axios';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { API_BASE_URL } from '../config/api';

interface InterviewHistoryProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
}

interface InterviewRecord {
  id: number;
  createdAt: string;
  summary: string[];
  advice: string[];
  createdBy: string;
  pdfUrl?: string | null;
  audioUrl?: string | null;
  textContent?: string | null;
}

export default function InterviewHistory({ store }: InterviewHistoryProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const { data: staffList } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: () => staffApi.getByStore(store.id),
  });

  const { data: interviews, refetch } = useQuery({
    queryKey: ['interview-history', selectedStaffId],
    queryFn: async () => {
      if (!selectedStaffId) return [];
      
      const response = await axios.get(
        `${API_BASE_URL}/interviews/history/${selectedStaffId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data as InterviewRecord[];
    },
    enabled: !!selectedStaffId,
  });

  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日(E) HH:mm', { locale: ja });
  };

  const getRoleLabel = (createdBy: string) => {
    switch (createdBy) {
      case 'owner':
        return 'オーナー';
      case 'manager':
        return '店長';
      default:
        return createdBy;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* スタッフ選択 */}
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">面談記録</h2>
          <button
            onClick={() => refetch()}
            className="text-sm text-accent-primary hover:underline"
          >
            更新
          </button>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">スタッフ選択</label>
          <select
            value={selectedStaffId || ''}
            onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
            className="w-full md:w-1/2 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="">スタッフを選択してください</option>
            {staffList?.map((staff: any) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 面談記録リスト */}
      {selectedStaffId && (
        <div className="space-y-3">
          {interviews && interviews.length > 0 ? (
            interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-background-main rounded-lg shadow-subtle overflow-hidden transition-all duration-200 hover:shadow-md"
              >
                {/* カードヘッダー（常に表示） */}
                <div
                  className="px-6 py-3 cursor-pointer flex items-center justify-between hover:bg-background-sub/30 transition-colors"
                  onClick={() => toggleCard(interview.id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {formatDate(interview.createdAt)}
                      </span>
                      <span className="text-xs text-text-sub">
                        記録者: {getRoleLabel(interview.createdBy)}
                      </span>
                    </div>
                    <div className="hidden md:flex items-center space-x-6 text-sm text-text-sub">
                      <span>要約: {interview.summary.length}項目</span>
                      {interview.advice.length > 0 && (
                        <span>アドバイス: {interview.advice.length}項目</span>
                      )}
                      {interview.pdfUrl && (
                        <span className="text-accent-primary font-medium">📄 PDFあり</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <svg
                      className={`w-5 h-5 text-text-sub transition-transform ${
                        expandedCards.has(interview.id) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>

                {/* 展開時の詳細 */}
                {expandedCards.has(interview.id) && (
                  <div className="px-6 py-4 border-t bg-background-sub/20">
                    {/* 要約 */}
                    {interview.summary.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">面談内容の要約</h4>
                        <ul className="space-y-1">
                          {interview.summary.map((item, index) => (
                            <li key={index} className="flex items-start text-sm">
                              <span className="text-accent-primary mr-2 mt-0.5">•</span>
                              <span className="text-text-main">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* アドバイス */}
                    {interview.advice.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold mb-2">次回の確認ポイント</h4>
                        <ul className="space-y-1">
                          {interview.advice.map((item, index) => (
                            <li key={index} className="flex items-start text-sm">
                              <span className="text-accent-warning mr-2 mt-0.5">✓</span>
                              <span className="text-text-main">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* PDFリンク */}
                    {interview.pdfUrl && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-semibold mb-2">添付資料</h4>
                        <a
                          href={interview.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          PDFを表示
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-background-main rounded-lg shadow-subtle p-8 text-center">
              <p className="text-text-sub">面談記録がありません</p>
              <p className="text-sm text-text-help mt-2">
                「面談」タブから新しい面談を記録してください
              </p>
            </div>
          )}
        </div>
      )}

      {/* 未選択時 */}
      {!selectedStaffId && (
        <div className="bg-background-main rounded-lg shadow-subtle p-12 text-center">
          <p className="text-text-sub">
            スタッフを選択して面談記録を確認してください
          </p>
        </div>
      )}
    </div>
  );
}