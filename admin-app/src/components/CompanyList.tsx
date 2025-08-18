interface Company {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  _count?: { stores: number };
}

interface CompanyListProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (id: number) => void;
}

export default function CompanyList({ companies, onEdit, onDelete }: CompanyListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  if (companies.length === 0) {
    return (
      <div className="bg-background-main rounded-lg p-12 text-center">
        <p className="text-text-sub">登録されている会社はありません</p>
      </div>
    );
  }

  return (
    <div className="bg-background-main rounded-lg shadow-subtle overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
              会社名
            </th>
            <th className="text-left px-6 py-4 text-sm font-medium text-text-sub">
              店舗数
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
          {companies.map((company) => (
            <tr key={company.id} className="border-b hover:bg-background-sub transition-colors">
              <td className="px-6 py-4 font-medium">{company.name}</td>
              <td className="px-6 py-4 text-text-sub">
                {company._count?.stores || 0} 店舗
              </td>
              <td className="px-6 py-4 text-text-sub">
                {formatDate(company.createdAt)}
              </td>
              <td className="px-6 py-4">
                <span
                  className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    company.isActive
                      ? 'bg-accent-success/10 text-accent-success'
                      : 'bg-text-help/10 text-text-help'
                  }`}
                >
                  {company.isActive ? 'アクティブ' : '非アクティブ'}
                </span>
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                <button
                  onClick={() => onEdit(company)}
                  className="text-accent-primary hover:underline"
                >
                  編集
                </button>
                <button
                  onClick={() => onDelete(company.id)}
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
  );
}