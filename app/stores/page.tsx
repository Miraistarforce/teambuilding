'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';
import { Building2 } from 'lucide-react';

interface Store {
  id: number;
  name: string;
  requireStorePassword: boolean;
}

export default function StoreList() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedCompanyName = sessionStorage.getItem('companyName');
    if (!storedCompanyName) {
      router.push('/company/access');
      return;
    }
    setCompanyName(storedCompanyName);
    fetchStores();
  }, [router]);

  const fetchStores = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const data = await res.json();
        setStores(data);
      } else {
        toast.error('店舗一覧の取得に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (storeId: number) => {
    sessionStorage.setItem('selectedStoreId', storeId.toString());
    router.push(`/store/${storeId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{companyName}</h1>
          <p className="text-gray-600">店舗を選択してください</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stores.map((store) => (
            <Card
              key={store.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleStoreSelect(store.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-8 w-8 text-blue-600" />
                  {store.requireStorePassword && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      パスワード必要
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="mb-2">{store.name}</CardTitle>
                <CardDescription>タップして入店</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {stores.length === 0 && (
          <Card className="mt-6">
            <CardContent className="text-center py-12">
              <p className="text-gray-500">店舗が登録されていません</p>
              <p className="text-sm text-gray-400 mt-2">
                管理者に店舗の登録を依頼してください
              </p>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <Link href="/company/access">
            <Button variant="outline">別の会社でログイン</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}