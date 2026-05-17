import axios from 'axios';

// 로컬: Vite 프록시 /api, 라이브: VITE_API_URL 환경변수
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api',
  withCredentials: true,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  async error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

export default api;
