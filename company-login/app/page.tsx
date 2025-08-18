'use client';

import { useState, useEffect } from 'react';
import { Building2, Lock, LogIn, Shield, Globe, Server, Activity, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

export default function CompanyLogin() {
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if already logged in
    const session = api.getStoredSession();
    if (session) {
      // Redirect to main app
      window.location.href = `http://localhost:3000/company/${session.company.id}/stores`;
    }
    setIsChecking(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.verifyCompany(companyName, password);
      
      if (response.success && response.company) {
        // Generate and store session
        const token = api.generateSessionToken(response.company);
        api.storeSession(response.company, token);
        
        // Show success animation
        const button = document.getElementById('login-button');
        if (button) {
          button.classList.add('animate-pulse');
        }
        
        // Redirect to main app
        setTimeout(() => {
          window.location.href = response.redirectUrl || 'http://localhost:3000';
        }, 500);
      } else {
        setError(response.error || 'ログインに失敗しました');
        // Shake animation on error
        const form = document.getElementById('login-form');
        if (form) {
          form.classList.add('animate-shake');
          setTimeout(() => form.classList.remove('animate-shake'), 500);
        }
      }
    } catch (err) {
      setError('サーバーエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin">
          <Shield className="h-12 w-12 text-white/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.5s;
        }
      `}</style>
      
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 opacity-10">
          <Globe className="h-96 w-96 text-white" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <Server className="h-96 w-96 text-white" />
        </div>
        <div className="absolute top-1/2 left-1/4 opacity-5">
          <Activity className="h-64 w-64 text-white" />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-xl rounded-3xl mb-6">
            <Building2 className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            TeamBuild
          </h1>
          <p className="text-white/70">
            企業ログインポータル
          </p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              Port: 3200
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Backend System
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <form id="login-form" onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                会社名
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-xl"
                  placeholder="会社名を入力"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">
                パスワード
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-transparent backdrop-blur-xl"
                  placeholder="パスワードを入力"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-100 text-sm">
                {error}
              </div>
            )}

            <button
              id="login-button"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl backdrop-blur-xl border border-white/30 transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                  認証中...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  ログイン
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="mt-6 p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-yellow-300 mt-0.5" />
              <div className="text-xs text-white/60">
                <p className="font-medium text-white/80 mb-1">デモアカウント</p>
                <p>会社名: デモ会社</p>
                <p>パスワード: demo123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/40">
            © 2024 TeamBuild Backend Systems
          </p>
          <p className="text-xs text-white/30 mt-1">
            企業管理システムへのアクセスは管理者にお問い合わせください
          </p>
        </div>
      </div>
    </div>
  );
}