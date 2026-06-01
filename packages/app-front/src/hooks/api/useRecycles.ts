import useSWRInfinite from 'swr/infinite';
import axiosInstance from '@/api/axiosInstance';

const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

// 돌고래 목록 무한스크롤 (커서 기반)
export function useRecycles() {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.hasMore) return null;
    if (pageIndex === 0) return '/recycles';
    return `/recycles?cursor=${previousPageData.nextCursor}`;
  };

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite(getKey, fetcher, { revalidateAll: true });

  const items = data ? data.flatMap(page => page.items) : [];
  const hasMore = data ? data[data.length - 1]?.hasMore : false;

  return {
    items,
    hasMore,
    isLoading,
    isLoadingMore: isValidating && size > 1,
    loadMore: () => setSize(size + 1),
    mutate,
    error,
  };
}
