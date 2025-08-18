import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/admin/login', { username, password });
    return response.data;
  },
};

export const companiesApi = {
  getAll: async () => {
    const response = await api.get('/companies');
    return response.data;
  },
  create: async (data: { name: string; password: string }) => {
    const response = await api.post('/companies', data);
    return response.data;
  },
  update: async (id: number, data: Partial<{ name: string; password: string; isActive: boolean }>) => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/companies/${id}`);
  },
};

export default api;