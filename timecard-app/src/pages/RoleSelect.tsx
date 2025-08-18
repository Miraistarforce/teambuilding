import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';

interface RoleSelectProps {
  company: { id: number; name: string };
  store: { id: number; name: string };
  onNext: (role: 'staff' | 'manager' | 'owner') => void;
  onBack: () => void;
}

export default function RoleSelect({ company, store, onNext, onBack }: RoleSelectProps) {
  const [showPasswordModal, setShowPasswordModal] = useState<'manager' | 'owner' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleStaffSelect = () => {
    onNext('staff');
    navigate('/timecard');
  };

  const handleRoleWithPassword = async (role: 'manager' | 'owner') => {
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.storeLogin(company.name, store.name, password, role);
      localStorage.setItem('timecardToken', response.token);
      onNext(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'パスワードが正しくありません');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-sub">
      <div className="bg-background-main p-8 rounded-lg shadow-subtle w-full max-w-md">
        <button
          onClick={() => {
            onBack();
            navigate('/store-select');
          }}
          className="mb-4 text-text-sub hover:text-text-main transition-colors"
        >
          ← 戻る
        </button>

        <h2 className="text-2xl font-semibold mb-2">役割選択</h2>
        <p className="text-text-sub mb-6">{store.name}</p>

        <div className="space-y-3">
          <button
            onClick={handleStaffSelect}
            className="w-full p-6 border rounded-lg hover:bg-background-sub transition-colors"
          >
            <div className="text-xl font-medium mb-2">スタッフ</div>
            <div className="text-sm text-text-sub">出退勤の打刻を行います</div>
          </button>

          <button
            onClick={() => setShowPasswordModal('manager')}
            className="w-full p-6 border rounded-lg hover:bg-background-sub transition-colors"
          >
            <div className="text-xl font-medium mb-2">店長</div>
            <div className="text-sm text-text-sub">スタッフの勤怠管理を行います</div>
          </button>

          <button
            onClick={() => setShowPasswordModal('owner')}
            className="w-full p-6 border rounded-lg hover:bg-background-sub transition-colors"
          >
            <div className="text-xl font-medium mb-2">オーナー</div>
            <div className="text-sm text-text-sub">全ての管理機能を利用できます</div>
          </button>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background-main rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">
              {showPasswordModal === 'manager' ? '店長' : 'オーナー'}パスワード
            </h3>
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRoleWithPassword(showPasswordModal);
              }}
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary mb-4"
                placeholder="パスワードを入力"
                autoFocus
                required
              />

              {error && (
                <div className="text-accent-error text-sm mb-4">{error}</div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(null);
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 text-text-sub hover:text-text-main transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? '確認中...' : 'ログイン'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}