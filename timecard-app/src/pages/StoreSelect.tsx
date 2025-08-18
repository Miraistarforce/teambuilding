import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storesApi } from '../lib/api';

interface StoreSelectProps {
  company: { id: number; name: string };
  onNext: (store: { id: number; name: string }) => void;
  onBack: () => void;
}

export default function StoreSelect({ company, onNext, onBack }: StoreSelectProps) {
  const [stores, setStores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const data = await storesApi.getByCompany(company.id);
        setStores(data);
      } catch (error) {
        console.error('Failed to fetch stores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStores();
  }, [company.id]);

  const handleStoreSelect = (store: { id: number; name: string }) => {
    onNext(store);
    navigate('/role-select');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-sub">
      <div className="bg-background-main p-8 rounded-lg shadow-subtle w-full max-w-md">
        <button
          onClick={() => {
            onBack();
            navigate('/');
          }}
          className="mb-4 text-text-sub hover:text-text-main transition-colors"
        >
          ← 戻る
        </button>

        <h2 className="text-2xl font-semibold mb-2">店舗選択</h2>
        <p className="text-text-sub mb-6">{company.name}</p>

        {isLoading ? (
          <div className="text-center py-8 text-text-sub">読み込み中...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-8 text-text-sub">
            利用可能な店舗がありません
          </div>
        ) : (
          <div className="space-y-3">
            {stores.map((store) => (
              <button
                key={store.id}
                onClick={() => handleStoreSelect({ id: store.id, name: store.name })}
                className="w-full p-4 text-left border rounded-lg hover:bg-background-sub transition-colors"
              >
                <div className="font-medium">{store.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}