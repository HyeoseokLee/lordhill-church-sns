import axiosInstance from './axiosInstance';

export const pushApi = {
  // 내 알림 목록
  getList: (page = 1) => axiosInstance.get('/pushs', { params: { page } }),

  // 안 읽은 알림 개수
  getUnreadCount: () => axiosInstance.get('/pushs/unread-count'),

  // 알림 읽음 처리
  markAsRead: (id: string) => axiosInstance.patch(`/pushs/${id}/read`),

  // 전체 읽음 처리
  markAllAsRead: () => axiosInstance.patch('/pushs/read-all'),
};
