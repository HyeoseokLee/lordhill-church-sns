import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

export function useComments(postId: string, page = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    postId ? `/posts/${postId}/comments?page=${page}` : null,
    fetcher,
  );

  return {
    comments: data?.comments ?? [],
    totalCount: data?.totalCount ?? 0,
    error,
    isLoading,
    mutate,
  };
}
