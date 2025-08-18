'use client';

import { useState, useEffect } from 'react';
import { Shield, Building2, Store, Key, Power, Trash2, Plus, Copy, CheckCircle, XCircle, Settings, Users, Activity, TrendingUp } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  createdAt: Date;
  stores: Store[];
  apiKey: string;
  isActive: boolean;
}

interface Store {
  id: string;
  name: string;
  requireStorePassword: boolean;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminSecret, setAdminSecret] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', password: '' });
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [copiedApiKey, setCopiedApiKey] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalStores: 0,
    recentActivity: [] as any[],
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchCompanies();
      fetchStats();
    }
  }, [isAuthenticated]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSecret }),
    });

    if (res.ok) {
      setIsAuthenticated(true);
      localStorage.setItem('adminAuth', 'true');
    } else {
      alert('認証に失敗しました');
    }
  };

  const fetchCompanies = async () => {
    const res = await fetch('/api/companies');
    if (res.ok) {
      const data = await res.json();
      setCompanies(data);
    }
  };

  const fetchStats = async () => {
    const res = await fetch('/api/stats');
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCompany),
    });

    if (res.ok) {
      fetchCompanies();
      setShowCreateForm(false);
      setNewCompany({ name: '', password: '' });
    }
  };

  const handleToggleStatus = async (id: string) => {
    const res = await fetch(`/api/companies/${id}/toggle`, {
      method: 'POST',
    });

    if (res.ok) {
      fetchCompanies();
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm('本当に削除しますか？')) return;
    
    const res = await fetch(`/api/companies/${id}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      fetchCompanies();
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    setCopiedApiKey(apiKey);
    setTimeout(() => setCopiedApiKey(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-700/50">
            <div className="flex justify-center mb-8">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg">
                <Shield className="h-10 w-10 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-center text-sm mb-8">
              TeamBuild システム管理
            </p>

            <form onSubmit={handleAuth} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  管理者シークレット
                </label>
                <input
                  type="password"
                  value={adminSecret}
                  onChange={(e) => setAdminSecret(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="シークレットキーを入力"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all"
              >
                <Key className="inline mr-2 h-5 w-5" />
                認証
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              Port: 3100 | Backend System
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-purple-400" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                TeamBuild Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-400">Port: 3100</span>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  localStorage.removeItem('adminAuth');
                }}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-8 w-8 text-purple-400" />
              <span className="text-2xl font-bold text-white">{stats.totalCompanies}</span>
            </div>
            <p className="text-slate-400 text-sm">登録企業数</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Activity className="h-8 w-8 text-green-400" />
              <span className="text-2xl font-bold text-white">{stats.activeCompanies}</span>
            </div>
            <p className="text-slate-400 text-sm">アクティブ企業</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <Store className="h-8 w-8 text-blue-400" />
              <span className="text-2xl font-bold text-white">{stats.totalStores}</span>
            </div>
            <p className="text-slate-400 text-sm">総店舗数</p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-pink-400" />
              <span className="text-2xl font-bold text-white">+12%</span>
            </div>
            <p className="text-slate-400 text-sm">成長率</p>
          </div>
        </div>

        {/* Companies Section */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">企業管理</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all"
            >
              <Plus className="inline mr-2 h-4 w-4" />
              新規登録
            </button>
          </div>

          {showCreateForm && (
            <div className="mb-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
              <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="会社名"
                  className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <input
                  type="password"
                  value={newCompany.password}
                  onChange={(e) => setNewCompany({ ...newCompany, password: e.target.value })}
                  placeholder="パスワード"
                  className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  作成
                </button>
              </form>
            </div>
          )}

          {/* Companies Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">状態</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">会社名</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">店舗数</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">API Key</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">登録日</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(company.id)}
                        className={`p-1 rounded-lg transition-colors ${
                          company.isActive 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {company.isActive ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-500" />
                        <span className="text-white font-medium">{company.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-300">{company.stores.length} 店舗</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">
                          {company.apiKey.substring(0, 12)}...
                        </code>
                        <button
                          onClick={() => copyApiKey(company.apiKey)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedApiKey === company.apiKey ? (
                            <CheckCircle className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-400">
                      {new Date(company.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedCompany(company.id)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {companies.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">企業が登録されていません</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Company Details */}
        {selectedCompany && (
          <div className="mt-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {companies.find(c => c.id === selectedCompany)?.name} - 店舗一覧
              </h3>
              <button
                onClick={() => setSelectedCompany(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.find(c => c.id === selectedCompany)?.stores.map((store) => (
                <div key={store.id} className="p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-medium">{store.name}</span>
                  </div>
                  {store.requireStorePassword && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">
                      パスワード保護
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}