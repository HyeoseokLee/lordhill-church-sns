import axiosInstance from './axiosInstance';

export const userApi = {
  getProfile: (userId: string) => axiosInstance.get(`/users/${userId}`),

  updateProfile: (data: FormData) =>
    axiosInstance.patch('/users/me', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
