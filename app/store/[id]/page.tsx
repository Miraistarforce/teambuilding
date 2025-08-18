'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { User, UserCog, Crown } from 'lucide-react';

interface Store {
  id: number;
  name: string;
  requireStorePassword: boolean;
}

export default function StoreTop() {
  const router = useRouter();
  const params = useParams();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<Store | null>(null);
  const [storePassword, setStorePassword] = useState('');
  const [showStorePasswordInput, setShowStorePasswordInput] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [pin, setPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStore();
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const res = await fetch('/api/stores');
      if (res.ok) {
        const stores = await res.json();
        const currentStore = stores.find((s: Store) => s.id === parseInt(storeId));
        if (currentStore) {
          setStore(currentStore);
          if (currentStore.requireStorePassword) {
            setShowStorePasswordInput(true);
          }
        } else {
          toast.error('店舗が見つかりません');
          router.push('/stores');
        }
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
    if (role === 'staff') {
      // Staff doesn't need PIN
      handleLogin();
    } else {
      setShowPinInput(true);
    }
  };

  const handleLogin = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/auth/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: parseInt(storeId),
          storePassword: store?.requireStorePassword ? storePassword : undefined,
          roleType: selectedRole,
          pin: selectedRole !== 'staff' ? pin : undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('roleType', selectedRole);
        sessionStorage.setItem('storeId', storeId);
        
        if (selectedRole === 'staff') {
          router.push('/staff');
        } else if (selectedRole === 'manager') {
          router.push('/manager');
        } else if (selectedRole === 'owner') {
          router.push('/owner');
        }
      } else {
        toast.error(data.error || 'ログインに失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{store.name}</CardTitle>
          <CardDescription className="text-center">ロールを選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          {showStorePasswordInput && !showPinInput && (
            <div className="mb-6">
              <Label htmlFor="storePassword">店舗パスワード</Label>
              <Input
                id="storePassword"
                type="password"
                value={storePassword}
                onChange={(e) => setStorePassword(e.target.value)}
                placeholder="店舗パスワードを入力"
              />
            </div>
          )}

          {!showPinInput ? (
            <div className="space-y-3">
              <Button
                onClick={() => handleRoleSelect('staff')}
                className="w-full h-20 text-lg"
                variant="outline"
                disabled={store.requireStorePassword && !storePassword}
              >
                <User className="mr-2 h-6 w-6" />
                スタッフ
              </Button>
              <Button
                onClick={() => handleRoleSelect('manager')}
                className="w-full h-20 text-lg"
                variant="outline"
                disabled={store.requireStorePassword && !storePassword}
              >
                <UserCog className="mr-2 h-6 w-6" />
                店長
              </Button>
              <Button
                onClick={() => handleRoleSelect('owner')}
                className="w-full h-20 text-lg"
                variant="outline"
                disabled={store.requireStorePassword && !storePassword}
              >
                <Crown className="mr-2 h-6 w-6" />
                オーナー
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="pin">
                  {selectedRole === 'manager' ? '店長PIN' : 'オーナーPIN'}
                </Label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="PINを入力"
                  maxLength={6}
                />
              </div>
              <Button
                onClick={handleLogin}
                className="w-full"
                disabled={!pin || loading}
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </Button>
              <Button
                onClick={() => {
                  setShowPinInput(false);
                  setSelectedRole('');
                  setPin('');
                }}
                variant="outline"
                className="w-full"
              >
                戻る
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Button
              onClick={() => router.push('/stores')}
              variant="link"
              className="text-sm"
            >
              店舗一覧に戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}