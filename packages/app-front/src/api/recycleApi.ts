import axios from 'axios';
import axiosInstance from './axiosInstance';

export const recycleApi = {
  getList: (cursor?: string) =>
    axiosInstance.get('/recycles', { params: { cursor } }),

  getDetail: (id: string) => axiosInstance.get(`/recycles/${id}`),

  // 이미지 Presigned URL 발급
  presignImages: (files: { filename: string; contentType: string }[]) =>
    axiosInstance.post('/recycles/presign', { files }),

  // S3에 직접 업로드
  uploadToS3: (presignedUrl: string, file: File) =>
    axios.put(presignedUrl, file, {
      headers: { 'Content-Type': file.type },
    }),

  // 생성 (title + content + mediaKeys)
  create: (title: string, content: string, mediaKeys?: string[]) =>
    axiosInstance.post('/recycles', { title, content, mediaKeys }),

  // 수정
  update: (
    id: string,
    title: string,
    content: string,
    newMediaKeys?: string[],
  ) => axiosInstance.put(`/recycles/${id}`, { title, content, newMediaKeys }),

  // 삭제
  delete: (id: string) => axiosInstance.delete(`/recycles/${id}`),

  // 개별 이미지 삭제
  deleteMedia: (mediaId: string) =>
    axiosInstance.delete(`/recycles/media/${mediaId}`),

  // 댓글
  getComments: (id: string, page = 1) =>
    axiosInstance.get(`/recycles/${id}/comments`, { params: { page } }),

  createComment: (id: string, content: string) =>
    axiosInstance.post(`/recycles/${id}/comments`, { content }),

  updateComment: (commentId: string, content: string) =>
    axiosInstance.put(`/recycles/comments/${commentId}`, { content }),

  deleteComment: (commentId: string) =>
    axiosInstance.delete(`/recycles/comments/${commentId}`),
};
