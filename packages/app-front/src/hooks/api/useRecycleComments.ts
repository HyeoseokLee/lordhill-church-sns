import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

// 돌고래 댓글 목록
export function useRecycleComments(recycleId: string, page = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    recycleId ? `/recycles/${recycleId}/comments?page=${page}` : null,
    fetcher,
  );

  return {
    comments: data?.items ?? [],
    total: data?.total ?? 0,
    error,
    isLoading,
    mutate,
  };
}
