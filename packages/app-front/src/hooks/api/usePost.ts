import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

export function usePost(postId: string) {
  const { data, error, isLoading, mutate } = useSWR(postId ? `/posts/${postId}` : null, fetcher);

  return {
    post: data?.post,
    error,
    isLoading,
    mutate,
  };
}
