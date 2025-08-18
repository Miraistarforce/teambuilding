import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storesApi, staffApi } from '../lib/api';
import StaffForm from '../components/StaffForm';
import EditStaffModal from '../components/EditStaffModal';

export default function Staff() {
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: storesApi.getAll,
  });

  const { data: staff, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff', selectedStoreId],
    queryFn: () => selectedStoreId ? staffApi.getByStore(selectedStoreId) : Promise.resolve([]),
    enabled: !!selectedStoreId,
  });

  useEffect(() => {
    if (stores && stores.length > 0 && !selectedStoreId) {
      setSelectedStoreId(stores[0].id);
    }
  }, [stores, selectedStoreId]);

  const createMutation = useMutation({
    mutationFn: staffApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedStoreId] });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => staffApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedStoreId] });
      setEditingStaff(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: staffApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedStoreId] });
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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">スタッフ管理</h2>
        
        <div className="flex justify-between items-center">
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {stores?.map((store: any) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowAddForm(true)}
            disabled={!selectedStoreId}
            className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            新規スタッフ登録
          </button>
        </div>
      </div>

      {!selectedStoreId ? (
        <div className="bg-background-main rounded-lg p-12 text-center">
          <p className="text-text-sub">店舗を選択してください</p>
        </div>
      ) : isLoadingStaff ? (
        <div className="text-center py-12 text-text-sub">読み込み中...</div>
      ) : staff?.length === 0 ? (
        <div className="bg-background-main rounded-lg p-12 text-center">
          <p className="text-text-sub">登録されているスタッフはいません</p>
        </div>
      ) : (
        <div className="bg-background-main rounded-lg shadow-subtle overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  スタッフ名
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
                  時給
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
              {staff?.map((member: any) => (
                <tr key={member.id} className="border-b hover:bg-background-sub transition-colors">
                  <td className="px-6 py-4 font-medium">{member.name}</td>
                  <td className="px-6 py-4 text-text-sub">
                    ¥{member.hourlyWage.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-text-sub">
                    {formatDate(member.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        member.isActive
                          ? 'bg-accent-success/10 text-accent-success'
                          : 'bg-text-help/10 text-text-help'
                      }`}
                    >
                      {member.isActive ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setEditingStaff(member)}
                      className="text-accent-primary hover:underline"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('このスタッフを削除してもよろしいですか？')) {
                          deleteMutation.mutate(member.id);
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

      {showAddForm && selectedStoreId && (
        <StaffForm
          storeId={selectedStoreId}
          onSubmit={(data) => createMutation.mutate({ ...data, storeId: selectedStoreId })}
          onClose={() => setShowAddForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onSubmit={(data) => updateMutation.mutate({ id: editingStaff.id, data })}
          onClose={() => setEditingStaff(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}