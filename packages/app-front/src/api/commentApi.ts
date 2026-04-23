import axiosInstance from './axiosInstance';

export const commentApi = {
  getComments: (postId: string, page = 1) =>
    axiosInstance.get(`/posts/${postId}/comments`, { params: { page } }),

  createComment: (postId: string, content: string) =>
    axiosInstance.post(`/posts/${postId}/comments`, { content }),

  deleteComment: (postId: string, commentId: string) =>
    axiosInstance.delete(`/posts/${postId}/comments/${commentId}`),
};
