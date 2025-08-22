import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { timeRecordsApi } from '../lib/api';
import StaffSalary from './StaffSalary';
import Interview from './Interview';
import InterviewHistory from './InterviewHistory';
import DailyReportList from './DailyReportList';
import Settings from './Settings';
import StaffManagement from './StaffManagement';
import ImagesGallery from './ImagesGallery';

interface ManagerDashboardProps {
  store: { id: number; name: string };
  role: 'manager' | 'owner';
  onBack: () => void;
}

export default function ManagerDashboard({ store, role, onBack }: ManagerDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'attendance' | 'salary' | 'staff' | 'interview' | 'history' | 'reports' | 'images' | 'settings'>('attendance');
  
  const { data: todayRecords, refetch } = useQuery({
    queryKey: ['todayRecords', store.id],
    queryFn: () => timeRecordsApi.getTodayRecords(store.id),
    refetchInterval: 60000, // 1分ごとに更新
    enabled: activeTab === 'attendance',
  });

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${mins.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      NOT_STARTED: { text: '未出勤', class: 'bg-text-help/10 text-text-help' },
      WORKING: { text: '勤務中', class: 'bg-accent-primary/10 text-accent-primary' },
      ON_BREAK: { text: '休憩中', class: 'bg-accent-warning/10 text-accent-warning' },
      FINISHED: { text: '退勤済', class: 'bg-accent-success/10 text-accent-success' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.NOT_STARTED;
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${config.class}`}>
        {config.text}
      </span>
    );
  };

  const calculateStats = () => {
    if (!todayRecords) return { total: 0, working: 0, onBreak: 0, finished: 0 };
    
    return {
      total: todayRecords.length,
      working: todayRecords.filter((r: any) => r.status === 'WORKING').length,
      onBreak: todayRecords.filter((r: any) => r.status === 'ON_BREAK').length,
      finished: todayRecords.filter((r: any) => r.status === 'FINISHED').length,
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-background-sub">
      <header className="bg-background-main border-b px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">
                {role === 'owner' ? 'オーナー' : '店長'}ダッシュボード
              </h1>
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
          
          {/* タブナビゲーション */}
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'attendance'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              勤怠管理
            </button>
            <button
              onClick={() => setActiveTab('salary')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'salary'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              給与
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'staff'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              スタッフ
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'interview'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              面談
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              面談記録
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              日報一覧
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'images'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              画像
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              設定
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {activeTab === 'attendance' && (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-background-main rounded-lg p-4">
                <div className="text-sm text-text-sub mb-1">総スタッフ数</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
              <div className="bg-background-main rounded-lg p-4">
                <div className="text-sm text-text-sub mb-1">勤務中</div>
                <div className="text-2xl font-bold text-accent-primary">{stats.working}</div>
              </div>
              <div className="bg-background-main rounded-lg p-4">
                <div className="text-sm text-text-sub mb-1">休憩中</div>
                <div className="text-2xl font-bold text-accent-warning">{stats.onBreak}</div>
              </div>
              <div className="bg-background-main rounded-lg p-4">
                <div className="text-sm text-text-sub mb-1">退勤済</div>
                <div className="text-2xl font-bold text-accent-success">{stats.finished}</div>
              </div>
            </div>

            <div className="bg-background-main rounded-lg shadow-subtle">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-semibold">本日の勤務状況</h2>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-accent-primary hover:underline"
                >
                  更新
                </button>
              </div>
              
              {!todayRecords || todayRecords.length === 0 ? (
                <div className="p-12 text-center text-text-sub">
                  本日の勤務データはありません
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          スタッフ名
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          状態
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          出勤
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          退勤
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          休憩
                        </th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-text-sub">
                          勤務時間
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {todayRecords.map((record: any) => (
                        <tr key={record.id} className="border-b hover:bg-background-sub transition-colors">
                          <td className="px-6 py-4 font-medium">
                            {record.staff.name}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(record.status)}
                          </td>
                          <td className="px-6 py-4">
                            {formatTime(record.clockIn)}
                          </td>
                          <td className="px-6 py-4">
                            {formatTime(record.clockOut)}
                          </td>
                          <td className="px-6 py-4">
                            {record.totalBreak ? formatMinutes(record.totalBreak) : '-'}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {record.workMinutes ? formatMinutes(record.workMinutes) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-6 text-center text-sm text-text-sub">
              データは1分ごとに自動更新されます
            </div>
          </>
        )}
        {activeTab === 'salary' && (
          <StaffSalary store={store} />
        )}
        {activeTab === 'staff' && (
          <StaffManagement store={store} />
        )}
        {activeTab === 'interview' && (
          <Interview store={store} role={role} />
        )}
        {activeTab === 'history' && (
          <InterviewHistory store={store} role={role} />
        )}
        {activeTab === 'reports' && (
          <DailyReportList store={store} role={role} />
        )}
        {activeTab === 'images' && (
          <ImagesGallery store={store} role={role} />
        )}
        {activeTab === 'settings' && (
          <Settings store={store} role={role} />
        )}
      </main>
    </div>
  );
}