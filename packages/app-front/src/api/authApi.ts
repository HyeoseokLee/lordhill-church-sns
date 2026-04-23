import axiosInstance from './axiosInstance';

export const authApi = {
  getMe: () => axiosInstance.get('/auth/me'),

  logout: () => axiosInstance.post('/auth/logout'),

  refresh: () => axiosInstance.post('/auth/refresh'),
};
