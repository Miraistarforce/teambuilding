import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '../lib/api';
import CompanyList from '../components/CompanyList';
import CompanyForm from '../components/CompanyForm';
import EditCompanyModal from '../components/EditCompanyModal';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: companiesApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => companiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditingCompany(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: companiesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-background-sub">
      <aside className="fixed top-0 left-0 w-64 h-full bg-background-main border-r">
        <div className="p-6">
          <h1 className="text-xl font-semibold mb-8">チムビル管理</h1>
          
          <nav className="space-y-2">
            <a
              href="#"
              className="block px-3 py-2 rounded-lg bg-background-sub text-text-main font-medium"
            >
              会社管理
            </a>
          </nav>

          <button
            onClick={handleLogout}
            className="absolute bottom-6 left-6 text-text-sub hover:text-text-main transition-colors"
          >
            ログアウト
          </button>
        </div>
      </aside>

      <main className="ml-64 p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-semibold">会社一覧</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-accent-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
            >
              新規会社登録
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-text-sub">読み込み中...</div>
          ) : (
            <CompanyList
              companies={companies || []}
              onEdit={setEditingCompany}
              onDelete={(id) => {
                if (confirm('この会社を削除してもよろしいですか？')) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          )}
        </div>
      </main>

      {showAddForm && (
        <CompanyForm
          onSubmit={(data) => createMutation.mutate(data)}
          onClose={() => setShowAddForm(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {editingCompany && (
        <EditCompanyModal
          company={editingCompany}
          onSubmit={(data) => updateMutation.mutate({ id: editingCompany.id, data })}
          onClose={() => setEditingCompany(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}