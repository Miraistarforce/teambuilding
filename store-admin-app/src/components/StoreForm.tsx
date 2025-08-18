import { useState } from 'react';

interface StoreFormProps {
  onSubmit: (data: { name: string; managerPassword: string; ownerPassword: string }) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function StoreForm({ onSubmit, onClose, isLoading }: StoreFormProps) {
  const [name, setName] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (managerPassword.length < 4) {
      setError('店長パスワードは4文字以上で設定してください');
      return;
    }

    if (ownerPassword.length < 4) {
      setError('オーナーパスワードは4文字以上で設定してください');
      return;
    }

    onSubmit({ name, managerPassword, ownerPassword });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-main rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-6">新規店舗登録</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              店舗名
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="managerPassword" className="block text-sm font-medium mb-2">
              店長パスワード
            </label>
            <input
              id="managerPassword"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
            <p className="text-xs text-text-sub mt-1">店長権限でのログインに使用します</p>
          </div>

          <div>
            <label htmlFor="ownerPassword" className="block text-sm font-medium mb-2">
              オーナーパスワード
            </label>
            <input
              id="ownerPassword"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
            <p className="text-xs text-text-sub mt-1">オーナー権限でのログインに使用します</p>
          </div>

          {error && (
            <div className="text-accent-error text-sm">{error}</div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-sub hover:text-text-main transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '登録中...' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}