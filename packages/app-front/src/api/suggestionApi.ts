import axiosInstance from './axiosInstance';

export const suggestionApi = {
  // 개선요청 목록 조회
  getAll: () => axiosInstance.get('/suggestions'),

  // 개선요청 작성
  create: (content: string) => axiosInstance.post('/suggestions', { content }),

  // 개선요청 수정
  update: (id: number, content: string) =>
    axiosInstance.patch(`/suggestions/${id}`, { content }),

  // 개선요청 삭제
  delete: (id: number) => axiosInstance.delete(`/suggestions/${id}`),

  // 개선요청 댓글 작성
  createComment: (suggestionId: number, content: string) =>
    axiosInstance.post(`/suggestions/${suggestionId}/comments`, { content }),

  // 개선요청 댓글 수정
  updateComment: (commentId: number, content: string) =>
    axiosInstance.patch(`/suggestions/comments/${commentId}`, { content }),

  // 개선요청 댓글 삭제
  deleteComment: (commentId: number) =>
    axiosInstance.delete(`/suggestions/comments/${commentId}`),
};
