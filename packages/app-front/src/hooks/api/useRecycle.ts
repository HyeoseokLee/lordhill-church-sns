import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

// 돌고래 상세
export function useRecycle(id: string) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? `/recycles/${id}` : null,
    fetcher,
  );

  return {
    item: data,
    error,
    isLoading,
    mutate,
  };
}
