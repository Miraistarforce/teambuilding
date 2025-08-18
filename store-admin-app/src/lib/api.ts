import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('storeToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('storeToken');
      localStorage.removeItem('companyData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  companyLogin: async (name: string, password: string) => {
    const response = await api.post('/auth/company/login', { name, password });
    return response.data;
  },
};

export const storesApi = {
  getAll: async () => {
    const response = await api.get('/stores');
    return response.data;
  },
  create: async (data: { name: string; managerPassword: string; ownerPassword: string }) => {
    const response = await api.post('/stores', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/stores/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/stores/${id}`);
  },
};

export const staffApi = {
  getByStore: async (storeId: number) => {
    const response = await api.get(`/staff/store/${storeId}`);
    return response.data;
  },
  create: async (data: { name: string; hourlyWage: number; storeId: number }) => {
    const response = await api.post('/staff', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/staff/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/staff/${id}`);
  },
};

export const reportsApi = {
  getReport: async (storeId: number, startDate: string, endDate: string, type: 'detail' | 'summary') => {
    const response = await api.get('/time-records/report', {
      params: { storeId, startDate, endDate, type }
    });
    return response.data;
  },
  getTodayRecords: async (storeId: number) => {
    const response = await api.get(`/time-records/today/${storeId}`);
    return response.data;
  },
};

export default api;