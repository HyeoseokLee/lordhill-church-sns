import axiosInstance from './axiosInstance';

export const mealApi = {
  // 현재 활성 이벤트 + 내 주문 조회
  getActive: () => axiosInstance.get('/meals/active'),

  // 주문 생성/수정
  submitOrder: (
    eventId: number,
    items: { menuId: number; quantity: number }[],
  ) => axiosInstance.post('/meals/orders', { eventId, items }),

  // 주문 삭제 (취소)
  deleteOrder: (eventId: number) =>
    axiosInstance.delete(`/meals/orders/${eventId}`),

  // 전체 주문 현황
  getSummary: (eventId: number) =>
    axiosInstance.get(`/meals/events/${eventId}/summary`),

  // 본인 주문 입금 토글
  togglePaid: (orderId: number) =>
    axiosInstance.patch(`/meals/orders/${orderId}/paid`),
};
