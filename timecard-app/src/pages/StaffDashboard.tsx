import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StaffTimecard from './StaffTimecard';
import StaffSalary from './StaffSalary';
import DailyReport from './DailyReport';
import MyDailyReports from './MyDailyReports';

interface StaffDashboardProps {
  store: { id: number; name: string };
  onBack: () => void;
}

export default function StaffDashboard({ store, onBack }: StaffDashboardProps) {
  const [activeTab, setActiveTab] = useState<'timecard' | 'salary' | 'report' | 'myreports'>('timecard');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background-sub">
      <header className="bg-background-main border-b px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">チムビル</h1>
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
              onClick={() => setActiveTab('timecard')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'timecard'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              出退勤
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
              onClick={() => setActiveTab('report')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'report'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              日報
            </button>
            <button
              onClick={() => setActiveTab('myreports')}
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
                activeTab === 'myreports'
                  ? 'bg-background-sub text-text-main'
                  : 'text-text-sub hover:text-text-main'
              }`}
            >
              送信した日報
            </button>
          </div>
        </div>
      </header>

      <main>
        {activeTab === 'timecard' && (
          <StaffTimecard store={store} onBack={onBack} isEmbedded />
        )}
        {activeTab === 'salary' && (
          <div className="max-w-6xl mx-auto p-6">
            <StaffSalary store={store} />
          </div>
        )}
        {activeTab === 'report' && (
          <div className="max-w-6xl mx-auto p-6">
            <DailyReport store={store} />
          </div>
        )}
        {activeTab === 'myreports' && (
          <div className="max-w-6xl mx-auto p-6">
            <MyDailyReports store={store} />
          </div>
        )}
      </main>
    </div>
  );
}