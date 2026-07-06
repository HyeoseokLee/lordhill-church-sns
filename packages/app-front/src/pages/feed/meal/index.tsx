import { useState, useEffect } from 'react';
import { Minus, Plus, UtensilsCrossed } from 'lucide-react';
import FullHeightBox from '@/components/common/FullHeightBox';
import SubPageHeader from '@/components/common/SubPageHeader';
import { mealApi } from '@/api/mealApi';
import { useAuthStore } from '@/stores/authStore';

interface Menu {
  id: number;
  name: string;
  displayOrder: number;
}

interface OrderItem {
  menuId: number;
  quantity: number;
  menu: { id: number; name: string };
}

interface Order {
  id: number;
  userId: number;
  isPaid: boolean;
  user: { id: number; nickname: string };
  items: OrderItem[];
}

// 식사 주문 페이지
export default function MealPage() {
  const currentUser = useAuthStore(s => s.user);
  const [event, setEvent] = useState<any>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [myItems, setMyItems] = useState<Record<number, number>>({});
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasOrder, setHasOrder] = useState(false);

  // 데이터 조회
  const fetchData = async () => {
    try {
      const { data } = await mealApi.getActive();
      if (!data) {
        setEvent(null);
        setLoading(false);
        return;
      }
      setEvent(data.event);
      const eventMenus = data.event?.restaurant?.menus || [];
      setMenus(eventMenus);

      // 내 주문 복원
      if (data.myOrder?.items?.length > 0) {
        const items: Record<number, number> = {};
        data.myOrder.items.forEach((i: any) => {
          items[i.menu.id] = i.quantity;
        });
        setMyItems(items);
        setHasOrder(true);
      } else {
        setMyItems({});
        setHasOrder(false);
      }

      // 주문 현황 조회
      if (data.event?.id) {
        const { data: summaryData } = await mealApi.getSummary(data.event.id);
        setOrders(summaryData);
      }
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 메뉴 수량 변경
  const updateQty = (menuId: number, delta: number) => {
    setMyItems(prev => {
      const current = prev[menuId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [menuId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuId]: next };
    });
  };

  // 메뉴 탭 (0이면 1로)
  const selectMenu = (menuId: number) => {
    setMyItems(prev => {
      if (prev[menuId]) return prev;
      return { ...prev, [menuId]: 1 };
    });
  };

  // 주문 제출
  const handleSubmit = async () => {
    if (!event || submitting) return;
    const items = Object.entries(myItems)
      .filter(([, qty]) => qty > 0)
      .map(([menuId, quantity]) => ({ menuId: Number(menuId), quantity }));
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      await mealApi.submitOrder(event.id, items);
      setHasOrder(true);
      await fetchData();
    } catch {
      // 에러 무시
    } finally {
      setSubmitting(false);
    }
  };

  // 주문 취소
  const handleCancel = async () => {
    if (!event || submitting) return;
    setSubmitting(true);
    try {
      await mealApi.deleteOrder(event.id);
      setMyItems({});
      setHasOrder(false);
      await fetchData();
    } catch {
      // 에러 무시
    } finally {
      setSubmitting(false);
    }
  };

  // 선택된 메뉴 목록
  const selectedItems = Object.entries(myItems)
    .filter(([, qty]) => qty > 0)
    .map(([menuId, quantity]) => ({
      menuId: Number(menuId),
      quantity,
      name: menus.find(m => m.id === Number(menuId))?.name || '',
    }));

  // 전체 메뉴별 총계
  const menuTotals = menus.map(menu => {
    const total = orders.reduce((sum, order) => {
      const item = order.items.find(i => i.menu.id === menu.id);
      return sum + (item?.quantity || 0);
    }, 0);
    return { menuId: menu.id, name: menu.name, total };
  });

  if (loading) {
    return (
      <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
        <SubPageHeader title="식사주문" />
        <div className="scrollInner">
          <p className="text-center text-text-muted text-[14px] py-20">
            불러오는 중...
          </p>
        </div>
      </FullHeightBox>
    );
  }

  if (!event) {
    return (
      <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
        <SubPageHeader title="식사주문" />
        <div className="scrollInner">
          <div className="flex flex-col items-center justify-center py-20">
            <UtensilsCrossed
              size={48}
              strokeWidth={1}
              className="text-surface-strong mb-4"
            />
            <p className="text-[15px] font-semibold text-text-muted">
              예정된 식사가 없습니다
            </p>
          </div>
        </div>
      </FullHeightBox>
    );
  }

  return (
    <FullHeightBox className="mx-auto max-w-[480px] bg-bg">
      <SubPageHeader title="식사주문" />
      <div className="scrollInner">
        {/* 식당 + 날짜 헤더 */}
        <div className="bg-accent/10 rounded-2xl p-4 mb-4 text-center">
          <p className="text-[12px] text-accent font-semibold mb-1">
            {event.targetDate}
          </p>
          <div className="flex justify-center">
            <span className="relative inline-flex items-center">
              {event.restaurant?.iconUrl && (
                <img
                  src={event.restaurant.iconUrl}
                  alt=""
                  className="absolute right-full mr-2 w-8 h-8 rounded-lg object-cover"
                />
              )}
              <span className="text-[20px] font-extrabold text-text">
                {event.restaurant?.name}
              </span>
            </span>
          </div>
        </div>

        {/* 메뉴 선택 */}
        <div className="flex flex-wrap gap-2 mb-5">
          {menus.map(menu => {
            const isSelected = (myItems[menu.id] || 0) > 0;
            return (
              <button
                key={menu.id}
                onClick={() => selectMenu(menu.id)}
                className={`px-4 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-accent text-white shadow-sm'
                    : 'bg-surface text-text hover:bg-surface-strong'
                }`}
              >
                {menu.name}
              </button>
            );
          })}
        </div>

        {/* 나의 주문 카드 */}
        {selectedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] p-4 mb-5">
            <p className="text-[15px] font-bold text-text pb-3 mb-3 border-b border-surface-strong">
              나의 주문
            </p>
            {selectedItems.map(item => (
              <div
                key={item.menuId}
                className="flex items-center justify-between py-2"
              >
                <span className="text-[14px] text-text font-medium">
                  {item.name}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateQty(item.menuId, -1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-surface text-text-muted hover:bg-surface-strong"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-[15px] font-bold text-text w-5 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQty(item.menuId, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-accent text-white"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 mt-4 pt-4 border-t border-surface-strong">
              {hasOrder && (
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-[14px] font-bold text-text-muted bg-surface rounded-xl active:scale-[0.98] transition disabled:opacity-40"
                >
                  주문취소
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 text-[14px] font-bold text-white bg-accent rounded-xl active:scale-[0.98] transition disabled:opacity-40"
              >
                {submitting ? '처리 중...' : hasOrder ? '주문수정' : '주문완료'}
              </button>
            </div>
          </div>
        )}

        {/* 주문 현황 테이블 */}
        {orders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="px-4 py-3 border-b border-surface">
              <p className="text-[15px] font-bold text-text">주문 현황</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="bg-surface/50">
                    <th className="text-center px-3 py-2 font-medium text-text-muted whitespace-nowrap">
                      주문자
                    </th>
                    {menus.map(menu => (
                      <th
                        key={menu.id}
                        className="text-center px-3 py-2 font-medium text-text-muted whitespace-nowrap"
                      >
                        {menu.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => {
                    const isMe =
                      currentUser &&
                      String(order.user?.id) === String(currentUser.id);
                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-surface/50 ${isMe ? 'bg-accent/5' : ''}`}
                      >
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="font-medium text-text">
                            <span
                              className={
                                isMe
                                  ? 'border-b-[3px] border-accent pb-0.5'
                                  : ''
                              }
                            >
                              {order.user?.nickname || '?'}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              if (!isMe) return;
                              try {
                                await mealApi.togglePaid(order.id);
                                await fetchData();
                              } catch {
                                /* */
                              }
                            }}
                            disabled={!isMe}
                            className={`mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full transition ${
                              order.isPaid
                                ? 'bg-accent/20 text-accent'
                                : 'bg-surface text-text-muted'
                            } ${isMe ? 'active:scale-[0.95]' : 'opacity-70 cursor-default'}`}
                          >
                            {order.isPaid ? '입금완료' : '미입금'}
                          </button>
                        </td>
                        {menus.map(menu => {
                          const item = order.items.find(
                            i => i.menu.id === menu.id,
                          );
                          return (
                            <td
                              key={menu.id}
                              className="px-3 py-2.5 text-center text-text"
                            >
                              {item ? item.quantity : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* 총계 행 */}
                  <tr className="bg-surface/80">
                    <td className="px-3 py-2.5 font-semibold text-text-muted text-center">
                      총계
                    </td>
                    {menuTotals.map(m => (
                      <td
                        key={m.menuId}
                        className="px-3 py-2.5 text-center font-bold text-accent"
                      >
                        {m.total > 0 ? m.total : ''}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </FullHeightBox>
  );
}
