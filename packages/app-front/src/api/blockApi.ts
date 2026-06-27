import axiosInstance from './axiosInstance';

export const blockApi = {
  // 사용자 차단
  block: (userId: number) => axiosInstance.post(`/blocks/${userId}`),

  // 사용자 차단 해제
  unblock: (userId: number) => axiosInstance.delete(`/blocks/${userId}`),

  // 내가 차단한 유저 ID 목록
  getBlockedIds: () => axiosInstance.get<number[]>('/blocks/ids'),

  // 내가 차단한 유저 목록
  getBlockedUsers: () => axiosInstance.get('/blocks'),
};
