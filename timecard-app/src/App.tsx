import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CompanyLogin from './pages/CompanyLogin';
import StoreSelect from './pages/StoreSelect';
import RoleSelect from './pages/RoleSelect';
import StaffDashboard from './pages/StaffDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import DailyReportPublic from './pages/DailyReportPublic';
import { useState, useEffect } from 'react';

export interface SessionData {
  company?: { id: number; name: string };
  store?: { id: number; name: string };
  role?: 'staff' | 'manager' | 'owner';
}

function App() {
  // localStorageから初期値を復元
  const [session, setSession] = useState<SessionData>(() => {
    const saved = localStorage.getItem('timecardSession');
    return saved ? JSON.parse(saved) : {};
  });

  // セッションが更新されたらlocalStorageにも保存
  useEffect(() => {
    if (Object.keys(session).length > 0) {
      localStorage.setItem('timecardSession', JSON.stringify(session));
    }
  }, [session]);

  const updateSession = (data: Partial<SessionData>) => {
    setSession(prev => ({ ...prev, ...data }));
  };

  const resetSession = () => {
    setSession({});
    localStorage.removeItem('timecardToken');
    localStorage.removeItem('timecardSession');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<CompanyLogin onNext={(company) => updateSession({ company })} />}
        />
        <Route
          path="/store-select"
          element={
            session.company ? (
              <StoreSelect
                company={session.company}
                onNext={(store) => updateSession({ store })}
                onBack={resetSession}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/role-select"
          element={
            session.company && session.store ? (
              <RoleSelect
                company={session.company}
                store={session.store}
                onNext={(role) => updateSession({ role })}
                onBack={() => updateSession({ store: undefined })}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/timecard"
          element={
            session.store && session.role === 'staff' ? (
              <StaffDashboard
                store={session.store}
                onBack={() => updateSession({ role: undefined })}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            session.store && (session.role === 'manager' || session.role === 'owner') ? (
              <ManagerDashboard
                store={session.store}
                role={session.role}
                onBack={() => updateSession({ role: undefined })}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/daily-report/:token"
          element={<DailyReportPublic />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;