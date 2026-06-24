import axiosInstance from './axiosInstance';

export const noticeApi = {
  // 공지사항 목록 조회
  getAll: () => axiosInstance.get('/notices'),
};
