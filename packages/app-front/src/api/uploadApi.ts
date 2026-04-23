import axiosInstance from './axiosInstance';

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return axiosInstance.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getVideoPresignedUrl: (filename: string, contentType: string) =>
    axiosInstance.post('/upload/video/presign', { filename, contentType }),

  confirmVideoUpload: (key: string) => axiosInstance.post('/upload/video/confirm', { key }),
};
