import { useState, useEffect, useCallback } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import toast from 'react-hot-toast';
import api from '../lib/api';

// 식사 관리 페이지 (식당/메뉴 CRUD + 이벤트 생성)
export default function MealPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  // 식당 추가 다이얼로그
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newRestName, setNewRestName] = useState('');
  const [newMenus, setNewMenus] = useState([{ name: '', price: '' }]);

  // 메뉴 추가 다이얼로그 (기존 식당에)
  const [menuDialogRestId, setMenuDialogRestId] = useState(null);
  const [addMenuName, setAddMenuName] = useState('');
  const [addMenuPrice, setAddMenuPrice] = useState('');

  // 메뉴 수정 다이얼로그
  const [editMenuId, setEditMenuId] = useState(null);
  const [editMenuName, setEditMenuName] = useState('');
  const [editMenuPrice, setEditMenuPrice] = useState('');

  // 이벤트 생성 다이얼로그
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventRestId, setEventRestId] = useState('');
  const [eventDate, setEventDate] = useState('');

  // 이벤트 목록
  const [events, setEvents] = useState([]);

  // 식당 목록 조회
  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/meal/restaurants');
      setRestaurants(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 이벤트 목록 조회
  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/meal/events');
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchRestaurants();
    fetchEvents();
  }, [fetchRestaurants, fetchEvents]);

  // 식당 + 메뉴 한번에 등록
  const handleCreateRestaurant = async () => {
    if (!newRestName.trim()) return;
    try {
      const { data: rest } = await api.post('/admin/meal/restaurants', {
        name: newRestName.trim(),
      });
      // 메뉴 등록
      const validMenus = newMenus.filter(m => m.name.trim());
      for (let i = 0; i < validMenus.length; i++) {
        await api.post('/admin/meal/menus', {
          restaurantId: rest.id,
          name: validMenus[i].name.trim(),
          price: Number(validMenus[i].price) || 0,
          displayOrder: i,
        });
      }
      toast.success('식당 등록 완료');
      setAddDialogOpen(false);
      setNewRestName('');
      setNewMenus([{ name: '', price: '' }]);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      toast.error('등록 실패');
    }
  };

  // 메뉴 추가 (기존 식당에)
  const handleAddMenu = async () => {
    if (!addMenuName.trim() || !menuDialogRestId) return;
    try {
      await api.post('/admin/meal/menus', {
        restaurantId: menuDialogRestId,
        name: addMenuName.trim(),
        price: Number(addMenuPrice) || 0,
      });
      toast.success('메뉴 추가 완료');
      setMenuDialogRestId(null);
      setAddMenuName('');
      setAddMenuPrice('');
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  // 메뉴 수정 저장
  const handleEditMenu = async () => {
    if (!editMenuId || !editMenuName.trim()) return;
    try {
      await api.patch(`/admin/meal/menus/${editMenuId}`, {
        name: editMenuName.trim(),
        price: Number(editMenuPrice) || 0,
      });
      toast.success('메뉴 수정 완료');
      setEditMenuId(null);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
      toast.error('수정 실패');
    }
  };

  // 메뉴 삭제
  const handleDeleteMenu = async menuId => {
    if (!confirm('메뉴를 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/meal/menus/${menuId}`);
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  // 식당 삭제
  const handleDeleteRestaurant = async restId => {
    if (!confirm('식당과 메뉴를 모두 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/admin/meal/restaurants/${restId}`);
      toast.success('삭제 완료');
      fetchRestaurants();
    } catch (err) {
      console.error(err);
    }
  };

  // 이벤트 생성 (식당 결정)
  const handleCreateEvent = async () => {
    if (!eventRestId || !eventDate) return;
    try {
      await api.post('/admin/meal/events', {
        restaurantId: Number(eventRestId),
        targetDate: eventDate,
      });
      toast.success('식당 결정 완료');
      setEventDialogOpen(false);
      setEventRestId('');
      setEventDate('');
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error('등록 실패');
    }
  };

  // 이벤트 상태 토글
  const handleToggleEventStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      await api.patch(`/admin/meal/events/${id}`, { status: newStatus });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  // 이벤트 수정 상태
  const [editEventId, setEditEventId] = useState(null);
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventRestId, setEditEventRestId] = useState('');

  const startEditEvent = ev => {
    setEditEventId(ev.id);
    setEditEventDate(ev.targetDate);
    setEditEventRestId(String(ev.restaurant?.id || ''));
  };

  const cancelEditEvent = () => {
    setEditEventId(null);
  };

  const saveEditEvent = async () => {
    if (!editEventDate || !editEventRestId) return;
    try {
      await api.patch(`/admin/meal/events/${editEventId}`, {
        targetDate: editEventDate,
        restaurantId: Number(editEventRestId),
      });
      toast.success('수정 완료');
      cancelEditEvent();
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error('수정 실패');
    }
  };

  // 이벤트 삭제
  const handleDeleteEvent = async id => {
    if (!confirm('일정을 삭제하시겠습니까? 관련 주문도 함께 삭제됩니다.'))
      return;
    try {
      await api.delete(`/admin/meal/events/${id}`);
      toast.success('삭제 완료');
      fetchEvents();
    } catch (err) {
      console.error(err);
      toast.error('삭제 실패');
    }
  };

  // 다가오는 일요일 날짜 기본값
  const getNextSunday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 0 : 7 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  };

  // 주문중(active) 이벤트에 연결된 식당 ID 세트
  const activeRestIds = new Set(
    events.filter(ev => ev.status === 'active').map(ev => ev.restaurant?.id),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">식사 관리</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddDialogOpen(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            식당 등록
          </button>
          <button
            onClick={() => {
              setEventDate(getNextSunday());
              setEventDialogOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            식당 결정
          </button>
        </div>
      </div>

      {/* 등록된 식당/메뉴 목록 */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-500 mb-3">
          등록된 식당
        </h3>
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : restaurants.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 식당이 없습니다.</p>
        ) : (
          <div className="grid gap-3">
            {restaurants.map(rest => (
              <div
                key={rest.id}
                className="bg-white rounded-lg shadow-sm p-4 border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {rest.iconUrl && (
                      <img
                        src={rest.iconUrl}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                    )}
                    <h4 className="font-bold text-gray-800">{rest.name}</h4>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer">
                      아이콘
                      <input
                        type="file"
                        accept=".png"
                        className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('icon', file);
                          try {
                            await api.post(
                              `/admin/meal/restaurants/${rest.id}/icon`,
                              formData,
                            );
                            toast.success('아이콘 등록 완료');
                            fetchRestaurants();
                          } catch (err) {
                            console.error(err);
                            toast.error('아이콘 등록 실패');
                          }
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <button
                      onClick={() => {
                        setMenuDialogRestId(rest.id);
                        setAddMenuName('');
                      }}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      메뉴추가
                    </button>
                    <button
                      onClick={() => handleDeleteRestaurant(rest.id)}
                      disabled={activeRestIds.has(rest.id)}
                      className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      삭제
                    </button>
                  </div>
                </div>
                {rest.menus?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {rest.menus.map(menu => (
                      <span
                        key={menu.id}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700"
                      >
                        <button
                          onClick={() => {
                            setEditMenuId(menu.id);
                            setEditMenuName(menu.name);
                            setEditMenuPrice(String(menu.price || ''));
                          }}
                          className="hover:text-blue-600 transition"
                        >
                          {menu.name}
                          {menu.price > 0 && (
                            <span className="text-xs text-gray-400 ml-1">
                              {menu.price.toLocaleString()}원
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteMenu(menu.id)}
                          disabled={activeRestIds.has(rest.id)}
                          className="text-gray-400 hover:text-red-500 ml-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">메뉴가 없습니다</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 이벤트 목록 */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3">식사 일정</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 일정이 없습니다.</p>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    날짜
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    식당
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">
                    상태
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map(ev => {
                  const isEditing = editEventId === ev.id;
                  return (
                    <tr key={ev.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="date"
                            value={editEventDate}
                            onChange={e => setEditEventDate(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          ev.targetDate
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {isEditing ? (
                          <select
                            value={editEventRestId}
                            onChange={e => setEditEventRestId(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {restaurants.map(r => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          ev.restaurant?.name || '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            ev.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {ev.status === 'active' ? '주문중' : '마감'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={cancelEditEvent}
                              className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded transition"
                            >
                              취소
                            </button>
                            <button
                              onClick={saveEditEvent}
                              className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded transition"
                            >
                              완료
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              onClick={() =>
                                handleToggleEventStatus(ev.id, ev.status)
                              }
                              className={`px-3 py-1.5 text-xs font-semibold rounded transition ${
                                ev.status === 'active'
                                  ? 'text-gray-600 hover:bg-gray-100'
                                  : 'text-white bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {ev.status === 'active' ? '마감' : '주문 열기'}
                            </button>
                            <button
                              onClick={() => startEditEvent(ev)}
                              className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 식당 등록 다이얼로그 */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>식당 등록</DialogTitle>
        <DialogContent>
          <div className="pt-3 space-y-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">식당</p>
              <TextField
                value={newRestName}
                onChange={e => setNewRestName(e.target.value)}
                label="식당명"
                placeholder="예: 김밥천국"
                size="small"
                fullWidth
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">메뉴</p>
              {newMenus.map((menu, idx) => (
                <div key={idx} className="flex gap-2 mb-2 items-center">
                  <TextField
                    value={menu.name}
                    onChange={e => {
                      const updated = [...newMenus];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setNewMenus(updated);
                    }}
                    placeholder={`메뉴 ${idx + 1}`}
                    size="small"
                    sx={{ flex: 2 }}
                  />
                  <TextField
                    value={menu.price}
                    onChange={e => {
                      const updated = [...newMenus];
                      updated[idx] = { ...updated[idx], price: e.target.value };
                      setNewMenus(updated);
                    }}
                    placeholder="가격"
                    size="small"
                    type="number"
                    sx={{ flex: 1 }}
                  />
                  {newMenus.length > 1 && (
                    <button
                      onClick={() =>
                        setNewMenus(newMenus.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() =>
                  setNewMenus([...newMenus, { name: '', price: '' }])
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + 메뉴 추가
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddDialogOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleCreateRestaurant}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                등록
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 메뉴 추가 다이얼로그 */}
      <Dialog
        open={!!menuDialogRestId}
        onClose={() => setMenuDialogRestId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>메뉴 추가</DialogTitle>
        <DialogContent>
          <div className="pt-3 space-y-3">
            <TextField
              value={addMenuName}
              onChange={e => setAddMenuName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMenu()}
              label="메뉴명"
              placeholder="예: 김치찌개"
              size="small"
              fullWidth
            />
            <TextField
              value={addMenuPrice}
              onChange={e => setAddMenuPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddMenu()}
              label="가격 (원)"
              placeholder="예: 8000"
              size="small"
              type="number"
              fullWidth
            />
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setMenuDialogRestId(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                닫기
              </button>
              <button
                onClick={handleAddMenu}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                추가
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 식당 결정 다이얼로그 */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => setEventDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>식당 결정</DialogTitle>
        <DialogContent sx={{ px: 4, py: 3 }}>
          <div className="pt-3 space-y-4">
            <TextField
              type="date"
              value={eventDate}
              onChange={e => setEventDate(e.target.value)}
              label="날짜"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 3 }}
            />
            <TextField
              select
              value={eventRestId}
              onChange={e => setEventRestId(e.target.value)}
              label="식당 선택"
              size="small"
              fullWidth
            >
              <MenuItem value="" disabled>
                선택하세요
              </MenuItem>
              {restaurants.map(r => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name}
                </MenuItem>
              ))}
            </TextField>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEventDialogOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!eventRestId || !eventDate}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                결정
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 메뉴 수정 다이얼로그 */}
      <Dialog
        open={!!editMenuId}
        onClose={() => setEditMenuId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>메뉴 수정</DialogTitle>
        <DialogContent>
          <div className="pt-3">
            <TextField
              value={editMenuName}
              onChange={e => setEditMenuName(e.target.value)}
              label="메뉴명"
              size="small"
              fullWidth
              sx={{ mb: 3 }}
            />
            <TextField
              value={editMenuPrice}
              onChange={e => setEditMenuPrice(e.target.value)}
              label="가격 (원)"
              size="small"
              type="number"
              fullWidth
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setEditMenuId(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                취소
              </button>
              <button
                onClick={handleEditMenu}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
              >
                저장
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
