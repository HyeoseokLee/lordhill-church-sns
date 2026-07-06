import { useState, useMemo } from 'react';
import Chart from 'react-apexcharts';
import useOfferingStats, { useFundStats } from '@/hooks/api/useOfferingStats';

const MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
];

// 숫자를 만원 단위 표시
function formatWon(n: number) {
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}천`;
  return n.toLocaleString();
}

// 숫자를 원 단위 콤마 포맷
function formatFull(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

// 입금 카테고리별 월별 그래프 대상
const INCOME_CATEGORIES = ['십일조', '감사헌금', '목적헌금', '외부헌금'];

// 카테고리별 고정 색상 맵 (차트/레전드/테이블 통일)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  십일조: '#339AF0',
  감사헌금: '#FCC419',
  목적헌금: '#845EF7',
  외부헌금: '#FF922B',
};

// 색상 팔레트 fallback (맵에 없는 카테고리용)
const FALLBACK_COLORS = ['#20C997', '#E64980', '#F06595', '#40C057'];

// 카테고리명으로 색상 조회
function getCategoryColor(name: string, fallbackIdx: number) {
  return (
    CATEGORY_COLOR_MAP[name] ||
    FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length]
  );
}

// localStorage에서 마지막 탭 상태 복원
function getLastTab(): 'offering' | 'fund' {
  try {
    const v = localStorage.getItem('stats_tab');
    return v === 'fund' ? 'fund' : 'offering';
  } catch {
    return 'offering';
  }
}

// 통계 메인 페이지
export default function StatisticsPage() {
  const [accountTab, setAccountTab] = useState<'offering' | 'fund'>(getLastTab);
  const [year] = useState(2026);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = 전체보기
  const offeringStats = useOfferingStats(year);
  const fundStats = useFundStats(year);
  const { data, isLoading } =
    accountTab === 'offering' ? offeringStats : fundStats;

  // 탭 변경 시 localStorage 저장 + 월 선택 초기화
  const handleTabChange = (tab: 'offering' | 'fund') => {
    setAccountTab(tab);
    setSelectedMonth(0);
    setType('income');
    try {
      localStorage.setItem('stats_tab', tab);
    } catch {
      // 무시
    }
  };

  // 데이터가 있는 월의 인덱스 목록
  const activeMonthIndices = useMemo(() => {
    if (!data) return [];
    return data.monthly
      .map((m, i) => (m.income.total > 0 || m.expense.total > 0 ? i : -1))
      .filter(i => i >= 0);
  }, [data]);

  // 전체보기 — 월별 추이 선 그래프 데이터 (데이터 있는 월만)
  const trendSeries = useMemo(() => {
    if (!data || activeMonthIndices.length === 0) return [];
    if (type === 'expense') {
      return [
        {
          name: '출금 총액',
          data: activeMonthIndices.map(i => data.monthly[i].expense.total),
        },
      ];
    }
    const totalData = activeMonthIndices.map(i => data.monthly[i].income.total);
    const catSeries = INCOME_CATEGORIES.map(catName => ({
      name: catName,
      data: activeMonthIndices.map(i => {
        const found = data.monthly[i].income.categories.find(
          c => c.categoryName === catName,
        );
        return found ? found.total : 0;
      }),
    })).filter(s => s.data.some(v => v > 0));
    return [{ name: '입금 총액', data: totalData }, ...catSeries];
  }, [data, type, activeMonthIndices]);

  // 전체보기 — X축 라벨 (데이터 있는 월만)
  const trendLabels = useMemo(
    () => activeMonthIndices.map(i => MONTH_LABELS[i]),
    [activeMonthIndices],
  );

  // 전체보기 — 그래프 색상 (카테고리 맵 기반)
  const trendColors = useMemo(() => {
    if (type === 'expense') return ['#F06595'];
    return trendSeries.map((s, i) =>
      i === 0 ? '#40C057' : getCategoryColor(s.name, i),
    );
  }, [type, trendSeries]);

  // 월별보기 — 카테고리별 도넛 차트 데이터
  const monthData = useMemo(() => {
    if (!data || selectedMonth === 0) return null;
    const m = data.monthly[selectedMonth - 1];
    return type === 'income' ? m.income : m.expense;
  }, [data, selectedMonth, type]);

  // 전체보기 — 카테고리별 총합 테이블
  const totalByCategory = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, number>();
    for (const m of data.monthly) {
      const items =
        type === 'income' ? m.income.categories : m.expense.categories;
      for (const c of items) {
        map.set(c.categoryName, (map.get(c.categoryName) || 0) + c.total);
      }
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [data, type]);

  const grandTotal = useMemo(() => {
    if (!data) return 0;
    return data.monthly.reduce(
      (sum, m) => sum + (type === 'income' ? m.income.total : m.expense.total),
      0,
    );
  }, [data, type]);

  // === 울타리기금 전용 데이터 ===

  // 울타리기금 — 입금/출금 총합
  const fundTotalIncome = useMemo(() => {
    if (!data) return 0;
    return data.monthly.reduce((sum, m) => sum + m.income.total, 0);
  }, [data]);

  const fundTotalExpense = useMemo(() => {
    if (!data) return 0;
    return data.monthly.reduce((sum, m) => sum + m.expense.total, 0);
  }, [data]);

  // 울타리기금 — 입금+출금 동시 선 그래프 데이터
  const fundTrendSeries = useMemo(() => {
    if (!data || activeMonthIndices.length === 0) return [];
    return [
      {
        name: '입금',
        data: activeMonthIndices.map(i => data.monthly[i].income.total),
      },
      {
        name: '출금',
        data: activeMonthIndices.map(i => data.monthly[i].expense.total),
      },
    ];
  }, [data, activeMonthIndices]);

  // 울타리기금 — 월별 입금/출금 + 출금 카테고리 상세
  const fundMonthData = useMemo(() => {
    if (!data || selectedMonth === 0) return null;
    const m = data.monthly[selectedMonth - 1];
    return {
      income: m.income.total,
      expense: m.expense.total,
      expenseCategories: m.expense.categories,
    };
  }, [data, selectedMonth]);

  // 울타리기금 — 전체보기 출금 카테고리 총합
  const fundExpenseByCategory = useMemo(() => {
    if (!data || accountTab !== 'fund') return [];
    const map = new Map<string, number>();
    for (const m of data.monthly) {
      for (const c of m.expense.categories) {
        map.set(c.categoryName, (map.get(c.categoryName) || 0) + c.total);
      }
    }
    return [...map.entries()]
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [data, accountTab]);

  return (
    <>
      {/* 상단 헤더 */}
      <header className="w-full py-4 px-5">
        <h1 className="text-[22px] font-extrabold tracking-tight text-text">
          통계
        </h1>
      </header>

      {/* 계좌 탭 (헌금 / 울타리기금) */}
      <div className="flex gap-2 px-5 mb-2">
        <button
          onClick={() => handleTabChange('offering')}
          className={`flex-1 py-2 rounded-xl text-[14px] font-semibold transition-colors ${
            accountTab === 'offering'
              ? 'bg-text text-white'
              : 'bg-surface text-text-muted'
          }`}
        >
          헌금
        </button>
        <button
          onClick={() => handleTabChange('fund')}
          className={`flex-1 py-2 rounded-xl text-[14px] font-semibold transition-colors ${
            accountTab === 'fund'
              ? 'bg-text text-white'
              : 'bg-surface text-text-muted'
          }`}
        >
          울타리기금
        </button>
      </div>

      <div className="scrollInner">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-text-muted">불러오는 중...</p>
          </div>
        ) : !data ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-[13px] text-text-muted">
              데이터를 불러올 수 없습니다.
            </p>
          </div>
        ) : (
          <>
            {/* 현재 잔액 */}
            <div className="bg-surface rounded-2xl p-4 mb-4">
              <p className="text-[12px] text-text-muted mb-1">
                현재 잔액
                {data.balanceDate && (
                  <span className="ml-1.5 text-[11px]">
                    ({new Date(data.balanceDate).toLocaleDateString('ko-KR')}{' '}
                    기준)
                  </span>
                )}
              </p>
              <p className="text-[24px] font-extrabold text-text">
                {formatFull(data.currentBalance)}
              </p>
            </div>

            {/* 헌금: 입금/출금 토글 */}
            {accountTab === 'offering' && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setType('income')}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                    type === 'income'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  입금내역
                </button>
                <button
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                    type === 'expense'
                      ? 'bg-accent text-white'
                      : 'bg-surface text-text-muted'
                  }`}
                >
                  출금내역
                </button>
              </div>
            )}

            {/* 월 선택 탭 */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 scrollbar-hide">
              <button
                onClick={() => setSelectedMonth(0)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  selectedMonth === 0
                    ? 'bg-text text-white'
                    : 'bg-surface text-text-muted'
                }`}
              >
                전체
              </button>
              {MONTH_LABELS.map((label, idx) => {
                const m = data.monthly[idx];
                const hasData = m.income.total > 0 || m.expense.total > 0;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedMonth(idx + 1)}
                    disabled={!hasData}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                      selectedMonth === idx + 1
                        ? 'bg-text text-white'
                        : hasData
                          ? 'bg-surface text-text-muted'
                          : 'bg-surface text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* === 헌금 탭 콘텐츠 === */}
            {accountTab === 'offering' && selectedMonth === 0 && (
              <>
                {/* 총합 */}
                <div className="bg-surface rounded-2xl p-4 mb-4">
                  <p className="text-[12px] text-text-muted mb-1">
                    {year}년 {type === 'income' ? '총 입금' : '총 출금'}
                  </p>
                  <p className="text-[24px] font-extrabold text-text">
                    {formatFull(grandTotal)}
                  </p>
                </div>

                {/* 월별 추이 선 그래프 */}
                {activeMonthIndices.length > 0 && (
                  <div className="bg-white rounded-2xl mb-4">
                    <Chart
                      key={type}
                      type="line"
                      height={280}
                      series={trendSeries}
                      options={{
                        chart: {
                          toolbar: { show: false },
                          zoom: { enabled: false },
                          fontFamily: 'Pretendard Variable',
                        },
                        colors: trendColors,
                        stroke: { curve: 'smooth', width: 2.5 },
                        markers: { size: 3 },
                        legend: {
                          show: trendSeries.length > 1,
                          position: 'top',
                          fontSize: '11px',
                          labels: { colors: '#212529' },
                        },
                        xaxis: {
                          categories: trendLabels,
                          labels: {
                            style: { fontSize: '10px', colors: '#868E96' },
                          },
                          axisBorder: { show: false },
                          axisTicks: { show: false },
                        },
                        yaxis: {
                          labels: {
                            formatter: (v: number) => formatWon(v),
                            style: { fontSize: '10px', colors: '#868E96' },
                          },
                        },
                        grid: {
                          borderColor: '#F1F3F5',
                          strokeDashArray: 3,
                        },
                        dataLabels: { enabled: false },
                        tooltip: {
                          y: {
                            formatter: (v: number) => formatFull(v),
                          },
                        },
                      }}
                    />
                  </div>
                )}

                {/* 카테고리별 총합 테이블 */}
                {totalByCategory.length > 0 && (
                  <div className="bg-surface rounded-2xl overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/50">
                      <p className="text-[13px] font-semibold text-text">
                        카테고리별 {type === 'income' ? '입금' : '출금'}
                      </p>
                    </div>
                    {totalByCategory.map((c, idx) => (
                      <div
                        key={c.name}
                        className={`flex items-center justify-between px-4 py-3 ${
                          idx < totalByCategory.length - 1
                            ? 'border-b border-white/50'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: getCategoryColor(c.name, idx),
                            }}
                          />
                          <span className="text-[13px] text-text">
                            {c.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-semibold text-text">
                            {formatFull(c.total)}
                          </span>
                          <span className="text-[11px] text-text-muted ml-1.5">
                            {grandTotal > 0
                              ? `${Math.round((c.total / grandTotal) * 100)}%`
                              : '0%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {accountTab === 'offering' && selectedMonth > 0 && monthData && (
              <>
                {/* 월 총합 */}
                <div className="bg-surface rounded-2xl p-4 mb-4">
                  <p className="text-[12px] text-text-muted mb-1">
                    {selectedMonth}월{' '}
                    {type === 'income' ? '총 입금' : '총 출금'}
                  </p>
                  <p className="text-[24px] font-extrabold text-text">
                    {formatFull(monthData.total)}
                  </p>
                </div>

                {/* 도넛 차트 */}
                {monthData.categories.length > 0 && (
                  <div className="bg-white rounded-2xl p-2 mb-4">
                    <Chart
                      type="donut"
                      height={260}
                      series={monthData.categories.map(c => c.total)}
                      options={{
                        chart: {
                          fontFamily: 'Pretendard Variable',
                        },
                        labels: monthData.categories.map(c => c.categoryName),
                        colors: monthData.categories.map((c, i) =>
                          getCategoryColor(c.categoryName, i),
                        ),
                        legend: {
                          position: 'bottom',
                          fontSize: '12px',
                          labels: { colors: '#212529' },
                        },
                        dataLabels: {
                          enabled: true,
                          formatter: (_v: number, opts: any) => {
                            const val = opts.w.globals.series[opts.seriesIndex];
                            return formatWon(val);
                          },
                          style: {
                            fontSize: '11px',
                            fontWeight: 600,
                          },
                        },
                        plotOptions: {
                          pie: {
                            donut: {
                              size: '55%',
                              labels: {
                                show: true,
                                total: {
                                  show: true,
                                  label: '',
                                  fontSize: '16px',
                                  fontWeight: 700,
                                  color: '#212529',
                                  formatter: (w: any) => {
                                    const total = w.globals.seriesTotals.reduce(
                                      (a: number, b: number) => a + b,
                                      0,
                                    );
                                    return total.toLocaleString('ko-KR');
                                  },
                                },
                              },
                            },
                          },
                        },
                        tooltip: {
                          y: {
                            formatter: (v: number) => formatFull(v),
                          },
                        },
                      }}
                    />
                  </div>
                )}

                {/* 카테고리별 상세 테이블 */}
                {monthData.categories.length > 0 && (
                  <div className="bg-surface rounded-2xl overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/50">
                      <p className="text-[13px] font-semibold text-text">
                        {selectedMonth}월 카테고리별 내역
                      </p>
                    </div>
                    {monthData.categories
                      .sort((a, b) => b.total - a.total)
                      .map((c, idx) => (
                        <div
                          key={c.categoryId ?? idx}
                          className={`flex items-center justify-between px-4 py-3 ${
                            idx < monthData.categories.length - 1
                              ? 'border-b border-white/50'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor: getCategoryColor(
                                  c.categoryName,
                                  idx,
                                ),
                              }}
                            />
                            <span className="text-[13px] text-text">
                              {c.categoryName}
                            </span>
                            <span className="text-[11px] text-text-muted">
                              {c.count}건
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[13px] font-semibold text-text">
                              {formatFull(c.total)}
                            </span>
                            <span className="text-[11px] text-text-muted ml-1.5">
                              {monthData.total > 0
                                ? `${Math.round((c.total / monthData.total) * 100)}%`
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* 데이터 없음 */}
                {monthData.categories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-[13px] text-text-muted">
                      {selectedMonth}월 {type === 'income' ? '입금' : '출금'}{' '}
                      내역이 없습니다.
                    </p>
                  </div>
                )}
              </>
            )}

            {accountTab === 'offering' &&
              selectedMonth === 0 &&
              grandTotal === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-[13px] text-text-muted">
                    {year}년 {type === 'income' ? '입금' : '출금'} 내역이
                    없습니다.
                  </p>
                </div>
              )}

            {/* === 울타리기금 탭 콘텐츠 === */}
            {accountTab === 'fund' && selectedMonth === 0 && (
              <>
                {/* 입금/출금 총합 */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-surface rounded-2xl p-4">
                    <p className="text-[12px] text-text-muted mb-1">
                      {year}년 총 입금
                    </p>
                    <p className="text-[20px] font-extrabold text-blue-600">
                      {formatFull(fundTotalIncome)}
                    </p>
                  </div>
                  <div className="flex-1 bg-surface rounded-2xl p-4">
                    <p className="text-[12px] text-text-muted mb-1">
                      {year}년 총 출금
                    </p>
                    <p className="text-[20px] font-extrabold text-red-500">
                      {formatFull(fundTotalExpense)}
                    </p>
                  </div>
                </div>

                {/* 입금+출금 동시 선 그래프 */}
                {activeMonthIndices.length > 0 && (
                  <div className="bg-white rounded-2xl mb-4">
                    <Chart
                      key="fund-trend"
                      type="line"
                      height={280}
                      series={fundTrendSeries}
                      options={{
                        chart: {
                          toolbar: { show: false },
                          zoom: { enabled: false },
                          fontFamily: 'Pretendard Variable',
                        },
                        colors: ['#339AF0', '#F06595'],
                        stroke: { curve: 'smooth', width: 2.5 },
                        markers: { size: 3 },
                        legend: {
                          show: true,
                          position: 'top',
                          fontSize: '11px',
                          labels: { colors: '#212529' },
                        },
                        xaxis: {
                          categories: trendLabels,
                          labels: {
                            style: { fontSize: '10px', colors: '#868E96' },
                          },
                          axisBorder: { show: false },
                          axisTicks: { show: false },
                        },
                        yaxis: {
                          labels: {
                            formatter: (v: number) => formatWon(v),
                            style: { fontSize: '10px', colors: '#868E96' },
                          },
                        },
                        grid: {
                          borderColor: '#F1F3F5',
                          strokeDashArray: 3,
                        },
                        dataLabels: { enabled: false },
                        tooltip: {
                          y: {
                            formatter: (v: number) => formatFull(v),
                          },
                        },
                      }}
                    />
                  </div>
                )}

                {/* 출금 내역 (카테고리별) */}
                {fundExpenseByCategory.length > 0 && (
                  <div className="bg-surface rounded-2xl overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/50">
                      <p className="text-[13px] font-semibold text-text">
                        출금 내역
                      </p>
                    </div>
                    {fundExpenseByCategory.map((c, idx) => (
                      <div
                        key={c.name}
                        className={`flex items-center justify-between px-4 py-3 ${
                          idx < fundExpenseByCategory.length - 1
                            ? 'border-b border-white/50'
                            : ''
                        }`}
                      >
                        <span className="text-[13px] text-text">{c.name}</span>
                        <span className="text-[13px] font-semibold text-red-500">
                          {formatFull(c.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 데이터 없음 */}
                {activeMonthIndices.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-[13px] text-text-muted">
                      {year}년 울타리기금 내역이 없습니다.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* 울타리기금 — 월별보기 */}
            {accountTab === 'fund' && selectedMonth > 0 && (
              <>
                {/* 입금/출금 나란히 */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 bg-surface rounded-2xl p-4">
                    <p className="text-[12px] text-text-muted mb-1">
                      {selectedMonth}월 입금
                    </p>
                    <p className="text-[20px] font-extrabold text-blue-600">
                      {formatFull(fundMonthData?.income || 0)}
                    </p>
                  </div>
                  <div className="flex-1 bg-surface rounded-2xl p-4">
                    <p className="text-[12px] text-text-muted mb-1">
                      {selectedMonth}월 출금
                    </p>
                    <p className="text-[20px] font-extrabold text-red-500">
                      {formatFull(fundMonthData?.expense || 0)}
                    </p>
                  </div>
                </div>

                {/* 도넛 차트 (입금/출금) */}
                {(fundMonthData?.income || 0) + (fundMonthData?.expense || 0) >
                  0 && (
                  <div className="bg-white rounded-2xl p-2 mb-4">
                    <Chart
                      type="donut"
                      height={260}
                      series={[
                        fundMonthData?.income || 0,
                        fundMonthData?.expense || 0,
                      ].filter(v => v > 0)}
                      options={{
                        chart: { fontFamily: 'Pretendard Variable' },
                        labels: [
                          ...(fundMonthData?.income ? ['입금'] : []),
                          ...(fundMonthData?.expense ? ['출금'] : []),
                        ],
                        colors: [
                          ...(fundMonthData?.income ? ['#339AF0'] : []),
                          ...(fundMonthData?.expense ? ['#F06595'] : []),
                        ],
                        legend: {
                          position: 'bottom',
                          fontSize: '12px',
                          labels: { colors: '#212529' },
                        },
                        dataLabels: {
                          enabled: true,
                          formatter: (_v: number, opts: any) => {
                            const val = opts.w.globals.series[opts.seriesIndex];
                            return formatWon(val);
                          },
                          style: { fontSize: '11px', fontWeight: 600 },
                        },
                        plotOptions: {
                          pie: {
                            donut: {
                              size: '55%',
                              labels: {
                                show: true,
                                total: {
                                  show: true,
                                  label: '',
                                  fontSize: '16px',
                                  fontWeight: 700,
                                  color: '#212529',
                                  formatter: (w: any) => {
                                    const total = w.globals.seriesTotals.reduce(
                                      (a: number, b: number) => a + b,
                                      0,
                                    );
                                    return total.toLocaleString('ko-KR');
                                  },
                                },
                              },
                            },
                          },
                        },
                        tooltip: {
                          y: {
                            formatter: (v: number) => formatFull(v),
                          },
                        },
                      }}
                    />
                  </div>
                )}

                {/* 출금 카테고리 상세 */}
                {fundMonthData?.expenseCategories &&
                  fundMonthData.expenseCategories.length > 0 && (
                    <div className="bg-surface rounded-2xl overflow-hidden mb-4">
                      <div className="px-4 py-3 border-b border-white/50">
                        <p className="text-[13px] font-semibold text-text">
                          {selectedMonth}월 출금 내역
                        </p>
                      </div>
                      {fundMonthData.expenseCategories
                        .sort(
                          (a: { total: number }, b: { total: number }) =>
                            b.total - a.total,
                        )
                        .map(
                          (
                            c: {
                              categoryId: number | null;
                              categoryName: string;
                              total: number;
                              count: number;
                            },
                            idx: number,
                          ) => (
                            <div
                              key={c.categoryId ?? idx}
                              className={`flex items-center justify-between px-4 py-3 ${
                                idx <
                                fundMonthData.expenseCategories!.length - 1
                                  ? 'border-b border-white/50'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] text-text">
                                  {c.categoryName}
                                </span>
                                <span className="text-[11px] text-text-muted">
                                  {c.count}건
                                </span>
                              </div>
                              <span className="text-[13px] font-semibold text-red-500">
                                {formatFull(c.total)}
                              </span>
                            </div>
                          ),
                        )}
                    </div>
                  )}

                {/* 데이터 없음 */}
                {fundMonthData?.income === 0 &&
                  fundMonthData?.expense === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-[13px] text-text-muted">
                        {selectedMonth}월 울타리기금 내역이 없습니다.
                      </p>
                    </div>
                  )}
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
