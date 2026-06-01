import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

// 내 알림 목록
export function usePushs(page = 1) {
  const { data, error, isLoading, mutate } = useSWR(
    `/pushs?page=${page}`,
    fetcher,
  );

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    error,
    isLoading,
    mutate,
  };
}

// 안 읽은 알림 개수
export function useUnreadCount() {
  const { data, mutate } = useSWR('/pushs/unread-count', fetcher, {
    refreshInterval: 30000,
  });

  return {
    count: data?.count ?? 0,
    mutate,
  };
}
