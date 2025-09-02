import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'
);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// CSRFトークンを保存する変数
let csrfToken: string | null = null;

// CSRFトークンを取得
export const fetchCSRFToken = async () => {
  try {
    const response = await api.get('/csrf-token');
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('timecardToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // CSRFトークンを追加
  if (csrfToken && config.method !== 'get') {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

export const authApi = {
  searchCompanies: async (query: string) => {
    const response = await api.get('/auth/companies/search', { params: { q: query } });
    return response.data;
  },
  companyLogin: async (name: string, password: string) => {
    const response = await api.post('/auth/company/login', { name, password });
    return response.data;
  },
  storeLogin: async (companyName: string, storeName: string, password: string, role: string) => {
    const response = await api.post('/auth/store/login', { companyName, storeName, password, role });
    return response.data;
  },
};

export const storesApi = {
  getByCompany: async (companyId: number) => {
    const response = await api.get(`/stores/${companyId}/list`);
    return response.data;
  },
};

export const staffApi = {
  getByStore: async (storeId: number) => {
    const response = await api.get(`/staff/list/${storeId}`);
    return response.data;
  },
  getStats: async (staffId: number) => {
    const response = await api.get(`/staff/${staffId}/stats`);
    return response.data;
  },
  getEmployeeSettings: async (staffId: number) => {
    const response = await api.get(`/staff/${staffId}/employee-settings`);
    return response.data;
  },
};

export const timeRecordsApi = {
  clockIn: async (staffId: number) => {
    const response = await api.post('/time-records/clock-in', { staffId });
    return response.data;
  },
  clockOut: async (staffId: number) => {
    const response = await api.post('/time-records/clock-out', { staffId });
    return response.data;
  },
  breakStart: async (staffId: number) => {
    const response = await api.post('/time-records/break-start', { staffId });
    return response.data;
  },
  breakEnd: async (staffId: number) => {
    const response = await api.post('/time-records/break-end', { staffId });
    return response.data;
  },
  getTodayRecord: async (staffId: number) => {
    const response = await api.get(`/time-records/staff/${staffId}/today`);
    return response.data;
  },
  getTodayRecords: async (storeId: number) => {
    const response = await api.get(`/time-records/today/${storeId}`);
    return response.data;
  },
};

export const reportsApi = {
  getReport: async (storeId: number, startDate: string, endDate: string, type: string) => {
    const response = await api.get(`/reports/store/${storeId}`, {
      params: { startDate, endDate, type }
    });
    return response.data;
  },
};

export default api;