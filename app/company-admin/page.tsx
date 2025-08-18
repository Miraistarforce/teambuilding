'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';
import { Building2, Plus, Trash2, Download, Key, Shield, Home } from 'lucide-react';

interface Company {
  id: number;
  name: string;
}

export default function CompanyAdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
    }
  }, [isAuthenticated]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSecret === 'demo-admin-secret' || adminSecret === process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      setIsAuthenticated(true);
      toast.success('認証成功');
    } else {
      toast.error('管理者シークレットが正しくありません');
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await fetch(`/api/company?secret=${adminSecret}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, adminSecret }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('会社を作成しました');
        setName('');
        setPassword('');
        setShowCreateForm(false);
        
        // Generate QR code
        const qrRes = await fetch(`/api/company/qrcode?companyId=${data.company.id}`);
        if (qrRes.ok) {
          const blob = await qrRes.blob();
          const url = URL.createObjectURL(blob);
          setQrCodeUrl(url);
        }
        
        fetchCompanies();
      } else {
        toast.error(data.error || '作成に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;

    try {
      const res = await fetch(`/api/company?id=${id}&secret=${adminSecret}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('会社を削除しました');
        fetchCompanies();
      } else {
        toast.error('削除に失敗しました');
      }
    } catch (error) {
      toast.error('エラーが発生しました');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-center mb-8">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white text-center mb-2">
              会社管理システム
            </h1>
            <p className="text-slate-400 text-center text-sm mb-8">
              弊社専用管理画面
            </p>

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <Label htmlFor="adminSecret" className="text-slate-300 text-sm">
                  管理者シークレット
                </Label>
                <Input
                  id="adminSecret"
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  placeholder="シークレットキーを入力"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold"
              >
                <Key className="mr-2 h-4 w-4" />
                認証
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/" className="text-sm text-slate-400 hover:text-slate-300">
                <Home className="inline mr-1 h-3 w-3" />
                トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">会社管理システム</h1>
            <p className="text-slate-400">登録企業の管理</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              新規会社登録
            </Button>
            <Link href="/">
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <Home className="mr-2 h-4 w-4" />
                トップへ
              </Button>
            </Link>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 border border-slate-700">
            <h2 className="text-xl font-semibold text-white mb-4">新規会社登録</h2>
            <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="text-slate-300">会社名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="会社名を入力"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-slate-300">パスワード</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="パスワードを設定"
                  required
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  キャンセル
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                >
                  {loading ? '作成中...' : '会社を作成'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {qrCodeUrl && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-8 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">会社ログインQRコード</h3>
            <div className="flex items-center gap-6">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 bg-white rounded-lg p-2" />
              <div className="flex-1">
                <p className="text-slate-300 mb-3">
                  このQRコードを印刷して会社に配布してください。
                  スタッフはこのQRコードから店舗アクセス画面に直接アクセスできます。
                </p>
                <a href={qrCodeUrl} download="company-qr.png">
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                    <Download className="mr-2 h-4 w-4" />
                    QRコードをダウンロード
                  </Button>
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">登録済み会社一覧</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">ID</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">会社名</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">登録日</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                    <td className="py-3 px-4 text-sm text-slate-300">#{company.id}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <span className="text-white font-medium">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {new Date().toLocaleDateString('ja-JP')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(company.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {companies.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">会社が登録されていません</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            管理者シークレット: demo-admin-secret（開発用）
          </p>
        </div>
      </div>
    </div>
  );
}