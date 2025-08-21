import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import * as HolidayJp from '@holiday-jp/holiday_jp';
import { API_BASE_URL } from '../config/api';

interface MyDailyReportsProps {
  store: { id: number; name: string };
}

interface Report {
  id: number;
  staffId: number;
  staff?: {
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

export default function MyDailyReports({ store }: MyDailyReportsProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [reportFormat, setReportFormat] = useState<ReportFormat | null>(null);

  // 全スタッフの日報を取得
  const { data: response } = useQuery({
    queryKey: ['all-staff-reports', store.id],
    queryFn: async () => {
      const response = await axios.get(
        `${API_BASE_URL}/daily-reports/all-staff`,
        {
          params: {
            storeId: store.id,
          },
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('timecardToken')}`,
          },
        }
      );
      if (response.data.reports && response.data.format) {
        setReportFormat(response.data.format);
        return response.data.reports as Report[];
      }
      return response.data as Report[];
    },
  });

  const allReports = Array.isArray(response) ? response : (response as any)?.reports;

  // 日付ごとの日報数を計算
  const reportCountByDate = new Map<string, number>();
  allReports?.forEach((report: Report) => {
    const dateStr = format(new Date(report.date), 'yyyy-MM-dd');
    reportCountByDate.set(dateStr, (reportCountByDate.get(dateStr) || 0) + 1);
  });

  // 選択された日付の日報を取得
  const selectedDateReports = selectedDate 
    ? allReports?.filter((report: any) => {
        const reportDate = format(new Date(report.date), 'yyyy-MM-dd');
        const selected = format(selectedDate, 'yyyy-MM-dd');
        return reportDate === selected;
      })
    : [];

  // カレンダーのタイルにマークと数を追加
  const tileContent = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const count = reportCountByDate.get(dateStr);
    const holiday = HolidayJp.between(date, date)[0];
    
    return (
      <div className="relative h-full flex flex-col justify-between">
        {count && (
          <div className="flex items-center justify-center space-x-1 mt-1">
            <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
            <span className="text-xs font-semibold text-accent-primary">{count}</span>
          </div>
        )}
        {holiday && (
          <div className="text-center mt-auto mb-1">
            <span className="text-[10px] text-red-600 font-medium" title={holiday.name}>
              {holiday.name.length > 4 ? holiday.name.substring(0, 4) : holiday.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  // カレンダーのタイルクラス
  const tileClassName = ({ date }: { date: Date }) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
    const isHoliday = HolidayJp.isHoliday(date);
    const dayOfWeek = date.getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    
    const classes = [];
    
    if (isSelected) {
      classes.push('selected-date');
    }
    if (reportCountByDate.has(dateStr)) {
      classes.push('has-report');
    }
    if (isHoliday || isSunday) {
      classes.push('holiday');
    } else if (isSaturday) {
      classes.push('saturday');
    }
    
    return classes.join(' ');
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日(E)', { locale: ja });
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ja });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-6">
        {/* カレンダー */}
        <div className="bg-background-main rounded-lg shadow-subtle p-6">
          <h3 className="text-lg font-semibold mb-4">日報カレンダー</h3>
          <style>{`
            .react-calendar {
              width: 100%;
              border: none;
              font-family: inherit;
              background: transparent;
            }
            .react-calendar__tile {
              padding: 0.75em 0.5em;
              position: relative;
              height: 70px;
            }
            .react-calendar__tile--active {
              background: rgb(var(--accent-primary) / 0.1) !important;
              color: rgb(var(--accent-primary));
            }
            .react-calendar__tile:hover {
              background: rgb(var(--background-sub));
            }
            .react-calendar__tile--now {
              background: rgb(var(--accent-warning) / 0.1);
            }
            .react-calendar__tile.selected-date {
              background: rgb(var(--accent-primary) / 0.2) !important;
              color: rgb(var(--accent-primary));
              font-weight: bold;
            }
            .react-calendar__tile.has-report {
              font-weight: 600;
            }
            .react-calendar__tile.holiday {
              color: #dc2626 !important;
            }
            .react-calendar__tile.saturday {
              color: #2563eb !important;
            }
            .react-calendar__navigation button {
              font-size: 1.1em;
              padding: 0.5em;
            }
            .react-calendar__month-view__weekdays {
              text-transform: none;
              font-weight: 600;
              font-size: 0.9em;
            }
            .react-calendar__month-view__weekdays__weekday:first-child {
              color: #dc2626;
            }
            .react-calendar__month-view__weekdays__weekday:last-child {
              color: #2563eb;
            }
          `}</style>
          <Calendar
            value={selectedDate}
            onChange={(value) => setSelectedDate(value as Date)}
            tileContent={tileContent}
            tileClassName={tileClassName}
            locale="ja-JP"
            formatDay={(_locale, date) => format(date, 'd')}
          />
          <div className="mt-4 text-sm text-text-sub">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
              <span>日報あり（数字は日報数）</span>
            </div>
          </div>
        </div>

        {/* 選択された日付の日報 */}
        <div>
          <div className="bg-background-main rounded-lg shadow-subtle p-6">
            <h3 className="text-lg font-semibold mb-4">
              {selectedDate 
                ? formatDate(selectedDate.toISOString())
                : '日付を選択してください'}
            </h3>
            
            {selectedDate && selectedDateReports && selectedDateReports.length > 0 ? (
              <div className="space-y-3">
                {selectedDateReports.map((report: any) => (
                  <div
                    key={report.id}
                    className={`rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md ${
                      report.comments && report.comments.length > 0 
                        ? 'sparkle-card' 
                        : 'bg-background-sub'
                    }`}
                  >
                    {/* カードヘッダー */}
                    <div
                      className="px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-background-main/30 transition-colors"
                      onClick={() => setExpandedCard(expandedCard === report.id ? null : report.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="font-medium text-accent-primary whitespace-nowrap">
                          {report.staff?.name}
                        </span>
                        <span className="text-sm text-text-sub whitespace-nowrap">
                          {formatTime(report.createdAt)}
                        </span>
                        {/* コメントありの表示 */}
                        {report.comments && report.comments.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full animate-pulse whitespace-nowrap">
                            ✨ {report.comments.some((c: any) => c.createdBy === 'owner') 
                              ? 'オーナー' 
                              : '店長'}からコメントあり
                          </span>
                        )}
                        {!expandedCard || expandedCard !== report.id ? (
                          <span className="text-sm text-text-sub truncate flex-1">
                            {report.formData && reportFormat ? (
                              reportFormat.fields.slice(0, 2).map((field) => 
                                `${field.title}: ${
                                  field.type === 'rating' 
                                    ? `★${report.formData[field.id]}` 
                                    : report.formData[field.id]?.substring(0, 20)
                                }`
                              ).join(', ')
                            ) : (
                              report.content
                            )}
                          </span>
                        ) : null}
                      </div>
                      <svg
                        className={`w-5 h-5 text-text-sub transition-transform ${
                          expandedCard === report.id ? 'rotate-180' : ''
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

                    {/* 展開時の詳細 */}
                    {expandedCard === report.id && (
                      <div className="px-4 py-3 border-t bg-background-main/20">
                        <div className="mb-2">
                          <span className="text-sm font-semibold text-accent-primary">
                            {report.staff?.name}の日報
                          </span>
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
                        <div className="mt-3 text-xs text-text-sub">
                          提出時刻: {format(new Date(report.createdAt), 'HH:mm:ss', { locale: ja })}
                        </div>
                        
                        {/* コメント表示 */}
                        {report.comments && report.comments.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm font-semibold mb-2">コメント</div>
                            {report.comments.map((comment: any) => (
                              <div key={comment.id} className="mb-2">
                                {comment.hasBonus && (
                                  <div className="mb-2">
                                    <div className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-yellow-400 text-white rounded-full shadow-lg animate-pulse">
                                      <span className="text-xl mr-2">✨🎁✨</span>
                                      <span className="font-bold">賞与がプレゼントされました！</span>
                                    </div>
                                  </div>
                                )}
                                <div className="p-3 bg-accent-primary/5 rounded-lg border border-accent-primary/20">
                                  <div className="flex items-start gap-2">
                                    {comment.emoji && <span className="text-2xl">{comment.emoji}</span>}
                                    <div className="flex-1">
                                      {comment.comment && (
                                        <p className="text-sm">{comment.comment}</p>
                                      )}
                                      <p className="text-xs text-text-sub mt-1">
                                        {comment.createdBy === 'owner' ? 'オーナー' : '店長'} から • 
                                        {format(new Date(comment.createdAt), 'M/d HH:mm')}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : selectedDate ? (
              <p className="text-text-sub text-center py-8">
                この日の日報はありません
              </p>
            ) : (
              <p className="text-text-sub text-center py-8">
                カレンダーから日付を選択してください
              </p>
            )}
          </div>

          {/* 統計情報 */}
          {selectedDate && selectedDateReports && selectedDateReports.length > 0 && (
            <div className="mt-4 p-4 bg-background-main rounded-lg">
              <div className="text-sm text-text-sub">
                <p>選択日の日報: {selectedDateReports.length}件</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}