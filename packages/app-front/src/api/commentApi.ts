import axiosInstance from './axiosInstance';

export const commentApi = {
  getComments: (postId: string, page = 1) =>
    axiosInstance.get(`/posts/${postId}/comments`, { params: { page } }),

  createComment: (postId: string, content: string) =>
    axiosInstance.post(`/posts/${postId}/comments`, { content }),

  // 댓글 수정
  updateComment: (commentId: string, content: string) =>
    axiosInstance.put(`/comments/${commentId}`, { content }),

  deleteComment: (commentId: string) =>
    axiosInstance.delete(`/comments/${commentId}`),
};
