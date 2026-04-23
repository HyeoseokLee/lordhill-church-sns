import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then((res) => res.data);

export function useMe() {
  const { data, error, isLoading, mutate } = useSWR('/auth/me', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    user: data?.user,
    error,
    isLoading,
    mutate,
  };
}
