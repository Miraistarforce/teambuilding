import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<'staff' | 'interview' | 'history' | 'reports' | 'images' | 'settings'>('staff');

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