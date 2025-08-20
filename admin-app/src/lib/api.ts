import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // クッキーを送信するために必要
});

// CSRFトークンを取得する関数
const getCSRFToken = async () => {
  try {
    // API_BASE_URLには既に/apiが含まれているので、ベースURLを取得
    const baseUrl = API_BASE_URL.replace('/api', '');
    const response = await axios.get(`${baseUrl}/api/csrf-token`, {
      withCredentials: true
    });
    return response.data.csrfToken;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
};

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // CSRFトークンを追加（GET以外のリクエストの場合）
  if (config.method !== 'get') {
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
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