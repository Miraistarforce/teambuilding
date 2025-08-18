import { useState } from 'react';

interface EditStoreModalProps {
  store: {
    id: number;
    name: string;
    isActive: boolean;
  };
  onSubmit: (data: any) => void;
  onClose: () => void;
  isLoading?: boolean;
}

export default function EditStoreModal({ store, onSubmit, onClose, isLoading }: EditStoreModalProps) {
  const [name, setName] = useState(store.name);
  const [managerPassword, setManagerPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [isActive, setIsActive] = useState(store.isActive);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (managerPassword && managerPassword.length < 4) {
      setError('店長パスワードは4文字以上で設定してください');
      return;
    }

    if (ownerPassword && ownerPassword.length < 4) {
      setError('オーナーパスワードは4文字以上で設定してください');
      return;
    }

    const updateData: any = { isActive };
    if (name !== store.name) updateData.name = name;
    if (managerPassword) updateData.managerPassword = managerPassword;
    if (ownerPassword) updateData.ownerPassword = ownerPassword;

    onSubmit(updateData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background-main rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-6">店舗情報編集</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
              店舗名
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
            <label htmlFor="edit-managerPassword" className="block text-sm font-medium mb-2">
              新しい店長パスワード（変更する場合のみ）
            </label>
            <input
              id="edit-managerPassword"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="変更しない場合は空欄"
            />
          </div>

          <div>
            <label htmlFor="edit-ownerPassword" className="block text-sm font-medium mb-2">
              新しいオーナーパスワード（変更する場合のみ）
            </label>
            <input
              id="edit-ownerPassword"
              type="password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              placeholder="変更しない場合は空欄"
            />
          </div>

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