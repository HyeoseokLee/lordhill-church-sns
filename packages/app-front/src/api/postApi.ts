import axiosInstance from './axiosInstance';

export const postApi = {
  getFeed: (cursor?: string) =>
    axiosInstance.get('/posts', { params: { cursor } }),

  getPost: (id: string) => axiosInstance.get(`/posts/${id}`),

  // 게시글 작성 (텍스트 + 이미지 multipart/form-data)
  createPost: (content: string, images?: File[]) => {
    const formData = new FormData();
    formData.append('content', content);
    if (images) {
      images.forEach(file => formData.append('images', file));
    }
    return axiosInstance.post('/posts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 게시글 수정
  updatePost: (id: string, content: string) =>
    axiosInstance.put(`/posts/${id}`, { content }),

  deletePost: (id: string) => axiosInstance.delete(`/posts/${id}`),

  // 좋아요 토글 (좋아요/취소 자동 처리)
  toggleLike: (id: string) => axiosInstance.post(`/posts/${id}/like`),
};
