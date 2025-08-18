import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storesApi, reportsApi } from '../lib/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function Reports() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  const getDateRange = () => {
    if (reportType === 'daily') {
      return { start: selectedDate, end: selectedDate };
    } else {
      const date = new Date(selectedMonth + '-01');
      return {
        start: format(startOfMonth(date), 'yyyy-MM-dd'),
        end: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    }
  };

  const { start, end } = getDateRange();

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['report', selectedStoreId, start, end, reportType],
    queryFn: () => 
      selectedStoreId 
        ? reportsApi.getReport(selectedStoreId, start, end, reportType === 'monthly' ? 'summary' : 'detail')
        : Promise.resolve([]),
    enabled: !!selectedStoreId,
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'HH:mm');
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };

  const exportCSV = () => {
    if (!reportData || reportData.length === 0) return;

    let csv = '';
    if (reportType === 'daily') {
      csv = 'スタッフ名,出勤時刻,退勤時刻,休憩時間,勤務時間\n';
      reportData.forEach((record: any) => {
        csv += `${record.staff.name},${formatTime(record.clockIn)},${formatTime(record.clockOut)},${formatMinutes(record.totalBreak)},${formatMinutes(record.workMinutes)}\n`;
      });
    } else {
      csv = 'スタッフ名,時給,総勤務時間,総休憩時間,勤務日数,給与\n';
      reportData.forEach((summary: any) => {
        const salary = Math.floor((summary.totalWorkMinutes / 60) * summary.hourlyWage);
        csv += `${summary.staffName},¥${summary.hourlyWage},${formatMinutes(summary.totalWorkMinutes)},${formatMinutes(summary.totalBreakMinutes)},${summary.days},¥${salary.toLocaleString()}\n`;
      });
    }

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${selectedStoreId}_${start}_${end}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">レポート</h2>
        
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">店舗</label>
            <select
              value={selectedStoreId || ''}
              onChange={(e) => setSelectedStoreId(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {stores?.map((store: any) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">レポート種別</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'daily' | 'monthly')}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="daily">日次</option>
              <option value="monthly">月次</option>
            </select>
          </div>

          {reportType === 'daily' ? (
            <div>
              <label className="block text-sm font-medium mb-2">日付</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">月</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          )}

          <button
            onClick={exportCSV}
            disabled={!reportData || reportData.length === 0}
            className="bg-accent-success text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            CSV出力
          </button>
        </div>
      </div>

      {!selectedStoreId ? (
        <div className="bg-background-main rounded-lg p-12 text-center">
          <p className="text-text-sub">店舗を選択してください</p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-text-sub">読み込み中...</div>
      ) : reportData?.length === 0 ? (
        <div className="bg-background-main rounded-lg p-12 text-center">
          <p className="text-text-sub">データがありません</p>
        </div>
      ) : (
        <div className="bg-background-main rounded-lg shadow-subtle overflow-hidden">
          {reportType === 'daily' ? (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    スタッフ名
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    出勤時刻
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    退勤時刻
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    休憩時間
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    勤務時間
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    状態
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData?.map((record: any) => (
                  <tr key={record.id} className="border-b hover:bg-background-sub transition-colors">
                    <td className="px-6 py-4 font-medium">{record.staff.name}</td>
                    <td className="px-6 py-4">{formatTime(record.clockIn)}</td>
                    <td className="px-6 py-4">{formatTime(record.clockOut)}</td>
                    <td className="px-6 py-4">{formatMinutes(record.totalBreak)}</td>
                    <td className="px-6 py-4">{formatMinutes(record.workMinutes)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          record.status === 'FINISHED'
                            ? 'bg-accent-success/10 text-accent-success'
                            : record.status === 'WORKING'
                            ? 'bg-accent-primary/10 text-accent-primary'
                            : record.status === 'ON_BREAK'
                            ? 'bg-accent-warning/10 text-accent-warning'
                            : 'bg-text-help/10 text-text-help'
                        }`}
                      >
                        {record.status === 'FINISHED' ? '退勤済' : 
                         record.status === 'WORKING' ? '勤務中' :
                         record.status === 'ON_BREAK' ? '休憩中' : '未出勤'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    スタッフ名
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    時給
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    総勤務時間
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    総休憩時間
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    勤務日数
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                    給与
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData?.map((summary: any, index: number) => {
                  const salary = Math.floor((summary.totalWorkMinutes / 60) * summary.hourlyWage);
                  return (
                    <tr key={index} className="border-b hover:bg-background-sub transition-colors">
                      <td className="px-6 py-4 font-medium">{summary.staffName}</td>
                      <td className="px-6 py-4">¥{summary.hourlyWage.toLocaleString()}</td>
                      <td className="px-6 py-4">{formatMinutes(summary.totalWorkMinutes)}</td>
                      <td className="px-6 py-4">{formatMinutes(summary.totalBreakMinutes)}</td>
                      <td className="px-6 py-4">{summary.days}日</td>
                      <td className="px-6 py-4 font-medium">¥{salary.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}