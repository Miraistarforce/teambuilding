'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Plus, Building2, LogOut } from 'lucide-react';

interface Store {
  id: number;
  name: string;
  requireStorePassword: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [storePassword, setStorePassword] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [ownerPin, setOwnerPin] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

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
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: storeName,
          requireStorePassword: requirePassword,
          storePassword: requirePassword ? storePassword : undefined,
          managerPin,
          ownerPin,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('店舗を作成しました');
        setShowCreateForm(false);
        setStoreName('');
        setRequirePassword(false);
        setStorePassword('');
        setManagerPin('');
        setOwnerPin('');
        fetchStores();
      } else {
        toast.error(data.error || '作成に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async (id: number) => {
    if (!confirm('本当に削除しますか？')) return;

    try {
      const res = await fetch(`/api/stores?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('店舗を削除しました');
        fetchStores();
      } else {
        toast.error('削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/company/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">会社管理者画面</h1>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold">店舗管理</h2>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="mr-2 h-4 w-4" />
            新規店舗作成
          </Button>
        </div>

        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>新規店舗作成</CardTitle>
              <CardDescription>新しい店舗を追加します</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateStore} className="space-y-4">
                <div>
                  <Label htmlFor="storeName">店舗名</Label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="店舗名を入力"
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requirePassword"
                    checked={requirePassword}
                    onChange={(e) => setRequirePassword(e.target.checked)}
                  />
                  <Label htmlFor="requirePassword">店舗パスワードを設定</Label>
                </div>

                {requirePassword && (
                  <div>
                    <Label htmlFor="storePassword">店舗パスワード</Label>
                    <Input
                      id="storePassword"
                      type="password"
                      value={storePassword}
                      onChange={(e) => setStorePassword(e.target.value)}
                      placeholder="店舗パスワードを設定"
                      required={requirePassword}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="managerPin">店長PIN</Label>
                  <Input
                    id="managerPin"
                    type="password"
                    value={managerPin}
                    onChange={(e) => setManagerPin(e.target.value)}
                    placeholder="店長用PINを設定"
                    maxLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="ownerPin">オーナーPIN</Label>
                  <Input
                    id="ownerPin"
                    type="password"
                    value={ownerPin}
                    onChange={(e) => setOwnerPin(e.target.value)}
                    placeholder="オーナー用PINを設定"
                    maxLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '作成中...' : '店舗を作成'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <Card key={store.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  {store.requireStorePassword && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      パスワード設定済
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-2">{store.name}</h3>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id)}
                  >
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {stores.length === 0 && !showCreateForm && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">店舗が登録されていません</p>
              <p className="text-sm text-gray-400 mt-2">
                「新規店舗作成」ボタンから店舗を追加してください
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}