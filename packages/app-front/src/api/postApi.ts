import axiosInstance from './axiosInstance';

export interface CreatePostPayload {
  content: string;
  mediaIds?: string[];
}

export const postApi = {
  getFeed: (cursor?: string) => axiosInstance.get('/posts', { params: { cursor } }),

  getPost: (id: string) => axiosInstance.get(`/posts/${id}`),

  createPost: (payload: CreatePostPayload) => axiosInstance.post('/posts', payload),

  deletePost: (id: string) => axiosInstance.delete(`/posts/${id}`),

  likePost: (id: string) => axiosInstance.post(`/posts/${id}/like`),

  unlikePost: (id: string) => axiosInstance.delete(`/posts/${id}/like`),
};
