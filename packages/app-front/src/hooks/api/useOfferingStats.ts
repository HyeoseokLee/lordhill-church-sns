import useSWR from 'swr';
import axiosInstance from '@/api/axiosInstance';

interface CategoryStat {
  categoryId: number | null;
  categoryName: string;
  total: number;
  count: number;
}

interface MonthData {
  month: number;
  income: { total: number; categories: CategoryStat[] };
  expense: { total: number; categories: CategoryStat[] };
}

interface OfferingStats {
  year: number;
  monthly: MonthData[];
  currentBalance: number;
  balanceDate: string | null;
}

const fetcher = (url: string) => axiosInstance.get(url).then(res => res.data);

// 헌금 통계 데이터 조회 훅
export default function useOfferingStats(year: number) {
  const { data, error, isLoading } = useSWR<OfferingStats>(
    `/statistics/offerings?year=${year}`,
    fetcher,
    { revalidateOnFocus: false },
  );

  return { data, error, isLoading };
}
