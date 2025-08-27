import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { staffApi, reportsApi } from '../lib/api';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';
import { isJapaneseHoliday, getHolidayName } from '../utils/salaryCalculation';
import { calculatePayWithNightShift } from '../utils/nightShiftCalculation';
import { parseJSTDate, formatDateJapanese, formatTimeJST } from '../utils/dateUtils';

interface StaffSalaryProps {
  store: { id: number; name: string };
}

export default function StaffSalary({ store }: StaffSalaryProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // デフォルトは今月
    return format(new Date(), 'yyyy-MM');
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: () => staffApi.getByStore(store.id),
  });

  // 選択された月の開始日と終了日を計算
  const getMonthRange = () => {
    const date = new Date(selectedMonth + '-01');
    return {
      start: format(startOfMonth(date), 'yyyy-MM-dd'),
      end: format(endOfMonth(date), 'yyyy-MM-dd'),
      month: date
    };
  };

  const { start, end, month } = getMonthRange();

  // 給与データを取得
  const { data: salaryData, isLoading, error } = useQuery({
    queryKey: ['salary', selectedStaffId, start, end],
    queryFn: async () => {
      if (!selectedStaffId) return null;
      
      try {
        // スタッフの詳細情報と正社員設定を取得
        const staffStats = await staffApi.getStats(selectedStaffId);
        const isMonthlyEmployee = staffStats?.isMonthlyEmployee || false;
        
        // レポートAPIから勤怠データを取得
        console.log('Fetching report for store:', store.id, 'start:', start, 'end:', end);
        const records = await reportsApi.getReport(store.id, start, end, 'detail');
        console.log('Records received:', records);
        
        // 選択したスタッフのデータのみフィルタリング
        const staffRecords = records.filter((r: any) => r.staffId === selectedStaffId);
        
        if (staffRecords.length === 0) {
          console.warn('No records found for staff ID:', selectedStaffId);
          return null;
        }
        
        // 最初のレコードから給与設定を取得（全レコードで同じはず）
        const firstRecord = staffRecords[0];
        const staffInfo = {
          id: selectedStaffId,
          name: firstRecord.staffName,
          hourlyWage: firstRecord.hourlyWage,
          holidayAllowance: firstRecord.holidayAllowance,
          overtimeRate: firstRecord.overtimeRate,
          otherAllowance: firstRecord.otherAllowance,
          transportationAllowance: firstRecord.transportationAllowance || 0,
          hasTransportation: firstRecord.hasTransportation || false,
          isMonthlyEmployee
        };
        console.log('Staff info from records:', staffInfo);
        
        // 勤務データの集計
        let totalWorkMinutes = 0;
        let totalBreakMinutes = 0;
        let workDays = 0;
        let totalNightShiftPay = 0;
        let totalNightMinutes = 0;
        const dailyRecords: any[] = [];
        
        staffRecords.forEach((record: any) => {
          if (record.workMinutes > 0 && record.clockIn && record.clockOut) {
            totalWorkMinutes += record.workMinutes;
            totalBreakMinutes += record.totalBreak || 0;
            workDays++;
            
            const date = parseJSTDate(record.date);
            
            // 深夜労働を考慮した給与計算
            const payDetails = calculatePayWithNightShift(
              new Date(record.clockIn),
              new Date(record.clockOut),
              record.totalBreak || 0,
              record.hourlyWage || 0,
              record.overtimeRate || 1.25
            );
            
            // 祝日手当を追加
            let dailyPay = payDetails.totalPay;
            if (isJapaneseHoliday(date)) {
              const holidayBonus = (record.workMinutes / 60) * (record.holidayAllowance || 0);
              dailyPay += Math.floor(holidayBonus);
            }
            
            totalNightShiftPay += payDetails.nightShiftPay + payDetails.nightOvertimePay;
            totalNightMinutes += payDetails.nightMinutes + payDetails.nightOvertimeMinutes;
            
            dailyRecords.push({
              date: record.date,
              clockIn: record.clockIn,
              clockOut: record.clockOut,
              workMinutes: record.workMinutes,
              breakMinutes: record.totalBreak || 0,
              dailyPay,
              isHoliday: isJapaneseHoliday(date),
              holidayName: getHolidayName(date),
              overtimeMinutes: payDetails.overtimeMinutes + payDetails.nightOvertimeMinutes,
              nightMinutes: payDetails.nightMinutes + payDetails.nightOvertimeMinutes,
              nightShiftPay: payDetails.nightShiftPay + payDetails.nightOvertimePay
            });
          }
        });
        
        // 月給制正社員の場合は、実際の勤務記録から残業を計算
        if (isMonthlyEmployee) {
          // 正社員設定を取得
          const employeeSettings = await staffApi.getEmployeeSettings(selectedStaffId);
          const scheduledStartTime = employeeSettings?.scheduledStartTime || '09:00';
          const scheduledEndTime = employeeSettings?.scheduledEndTime || '18:00';
          const includeEarlyArrivalAsOvertime = employeeSettings?.includeEarlyArrivalAsOvertime || false;
          
          const [startHour, startMin] = scheduledStartTime.split(':').map(Number);
          const [endHour, endMin] = scheduledEndTime.split(':').map(Number);
          
          let totalOvertimeMinutes = 0;
          
          // 各勤務日の残業時間を計算
          staffRecords.forEach((record: any) => {
            if (record.clockIn && record.clockOut && record.workMinutes > 0) {
              // デバイスのローカルタイムで日付を処理（日本時間として扱う）
              const clockInDate = new Date(record.clockIn);
              const clockOutDate = new Date(record.clockOut);
              
              // 出勤・退勤時刻を取得（ローカルタイム）
              const clockInHour = clockInDate.getHours();
              const clockInMin = clockInDate.getMinutes();
              const clockOutHour = clockOutDate.getHours();
              const clockOutMin = clockOutDate.getMinutes();
              
              // 出勤・退勤を分単位に変換
              const clockInMinutes = clockInHour * 60 + clockInMin;
              const clockOutMinutes = clockOutHour * 60 + clockOutMin;
              
              // 定時を分単位に変換
              const scheduledStartMinutes = startHour * 60 + startMin;
              const scheduledEndMinutes = endHour * 60 + endMin;
              
              console.log('残業計算デバッグ:', {
                date: record.date,
                clockIn: `${clockInHour}:${String(clockInMin).padStart(2, '0')}`,
                clockOut: `${clockOutHour}:${String(clockOutMin).padStart(2, '0')}`,
                scheduledStart: `${startHour}:${String(startMin).padStart(2, '0')}`,
                scheduledEnd: `${endHour}:${String(endMin).padStart(2, '0')}`,
                clockInMinutes,
                clockOutMinutes,
                scheduledStartMinutes,
                scheduledEndMinutes,
                workMinutes: record.workMinutes
              });
              
              let dayOvertimeMinutes = 0;
              
              // 月給制の場合、定時外の実働時間のみを残業として計算
              // 定時内の勤務時間は基本給に含まれるため残業にはならない
              
              // 実際の勤務時間（分）
              const actualWorkMinutes = record.workMinutes || 0;
              
              // 定時外勤務の計算
              if (clockInMinutes >= scheduledEndMinutes) {
                // 定時終了後に出勤した場合、全勤務時間が残業
                dayOvertimeMinutes = actualWorkMinutes;
                console.log(`定時後出勤の残業: ${actualWorkMinutes}分`);
              } else if (clockOutMinutes > scheduledEndMinutes) {
                // 定時前に出勤し、定時後に退勤した場合
                // 定時終了から退勤までの実働時間が残業
                const overtimeStart = Math.max(clockInMinutes, scheduledEndMinutes);
                const overtimeEnd = clockOutMinutes;
                dayOvertimeMinutes = overtimeEnd - overtimeStart;
                console.log(`定時後の残業: ${dayOvertimeMinutes}分`);
              }
              
              // 早出残業を計算（設定が有効な場合）
              if (includeEarlyArrivalAsOvertime) {
                if (clockOutMinutes <= scheduledStartMinutes) {
                  // 定時開始前に退勤した場合、全勤務時間が残業
                  dayOvertimeMinutes = actualWorkMinutes;
                  console.log(`定時前退勤の早出残業: ${actualWorkMinutes}分`);
                } else if (clockInMinutes < scheduledStartMinutes) {
                  // 定時前に出勤し、定時後に退勤した場合
                  // 出勤から定時開始までの実働時間が早出残業
                  const earlyOvertimeStart = clockInMinutes;
                  const earlyOvertimeEnd = Math.min(clockOutMinutes, scheduledStartMinutes);
                  const earlyOvertime = earlyOvertimeEnd - earlyOvertimeStart;
                  dayOvertimeMinutes += earlyOvertime;
                  console.log(`早出残業: ${earlyOvertime}分`);
                }
              }
              
              // 実働時間を超えない範囲で残業時間を制限
              dayOvertimeMinutes = Math.min(dayOvertimeMinutes, actualWorkMinutes);
              
              console.log(`${record.date}の残業時間: ${dayOvertimeMinutes}分`);
              
              // 負の値を防ぐ
              totalOvertimeMinutes += Math.max(0, dayOvertimeMinutes);
            }
          });
          
          // 残業代を計算（時給換算 × 残業時間 × 残業倍率）
          const hourlyWage = employeeSettings?.currentHourlyWage || staffInfo.hourlyWage || 0;
          const overtimeRate = staffInfo.overtimeRate || 1.25;
          const overtimePay = Math.floor((totalOvertimeMinutes / 60) * hourlyWage * overtimeRate);
          
          // 交通費を計算（出勤日数 × 1日あたりの交通費）
          const transportationPay = staffInfo.hasTransportation ? workDays * staffInfo.transportationAllowance : 0;
          
          console.log('残業計算結果:', {
            totalOvertimeMinutes,
            totalOvertimeHours: totalOvertimeMinutes / 60,
            hourlyWage,
            overtimeRate,
            overtimePay,
            transportationPay,
            workDays
          });
          
          return {
            staffName: staffInfo.name,
            hourlyWage: null, // 月給制では時給を表示しない
            holidayAllowance: 0, // 月給制では祝日手当なし
            overtimeRate: overtimeRate,
            otherAllowance: 0, // 月給制ではその他手当なし
            hasTransportation: staffInfo.hasTransportation,
            transportationAllowance: staffInfo.transportationAllowance,
            totalWorkMinutes,
            totalBreakMinutes,
            workDays,
            totalSalary: overtimePay + transportationPay, // 月給制では残業代と交通費のみ
            regularPay: null, // 月給制では基本給を表示しない
            overtimePay: overtimePay,
            holidayPay: 0,
            otherPay: 0,
            transportationPay,
            totalOvertimeMinutes: totalOvertimeMinutes,
            holidayWorkDays: 0,
            isMonthlyEmployee: true,
            dailyRecords: dailyRecords.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            )
          };
        }
        
        // 時給制の場合（深夜手当は既に計算済み）
        // 各日の給与を合計
        let totalRegularPay = 0;
        let totalOvertimePay = 0;
        let totalHolidayPay = 0;
        let totalOvertimeMinutes = 0;
        let holidayWorkDays = 0;
        
        dailyRecords.forEach(record => {
          if (record.isHoliday) {
            holidayWorkDays++;
            totalHolidayPay += (record.workMinutes / 60) * (staffInfo.holidayAllowance || 0);
          }
          totalOvertimeMinutes += record.overtimeMinutes || 0;
        });
        
        // 日次給与の合計から深夜手当を除いた基本給を計算
        const dailyPayTotal = dailyRecords.reduce((sum, r) => sum + r.dailyPay, 0);
        totalRegularPay = dailyPayTotal - totalNightShiftPay - Math.floor(totalHolidayPay) - 
                         Math.floor((totalOvertimeMinutes / 60) * staffInfo.hourlyWage * (staffInfo.overtimeRate - 1));
        totalOvertimePay = Math.floor((totalOvertimeMinutes / 60) * staffInfo.hourlyWage * (staffInfo.overtimeRate - 1));
        
        // 交通費を計算（出勤日数 × 1日あたりの交通費）
        const transportationPay = staffInfo.hasTransportation ? workDays * staffInfo.transportationAllowance : 0;
        
        return {
          staffName: staffInfo.name,
          hourlyWage: staffInfo.hourlyWage,
          holidayAllowance: staffInfo.holidayAllowance || 0,
          overtimeRate: staffInfo.overtimeRate || 1.25,
          otherAllowance: staffInfo.otherAllowance || 0,
          hasTransportation: staffInfo.hasTransportation,
          transportationAllowance: staffInfo.transportationAllowance,
          totalWorkMinutes,
          totalBreakMinutes,
          workDays,
          totalSalary: dailyPayTotal + transportationPay + staffInfo.otherAllowance,
          regularPay: Math.floor(totalRegularPay),
          overtimePay: Math.floor(totalOvertimePay),
          holidayPay: Math.floor(totalHolidayPay),
          nightShiftPay: totalNightShiftPay,
          nightMinutes: totalNightMinutes,
          otherPay: staffInfo.otherAllowance || 0,
          transportationPay,
          totalOvertimeMinutes,
          holidayWorkDays,
          isMonthlyEmployee: false,
          dailyRecords: dailyRecords.sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )
        };
      } catch (err) {
        console.error('給与データ取得エラー:', err);
        throw err;
      }
    },
    enabled: !!selectedStaffId && !!staffList,
    retry: 1,
  });

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins.toString().padStart(2, '0')}分`;
  };

  const formatDate = (dateString: string) => {
    return formatDateJapanese(dateString);
  };

  const formatTime = (dateString: string | null) => {
    return formatTimeJST(dateString);
  };

  // 月選択用のオプションを生成（過去6ヶ月）
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'yyyy年M月', { locale: ja })
    };
  });

  // エラー表示
  if (error) {
    const isAuthError = String(error).includes('401');
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-accent-error/10 border border-accent-error rounded-lg p-4">
          <p className="text-accent-error">
            {isAuthError 
              ? 'セッションの有効期限が切れました。もう一度ログインしてください。' 
              : 'エラーが発生しました。ページを更新してもう一度お試しください。'}
          </p>
          {!isAuthError && <p className="text-sm text-text-sub mt-2">{String(error)}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* 選択フォーム */}
      <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">スタッフ選択</label>
            <select
              value={selectedStaffId || ''}
              onChange={(e) => setSelectedStaffId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="">スタッフを選択してください</option>
              {staffList?.map((staff: any) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">月選択</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {monthOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && selectedStaffId && (
        <div className="bg-background-main rounded-lg shadow-subtle p-12 text-center">
          <p className="text-text-sub">データを読み込んでいます...</p>
        </div>
      )}

      {/* 給与情報表示 */}
      {!isLoading && selectedStaffId && salaryData && (
        <>
          {/* サマリーカード */}
          <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {salaryData.staffName}さんの{format(month, 'yyyy年M月', { locale: ja })}給与
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-background-sub rounded-lg">
                <p className="text-sm text-text-sub mb-1">時給</p>
                <p className="text-xl font-bold">
                  {salaryData.isMonthlyEmployee ? 'ー' : `¥${(salaryData.hourlyWage || 0).toLocaleString()}`}
                </p>
              </div>
              <div className="p-4 bg-background-sub rounded-lg">
                <p className="text-sm text-text-sub mb-1">勤務日数</p>
                <p className="text-xl font-bold">{salaryData.workDays || 0}日</p>
              </div>
              <div className="p-4 bg-background-sub rounded-lg">
                <p className="text-sm text-text-sub mb-1">総勤務時間</p>
                <p className="text-xl font-bold">{formatMinutes(salaryData.totalWorkMinutes || 0)}</p>
              </div>
              <div className="p-4 bg-accent-primary/10 rounded-lg">
                <p className="text-sm text-accent-primary mb-1">
                  {salaryData.isMonthlyEmployee ? '残業代' : '給与総額'}
                </p>
                <p className="text-2xl font-bold text-accent-primary">
                  ¥{(salaryData.totalSalary || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* 給与内訳 */}
            <div className="mb-6 p-4 bg-background-sub rounded-lg">
              <h4 className="text-sm font-semibold mb-3">給与内訳</h4>
              <div className="space-y-2 text-sm">
                {salaryData.isMonthlyEmployee ? (
                  // 月給制の場合
                  <>
                    <div className="flex justify-between">
                      <span>基本給:</span>
                      <span className="font-medium">ー</span>
                    </div>
                    {salaryData.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span>残業代 ({formatMinutes(salaryData.totalOvertimeMinutes)} × {salaryData.overtimeRate}倍):</span>
                        <span className="font-medium">¥{salaryData.overtimePay.toLocaleString()}</span>
                      </div>
                    )}
                    {salaryData.transportationPay > 0 && (
                      <div className="flex justify-between">
                        <span>交通費 ({salaryData.workDays}日 × ¥{salaryData.transportationAllowance}):</span>
                        <span className="font-medium">¥{salaryData.transportationPay.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>合計:</span>
                      <span className="text-accent-primary">¥{salaryData.totalSalary.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  // 時給制の場合
                  <>
                    <div className="flex justify-between">
                      <span>基本給:</span>
                      <span className="font-medium">¥{(salaryData.regularPay || 0).toLocaleString()}</span>
                    </div>
                    {salaryData.overtimePay > 0 && (
                      <div className="flex justify-between">
                        <span>残業代 ({formatMinutes(salaryData.totalOvertimeMinutes)} × {salaryData.overtimeRate}倍):</span>
                        <span className="font-medium">¥{salaryData.overtimePay.toLocaleString()}</span>
                      </div>
                    )}
                    {salaryData.holidayPay > 0 && (
                      <div className="flex justify-between">
                        <span>祝日手当 ({salaryData.holidayWorkDays}日):</span>
                        <span className="font-medium">¥{salaryData.holidayPay.toLocaleString()}</span>
                      </div>
                    )}
                    {salaryData.nightShiftPay && salaryData.nightShiftPay > 0 && (
                      <div className="flex justify-between">
                        <span>深夜手当 ({formatMinutes(salaryData.nightMinutes || 0)}):</span>
                        <span className="font-medium">¥{salaryData.nightShiftPay.toLocaleString()}</span>
                      </div>
                    )}
                    {salaryData.otherPay > 0 && (
                      <div className="flex justify-between">
                        <span>その他手当:</span>
                        <span className="font-medium">¥{salaryData.otherPay.toLocaleString()}</span>
                      </div>
                    )}
                    {salaryData.transportationPay > 0 && (
                      <div className="flex justify-between">
                        <span>交通費 ({salaryData.workDays}日 × ¥{salaryData.transportationAllowance}):</span>
                        <span className="font-medium">¥{salaryData.transportationPay.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-semibold">
                      <span>合計:</span>
                      <span className="text-accent-primary">¥{salaryData.totalSalary.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 詳細情報 */}
            <div className="border-t pt-4">
              <p className="text-sm text-text-sub">
                総休憩時間: {formatMinutes(salaryData.totalBreakMinutes || 0)}
              </p>
            </div>
          </div>

          {/* 日別詳細 */}
          {salaryData.dailyRecords.length > 0 ? (
            <div className="bg-background-main rounded-lg shadow-subtle overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">勤務詳細</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-background-sub">
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">日付</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">出勤</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">退勤</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">勤務時間</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">休憩</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">残業</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">深夜</th>
                      <th className="text-right px-6 py-3 text-sm font-medium text-text-sub">日給</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryData.dailyRecords.map((record: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-background-sub/50 transition-colors">
                        <td className="px-6 py-4 text-sm">
                          {formatDate(record.date)}
                          {record.isHoliday && (
                            <span className="ml-1 text-xs text-accent-warning" title={record.holidayName || '祝日'}>
                              (祝)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">{formatTime(record.clockIn)}</td>
                        <td className="px-6 py-4 text-sm">{formatTime(record.clockOut)}</td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {formatMinutes(record.workMinutes)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-sub">
                          {formatMinutes(record.breakMinutes)}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-sub">
                          {record.overtimeMinutes > 0 ? formatMinutes(record.overtimeMinutes) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-text-sub">
                          {record.nightMinutes > 0 ? formatMinutes(record.nightMinutes) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-right">
                          ¥{record.dailyPay.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-background-sub">
                      <td colSpan={7} className="px-6 py-4 text-sm font-semibold">合計</td>
                      <td className="px-6 py-4 text-right font-bold text-accent-primary">
                        ¥{(salaryData.totalSalary || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-background-main rounded-lg shadow-subtle p-6">
              <p className="text-center text-text-sub">この月の勤務記録はありません</p>
            </div>
          )}
        </>
      )}

      {/* データがない場合 */}
      {!isLoading && selectedStaffId && !salaryData && !error && (
        <div className="bg-background-main rounded-lg shadow-subtle p-12 text-center">
          <p className="text-text-sub">
            {format(month, 'yyyy年M月', { locale: ja })}の勤務データがありません
          </p>
        </div>
      )}

      {/* 未選択の場合 */}
      {!selectedStaffId && (
        <div className="bg-background-main rounded-lg shadow-subtle p-12 text-center">
          <p className="text-text-sub">
            スタッフと月を選択して給与情報を確認してください
          </p>
        </div>
      )}
    </div>
  );
}