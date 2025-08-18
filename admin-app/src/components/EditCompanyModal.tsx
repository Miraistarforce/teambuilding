import { useState } from 'react';

interface EditCompanyModalProps {
  company: {
    id: number;
    name: string;
    isActive: boolean;
  };
  onSubmit: (data: Partial<{ name: string; password: string; isActive: boolean }>) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function EditCompanyModal({ company, onSubmit, onClose, isLoading }: EditCompanyModalProps) {
  const [name, setName] = useState(company.name);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isActive, setIsActive] = useState(company.isActive);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password && password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (password && password.length < 6) {
      setError('パスワードは6文字以上で設定してください');
      return;
    }

    const updateData: any = { isActive };
    if (name !== company.name) updateData.name = name;
    if (password) updateData.password = password;

    onSubmit(updateData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-main rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-6">会社情報編集</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
              会社名
            </label>
            <input
              id="edit-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="edit-password" className="block text-sm font-medium mb-2">
              新しいパスワード（変更する場合のみ）
            </label>
            <input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="変更しない場合は空欄"
            />
          </div>

          {password && (
            <div>
              <label htmlFor="edit-confirmPassword" className="block text-sm font-medium mb-2">
                新しいパスワード（確認）
              </label>
              <input
                id="edit-confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              />
            </div>
          )}

          <div className="flex items-center">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="isActive" className="text-sm">
              アクティブ状態
            </label>
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
              {isLoading ? '更新中...' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}