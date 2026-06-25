import axiosInstance from './axiosInstance';

export const authApi = {
  getMe: () => axiosInstance.get('/auth/me'),

  logout: () => axiosInstance.post('/auth/logout'),

  refresh: () => axiosInstance.post('/auth/refresh'),

  // 심사용 로그인
  reviewLogin: (email: string, password: string) =>
    axiosInstance.post('/auth/review-login', { email, password }),
};
