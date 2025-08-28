import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, timeRecordsApi, fetchCSRFToken } from '../lib/api';

interface StaffTimecardProps {
  store: { id: number; name: string };
  onBack: () => void;
  isEmbedded?: boolean;
}

interface SelectedStaff {
  id: number;
  name: string;
}

// ローカルストレージのキーを生成（店舗IDと日付を含む）
const getStorageKey = (storeId: number) => {
  const today = new Date();
  // 午前4時を基準に日付を判定
  if (today.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  const dateStr = today.toISOString().split('T')[0];
  return `timecard_staff_${storeId}_${dateStr}`;
};

// 古いデータをクリーンアップ
const cleanupOldData = () => {
  const today = new Date();
  if (today.getHours() < 4) {
    today.setDate(today.getDate() - 1);
  }
  const todayStr = today.toISOString().split('T')[0];
  
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('timecard_staff_')) {
      const dateMatch = key.match(/\d{4}-\d{2}-\d{2}$/);
      if (dateMatch && dateMatch[0] !== todayStr) {
        localStorage.removeItem(key);
      }
    }
  });
};

export default function StaffTimecard({ store, onBack, isEmbedded = false }: StaffTimecardProps) {
  const navigate = useNavigate();
  const storageKey = getStorageKey(store.id);
  
  // 初期状態をローカルストレージから読み込み
  const [selectedStaffList, setSelectedStaffList] = useState<SelectedStaff[]>(() => {
    cleanupOldData(); // 古いデータをクリーンアップ
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  });

  const { data: staffList } = useQuery({
    queryKey: ['staff', store.id],
    queryFn: () => staffApi.getByStore(store.id),
  });

  const [toast, setToast] = useState<string | null>(null);

  // CSRFトークンを取得
  useEffect(() => {
    fetchCSRFToken();
  }, []);

  // スタッフリストが変更されたらローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(selectedStaffList));
  }, [selectedStaffList, storageKey]);

  // 午前4時に自動リセット
  useEffect(() => {
    const checkAndReset = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // 午前4時0分〜4時1分の間にリセット
      if (hours === 4 && minutes === 0) {
        cleanupOldData();
        setSelectedStaffList([]);
      }
    };

    // 1分ごとにチェック
    const interval = setInterval(checkAndReset, 60000);
    
    // 初回チェック
    checkAndReset();
    
    return () => clearInterval(interval);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleStaffAdd = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = Number(e.target.value);
    if (!staffId) return;
    
    const staff = staffList?.find((s: any) => s.id === staffId);
    if (staff && !selectedStaffList.find(s => s.id === staffId)) {
      const newList = [...selectedStaffList, { id: staffId, name: staff.name }];
      setSelectedStaffList(newList);
      showToast(`${staff.name}さんを追加しました`);
    }
    
    // プルダウンをリセット
    e.target.value = '';
  };

  const handleStaffRemove = (staffId: number, staffName: string) => {
    setSelectedStaffList(selectedStaffList.filter(s => s.id !== staffId));
    showToast(`${staffName}さんのカードを削除しました`);
  };

  // 埋め込みモードの場合はヘッダーなし
  if (isEmbedded) {
    return (
      <>
        <div className="max-w-6xl mx-auto p-6">
        {/* スタッフ選択（常に表示） */}
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">スタッフを追加</label>
            <span className="text-xs text-text-sub">
              ※カードは午前4時にリセットされます
            </span>
          </div>
          <select
            onChange={handleStaffAdd}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-lg"
            defaultValue=""
          >
            <option value="">スタッフを選択してください</option>
            {staffList?.filter((staff: any) => 
              !selectedStaffList.find(s => s.id === staff.id)
            ).map((staff: any) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        {/* 選択したスタッフのカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedStaffList.map((staff) => (
            <StaffCard
              key={staff.id}
              staffId={staff.id}
              staffName={staff.name}
              onRemove={() => handleStaffRemove(staff.id, staff.name)}
              showToast={showToast}
            />
          ))}
        </div>

        {selectedStaffList.length === 0 && (
          <div className="text-center py-12 text-text-sub">
            <p>上のプルダウンからスタッフを選択してください</p>
          </div>
        )}
        </div>

        {toast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-text-main text-white px-6 py-3 rounded-lg shadow-lg z-50">
            {toast}
          </div>
        )}
      </>
    );
  }

  // 通常モード（スタンドアロン）
  return (
    <div className="min-h-screen bg-background-sub">
      <header className="bg-background-main border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">チムビル出退勤</h1>
            <p className="text-sm text-text-sub">{store.name}</p>
          </div>
          <button
            onClick={() => {
              onBack();
              navigate('/role-select');
            }}
            className="text-text-sub hover:text-text-main transition-colors"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* スタッフ選択（常に表示） */}
        <div className="bg-background-main rounded-lg shadow-subtle p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium">スタッフを追加</label>
            <span className="text-xs text-text-sub">
              ※カードは午前4時にリセットされます
            </span>
          </div>
          <select
            onChange={handleStaffAdd}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary text-lg"
            defaultValue=""
          >
            <option value="">スタッフを選択してください</option>
            {staffList?.filter((staff: any) => 
              !selectedStaffList.find(s => s.id === staff.id)
            ).map((staff: any) => (
              <option key={staff.id} value={staff.id}>
                {staff.name}
              </option>
            ))}
          </select>
        </div>

        {/* 選択したスタッフのカード一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedStaffList.map((staff) => (
            <StaffCard
              key={staff.id}
              staffId={staff.id}
              staffName={staff.name}
              onRemove={() => handleStaffRemove(staff.id, staff.name)}
              showToast={showToast}
            />
          ))}
        </div>

        {selectedStaffList.length === 0 && (
          <div className="text-center py-12 text-text-sub">
            <p>上のプルダウンからスタッフを選択してください</p>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-text-main text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

// 個別のスタッフカードコンポーネント
function StaffCard({ 
  staffId, 
  staffName, 
  onRemove, 
  showToast 
}: { 
  staffId: number; 
  staffName: string; 
  onRemove: () => void;
  showToast: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  
  const { data: timeRecord, refetch: refetchRecord } = useQuery({
    queryKey: ['timeRecord', staffId],
    queryFn: () => timeRecordsApi.getTodayRecord(staffId),
    refetchInterval: 60000, // 1分ごとに更新
    staleTime: 0, // 常に最新データを取得
    gcTime: 0, // キャッシュを保持しない
  });

  // 勤務時間を動的に更新するための状態
  const [, forceUpdate] = useState({});

  // 1分ごとに勤務時間の表示を更新
  useEffect(() => {
    if (timeRecord?.clockIn && !timeRecord?.clockOut) {
      const interval = setInterval(() => {
        forceUpdate({});
      }, 60000); // 1分ごとに更新

      return () => clearInterval(interval);
    }
  }, [timeRecord]);

  const clockInMutation = useMutation({
    mutationFn: () => timeRecordsApi.clockIn(staffId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['timeRecord', staffId] });
      await refetchRecord();
      showToast(`${staffName}さんが出勤しました`);
    },
    onError: () => {
      showToast(`エラーが発生しました`);
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: () => timeRecordsApi.clockOut(staffId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['timeRecord', staffId] });
      await refetchRecord();
      showToast(`${staffName}さんが退勤しました`);
    },
    onError: () => {
      showToast(`エラーが発生しました`);
    }
  });

  const breakStartMutation = useMutation({
    mutationFn: () => timeRecordsApi.breakStart(staffId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['timeRecord', staffId] });
      await refetchRecord();
      showToast(`${staffName}さんが休憩を開始しました`);
    },
    onError: () => {
      showToast(`エラーが発生しました`);
    }
  });

  const breakEndMutation = useMutation({
    mutationFn: () => timeRecordsApi.breakEnd(staffId),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['timeRecord', staffId] });
      await refetchRecord();
      showToast(`${staffName}さんが休憩を終了しました`);
    },
    onError: () => {
      showToast(`エラーが発生しました`);
    }
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins.toString().padStart(2, '0')}分`;
  };

  const calculateCurrentWorkTime = () => {
    if (!timeRecord || !timeRecord.clockIn) return '0時間00分';
    
    const start = new Date(timeRecord.clockIn);
    const end = timeRecord.clockOut ? new Date(timeRecord.clockOut) : new Date();
    const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    const workMinutes = totalMinutes - (timeRecord.totalBreak || 0);
    
    return formatMinutes(Math.max(0, workMinutes));
  };

  // 新しい日かどうかを判定（午前4時基準）
  const isNewDay = () => {
    if (!timeRecord) return false;
    
    // 退勤していない場合は新しい日ではない
    if (!timeRecord.clockOut) return false;
    
    const now = new Date();
    const clockIn = new Date(timeRecord.clockIn);
    
    // 出勤時刻が現在の「今日」と同じなら、新しい日ではない（すでに今日出勤している）
    const currentToday = new Date(now);
    if (now.getHours() < 4) {
      currentToday.setDate(currentToday.getDate() - 1);
    }
    currentToday.setHours(0, 0, 0, 0);
    
    const clockInDay = new Date(clockIn);
    if (clockIn.getHours() < 4) {
      clockInDay.setDate(clockInDay.getDate() - 1);
    }
    clockInDay.setHours(0, 0, 0, 0);
    
    // 出勤日が今日と同じ場合は、新しい日ではない
    if (clockInDay.getTime() === currentToday.getTime()) {
      return false;
    }
    
    // 出勤日が今日より前で、退勤済みなら新しい日
    return clockInDay < currentToday;
  };

  const isWorking = timeRecord && timeRecord.status === 'WORKING';
  const isOnBreak = timeRecord && timeRecord.status === 'ON_BREAK';
  const hasClockIn = timeRecord && timeRecord.clockIn;
  const hasClockOut = timeRecord && timeRecord.clockOut;
  const shouldShowClockIn = !hasClockIn || (hasClockOut && isNewDay());

  return (
    <div className="bg-background-main rounded-lg shadow-subtle p-6 relative">
      {/* 削除ボタン */}
      <button
        onClick={onRemove}
        className="absolute top-2 right-2 text-text-help hover:text-text-sub transition-colors"
        title="カードを削除"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* スタッフ名と状態 */}
      <div className="mb-4">
        <h3 className="text-xl font-bold">{staffName}</h3>
        {hasClockIn && !isNewDay() && (
          <div className="mt-2 space-y-1">
            <p className="text-sm text-accent-success">
              出勤 {formatTime(timeRecord.clockIn)}
            </p>
            {isOnBreak && (
              <span className="inline-flex px-2 py-1 text-xs bg-accent-warning/10 text-accent-warning rounded-full">
                休憩中
              </span>
            )}
            {hasClockOut && (
              <p className="text-sm text-text-sub">
                退勤 {formatTime(timeRecord.clockOut)}
              </p>
            )}
          </div>
        )}
        {(!hasClockIn || isNewDay()) && (
          <p className="text-sm text-text-sub mt-1">未出勤</p>
        )}
      </div>

      {/* ボタン */}
      <div className="space-y-2">
        {shouldShowClockIn && (
          <button
            onClick={() => clockInMutation.mutate()}
            disabled={clockInMutation.isPending}
            className="w-full bg-accent-success text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
          >
            {clockInMutation.isPending ? '処理中...' : '出勤'}
          </button>
        )}

        {hasClockIn && !hasClockOut && !isNewDay() && (
          <div className="flex gap-2">
            {isWorking && (
              <button
                onClick={() => breakStartMutation.mutate()}
                disabled={breakStartMutation.isPending}
                className="flex-1 bg-accent-warning text-white py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {breakStartMutation.isPending ? '...' : '休憩'}
              </button>
            )}
            {isOnBreak && (
              <button
                onClick={() => breakEndMutation.mutate()}
                disabled={breakEndMutation.isPending}
                className="flex-1 bg-accent-primary text-white py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {breakEndMutation.isPending ? '...' : '休憩終了'}
              </button>
            )}
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="flex-1 bg-accent-error text-white py-2 px-3 rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
            >
              {clockOutMutation.isPending ? '...' : '退勤'}
            </button>
          </div>
        )}

        {hasClockOut && !isNewDay() && (
          <div className="text-center py-2 px-3 bg-background-sub rounded-lg">
            <span className="text-sm text-text-sub">本日の業務終了</span>
          </div>
        )}
      </div>

      {/* 勤務状況 */}
      {hasClockIn && !isNewDay() && (
        <div className="mt-4 pt-4 border-t space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-sub">勤務時間</span>
            <span className="font-medium">{calculateCurrentWorkTime()}</span>
          </div>
          {timeRecord.totalBreak > 0 && (
            <div className="flex justify-between">
              <span className="text-text-sub">休憩時間</span>
              <span className="font-medium">{formatMinutes(timeRecord.totalBreak)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}