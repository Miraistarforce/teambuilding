import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import DailyReportComment from '../components/DailyReportComment';

interface DailyReportListProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
}

interface Report {
  id: number;
  staffId: number;
  staff: {
    name: string;
  };
  date: string;
  content: string;
  formData?: any;
  isRead: boolean;
  createdAt: string;
  comments?: {
    id: number;
    emoji?: string;
    comment?: string;
    hasBonus: boolean;
    createdBy: string;
    createdAt: string;
  }[];
}

interface ReportField {
  id: string;
  type: 'text' | 'rating';
  title: string;
  placeholder?: string;
  required?: boolean;
  maxRating?: number;
}

interface ReportFormat {
  fields: ReportField[];
}

export default function DailyReportList({ store, role }: DailyReportListProps) {
  const [selectedDate, setSelectedDate] = useState<string>('all'); // 初期値を'all'に変更
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [commentingReportId, setCommentingReportId] = useState<number | null>(null);
  const [reportFormat, setReportFormat] = useState<ReportFormat | null>(null);

  const { data: reports, refetch } = useQuery({
    queryKey: ['daily-reports', store.id, selectedDate],
    queryFn: async () => {
      const params: any = {
        storeId: store.id,
      };
      
      // 特定の日付が選択されている場合のみdateパラメータを追加
      if (selectedDate !== 'all') {
        params.date = selectedDate;
      }
      
      const response = await axios.get(
        `http://localhost:3001/api/daily-reports/list`,
        {
          params,
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data as Report[];
    },
  });

  // 日報フォーマット取得
  const { data: formatData } = useQuery({
    queryKey: ['report-format', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `http://localhost:3001/api/report-format/${store.id}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      return response.data;
    },
  });

  // フォーマットデータをセット
  useEffect(() => {
    if (formatData?.fields) {
      setReportFormat({ fields: formatData.fields });
    }
  }, [formatData]);

  // 既読にする
  const markAsRead = async (reportId: number) => {
    try {
      await axios.patch(
        `http://localhost:3001/api/daily-reports/${reportId}/read`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      refetch();
    } catch (error) {
      console.error('既読更新エラー:', error);
    }
  };

  const toggleCard = (id: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
      // 展開時に既読にする
      const report = reports?.find(r => r.id === id);
      if (report && !report.isRead) {
        markAsRead(id);
      }
    }
    setExpandedCards(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja });
  };

  const formatReportDate = (dateString: string) => {
    return format(new Date(dateString), 'M/d', { locale: ja });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ja });
  };

  // 日付選択用のオプション（全件 + 過去7日間）
  const dateOptions = [
    { value: 'all', label: '全ての日報' },
    ...Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return {
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'M月d日(E)', { locale: ja }),
      };
    }),
  ];

  // 未読件数
  const unreadCount = reports?.filter(r => !r.isRead).length || 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">日報一覧</h2>
            {unreadCount > 0 && (
              <span className="text-sm text-accent-warning">
                未読: {unreadCount}件
              </span>
            )}
          </div>
          <button
            onClick={() => refetch()}
            className="text-sm text-accent-primary hover:underline"
          >
            更新
          </button>
        </div>

        {/* 日付選択 */}
        <div>
          <label className="block text-sm font-medium mb-2">日付フィルター</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {dateOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 日報リスト */}
      <div className="space-y-3">
        {reports && reports.length > 0 ? (
          reports.map((report) => (
            <div
              key={report.id}
              className={`bg-background-main rounded-lg shadow-subtle overflow-hidden transition-all duration-200 hover:shadow-md ${
                !report.isRead ? 'border-l-4 border-accent-warning' : ''
              }`}
            >
              {/* カードヘッダー（常に表示） */}
              <div
                className="px-6 py-3 cursor-pointer flex items-center justify-between hover:bg-background-sub/30 transition-colors"
                onClick={() => toggleCard(report.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {!report.isRead && (
                      <span className="w-2 h-2 bg-accent-warning rounded-full animate-pulse"></span>
                    )}
                    <span className="font-medium">
                      {report.staff.name}
                    </span>
                  </div>
                  <div className="text-sm text-text-sub">
                    {formatReportDate(report.date)} {formatTime(report.createdAt)}
                  </div>
                  <div className="hidden md:block text-sm text-text-sub">
                    {report.formData && reportFormat ? (
                      <>
                        {reportFormat.fields.slice(0, 2).map((field, idx) => (
                          <span key={field.id}>
                            {idx > 0 && ', '}
                            {field.title}: 
                            {field.type === 'rating' 
                              ? `★${report.formData[field.id]}` 
                              : (report.formData[field.id]?.substring(0, 20) || '未記入')}
                          </span>
                        ))}
                      </>
                    ) : (
                      <>
                        {report.content.substring(0, 50)}
                        {report.content.length > 50 && '...'}
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {report.isRead && (
                    <span className="text-xs text-text-help">既読</span>
                  )}
                  <svg
                    className={`w-5 h-5 text-text-sub transition-transform ${
                      expandedCards.has(report.id) ? 'rotate-180' : ''
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
              {expandedCards.has(report.id) && (
                <div className="px-6 py-4 border-t bg-background-sub/20">
                  <div className="mb-2">
                    <span className="text-sm font-semibold">日報内容</span>
                  </div>
                  <div className="text-sm text-text-main">
                    {report.formData && reportFormat ? (
                      <div className="space-y-3">
                        {reportFormat.fields.map(field => (
                          <div key={field.id}>
                            <div className="font-medium text-accent-primary mb-1">
                              {field.title}
                            </div>
                            {field.type === 'rating' ? (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: field.maxRating || 5 }, (_, i) => (
                                  <span
                                    key={i}
                                    className={`text-xl ${
                                      i < (report.formData[field.id] || 0)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="ml-2 text-sm text-text-sub">
                                  {report.formData[field.id]} / {field.maxRating || 5}
                                </span>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap p-2 bg-background-sub rounded">
                                {report.formData[field.id] || '(未記入)'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {report.content}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 text-xs text-text-sub">
                    提出日時: {format(new Date(report.createdAt), 'yyyy年M月d日 HH:mm:ss', { locale: ja })}
                  </div>
                  
                  {/* コメント表示 */}
                  {report.comments && report.comments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="text-sm font-semibold mb-2">コメント</div>
                      {report.comments.map(comment => (
                        <div key={comment.id} className="mb-2 p-2 bg-background-sub rounded">
                          <div className="flex items-start gap-2">
                            {comment.emoji && <span className="text-2xl">{comment.emoji}</span>}
                            <div className="flex-1">
                              {comment.comment && (
                                <p className="text-sm">{comment.comment}</p>
                              )}
                              {comment.hasBonus && (
                                <div className="mt-1 inline-flex items-center px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs rounded-full">
                                  🎁 賞与がプレゼントされました
                                </div>
                              )}
                              <p className="text-xs text-text-sub mt-1">
                                {comment.createdBy === 'owner' ? 'オーナー' : '店長'} • 
                                {format(new Date(comment.createdAt), 'M/d HH:mm')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* コメントボタン */}
                  <div className="mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCommentingReportId(report.id);
                      }}
                      className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
                    >
                      コメント
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-background-main rounded-lg shadow-subtle p-8 text-center">
            <p className="text-text-sub">
              {selectedDate === 'all' 
                ? '日報がまだ提出されていません' 
                : `${formatDate(selectedDate)}の日報はありません`}
            </p>
          </div>
        )}
      </div>

      {/* サマリー */}
      {reports && reports.length > 0 && (
        <div className="mt-6 p-4 bg-background-main rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-sub">
              提出済み: {reports.length}件
            </span>
            <span className="text-text-sub">
              未読: {unreadCount}件 / 既読: {reports.length - unreadCount}件
            </span>
          </div>
        </div>
      )}
      
      {/* コメントモーダル */}
      {commentingReportId && (
        <DailyReportComment
          reportId={commentingReportId}
          storeId={store.id}
          onClose={() => setCommentingReportId(null)}
          onSuccess={() => {
            refetch();
            setCommentingReportId(null);
          }}
        />
      )}
    </div>
  );
}