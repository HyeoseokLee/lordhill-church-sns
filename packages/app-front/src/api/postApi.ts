import axios from 'axios';
import axiosInstance from './axiosInstance';

// Presigned URL 발급 응답 타입
interface PresignResult {
  presignedUrl: string;
  key: string;
}

export const postApi = {
  getFeed: (cursor?: string) =>
    axiosInstance.get('/posts', { params: { cursor } }),

  getPost: (id: string) => axiosInstance.get(`/posts/${id}`),

  // 이미지 Presigned URL 발급
  presignImages: (files: { filename: string; contentType: string }[]) =>
    axiosInstance.post<PresignResult[]>('/posts/presign', { files }),

  // S3에 직접 업로드 (presignedUrl 사용, 서버 안 거침)
  uploadToS3: (presignedUrl: string, file: File) =>
    axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
    }),

  // 게시글 작성 (content + S3 mediaKeys)
  createPost: (content: string, mediaKeys?: string[]) =>
    axiosInstance.post('/posts', { content, mediaKeys }),

  // 게시글 수정
  updatePost: (id: string, content: string) =>
    axiosInstance.put(`/posts/${id}`, { content }),

  deletePost: (id: string) => axiosInstance.delete(`/posts/${id}`),

  // 좋아요 토글 (좋아요/취소 자동 처리)
  toggleLike: (id: string) => axiosInstance.post(`/posts/${id}/like`),
};
