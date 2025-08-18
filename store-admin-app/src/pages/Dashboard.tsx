import { Routes, Route, NavLink } from 'react-router-dom';
import Stores from './Stores';
import Staff from './Staff';
import Reports from './Reports';
import { useEffect, useState } from 'react';

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const companyData = localStorage.getItem('companyData');
    if (companyData) {
      const company = JSON.parse(companyData);
      setCompanyName(company.name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('storeToken');
    localStorage.removeItem('companyData');
    onLogout();
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-lg transition-colors ${
      isActive
        ? 'bg-background-sub text-text-main font-medium'
        : 'text-text-sub hover:text-text-main hover:bg-background-sub/50'
    }`;

  return (
    <div className="min-h-screen bg-background-sub">
      <aside className="fixed top-0 left-0 w-64 h-full bg-background-main border-r">
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-xl font-semibold">チムビル店舗管理</h1>
            <p className="text-sm text-text-sub mt-1">{companyName}</p>
          </div>
          
          <nav className="space-y-2">
            <NavLink to="/stores" className={navLinkClass}>
              店舗管理
            </NavLink>
            <NavLink to="/staff" className={navLinkClass}>
              スタッフ管理
            </NavLink>
            <NavLink to="/reports" className={navLinkClass}>
              レポート
            </NavLink>
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
        <Routes>
          <Route path="/" element={<Stores />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </main>
    </div>
  );
}