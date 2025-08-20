import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('timecardToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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