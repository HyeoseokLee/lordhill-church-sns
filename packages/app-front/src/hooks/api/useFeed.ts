import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

export function useFeed(cursor?: string) {
  const params = cursor ? `?cursor=${cursor}` : '';
  const { data, error, isLoading, mutate } = useSWR(`/posts${params}`, fetcher);

  return {
    posts: data?.posts ?? [],
    nextCursor: data?.nextCursor,
    error,
    isLoading,
    mutate,
  };
}
