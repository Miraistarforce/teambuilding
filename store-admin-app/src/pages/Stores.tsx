import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi } from '../lib/api';
import StoreForm from '../components/StoreForm';
import EditStoreModal from '../components/EditStoreModal';

export default function Stores() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: storesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => storesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setEditingStore(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: storesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-semibold">店舗一覧</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          新規店舗登録
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-text-sub">読み込み中...</div>
      ) : stores?.length === 0 ? (
        <div className="bg-background-main rounded-lg p-12 text-center">
          <p className="text-text-sub">登録されている店舗はありません</p>
        </div>
      ) : (
        <div className="bg-background-main rounded-lg shadow-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  店舗名
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  店長パスワード
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  オーナーパスワード
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  スタッフ数
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  登録日
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  状態
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-text-sub">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {stores?.map((store: any) => (
                <tr key={store.id} className="border-b hover:bg-background-sub transition-colors">
                  <td className="px-6 py-4 font-medium">{store.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-text-sub">
                    <span className="text-text-help">********</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-text-sub">
                    <span className="text-text-help">********</span>
                  </td>
                  <td className="px-6 py-4 text-text-sub">
                    {store._count?.staff || 0} 名
                  </td>
                  <td className="px-6 py-4 text-text-sub">
                    {formatDate(store.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        store.isActive
                          ? 'bg-accent-success/10 text-accent-success'
                          : 'bg-text-help/10 text-text-help'
                      }`}
                    >
                      {store.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingStore(store)}
                      className="text-accent-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('この店舗を削除してもよろしいですか？')) {
                          deleteMutation.mutate(store.id);
                        }
                      }}
                      className="text-accent-error hover:underline"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && (
        <StoreForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowAddForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingStore && (
        <EditStoreModal
          store={editingStore}
          onSubmit={(data) => updateMutation.mutate({ id: editingStore.id, data })}
          onClose={() => setEditingStore(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}