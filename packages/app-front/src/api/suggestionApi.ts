import axiosInstance from './axiosInstance';

export const suggestionApi = {
  // 개선요청 목록 조회
  getAll: () => axiosInstance.get('/suggestions'),

  // 개선요청 작성
  create: (content: string) => axiosInstance.post('/suggestions', { content }),

  // 개선요청 댓글 작성
  createComment: (suggestionId: number, content: string) =>
    axiosInstance.post(`/suggestions/${suggestionId}/comments`, { content }),
};
