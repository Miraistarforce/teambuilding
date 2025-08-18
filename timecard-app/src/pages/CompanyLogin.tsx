import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

interface CompanyLoginProps {
  onNext: (company: { id: number; name: string }) => void;
}

export default function CompanyLogin({ onNext }: CompanyLoginProps) {
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { data: suggestions } = useQuery({
    queryKey: ['companies', companyName],
    queryFn: () => authApi.searchCompanies(companyName),
    enabled: companyName.length > 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await authApi.companyLogin(companyName, password);
      onNext(response.company);
      navigate('/store-select');
    } catch (err: any) {
      setError(err.response?.data?.message || 'ログインに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-sub">
      <div className="bg-background-main p-8 rounded-lg shadow-subtle w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2 text-center">
          チムビル
        </h1>
        <p className="text-text-sub text-center mb-8">出退勤管理システム</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium mb-2">
              会社名
            </label>
            <input
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
              autoFocus
              list="company-suggestions"
            />
            {suggestions && suggestions.length > 0 && (
              <datalist id="company-suggestions">
                {suggestions.map((name: string) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          {error && (
            <div className="text-accent-error text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-accent-primary text-white py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {isLoading ? 'ログイン中...' : '次へ'}
          </button>
        </form>
      </div>
    </div>
  );
}