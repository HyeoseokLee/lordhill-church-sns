import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { sendPushToAll } from '../../push/pushService.js';

// ========== 어드민: 식당 관리 ==========

// 식당 목록 조회 (메뉴 포함)
export const getRestaurants = async (_req, res) => {
  const restaurants = await db.MealRestaurant.findAll({
    include: [
      {
        model: db.MealMenu,
        as: 'menus',
        attributes: ['id', 'name', 'price', 'displayOrder'],
        order: [['displayOrder', 'ASC']],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: db.MealMenu, as: 'menus' }, 'displayOrder', 'ASC'],
    ],
  });
  res.json(restaurants);
};

// 식당 생성
export const createRestaurant = async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) throw new ErrClass(ErrInfo.BadRequest);
  const restaurant = await db.MealRestaurant.create({ name: name.trim() });
  res.status(201).json(restaurant);
};

// 식당 수정
export const updateRestaurant = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const restaurant = await db.MealRestaurant.findByPk(id);
  if (!restaurant) throw new ErrClass(ErrInfo.NotFound);
  if (name?.trim()) restaurant.name = name.trim();
  await restaurant.save();
  res.json(restaurant);
};

// 식당 삭제 (메뉴도 함께 soft delete)
export const deleteRestaurant = async (req, res) => {
  const { id } = req.params;
  const restaurant = await db.MealRestaurant.findByPk(id);
  if (!restaurant) throw new ErrClass(ErrInfo.NotFound);
  await restaurant.destroy();
  res.json({ ok: true });
};

// 식당 아이콘 업로드
export const uploadRestaurantIcon = async (req, res) => {
  const { id } = req.params;
  const restaurant = await db.MealRestaurant.findByPk(id);
  if (!restaurant) throw new ErrClass(ErrInfo.NotFound);
  if (!req.file) throw new ErrClass(ErrInfo.BadRequest);
  restaurant.iconUrl = req.file.location || req.file.key;
  await restaurant.save();
  res.json(restaurant);
};

// ========== 어드민: 메뉴 관리 ==========

// 메뉴 추가
export const createMenu = async (req, res) => {
  const { restaurantId, name, price, displayOrder } = req.body;
  if (!restaurantId || !name?.trim()) throw new ErrClass(ErrInfo.BadRequest);
  const menu = await db.MealMenu.create({
    restaurantId,
    name: name.trim(),
    price: price ?? 0,
    displayOrder: displayOrder ?? 0,
  });
  res.status(201).json(menu);
};

// 메뉴 수정
export const updateMenu = async (req, res) => {
  const { id } = req.params;
  const { name, price, displayOrder } = req.body;
  const menu = await db.MealMenu.findByPk(id);
  if (!menu) throw new ErrClass(ErrInfo.NotFound);
  if (name?.trim()) menu.name = name.trim();
  if (price !== undefined) menu.price = price;
  if (displayOrder !== undefined) menu.displayOrder = displayOrder;
  await menu.save();
  res.json(menu);
};

// 메뉴 삭제
export const deleteMenu = async (req, res) => {
  const { id } = req.params;
  const menu = await db.MealMenu.findByPk(id);
  if (!menu) throw new ErrClass(ErrInfo.NotFound);
  await menu.destroy();
  res.json({ ok: true });
};

// ========== 어드민: 이벤트 관리 ==========

// 이벤트 목록 조회
export const getEvents = async (_req, res) => {
  const events = await db.MealEvent.findAll({
    include: [
      {
        model: db.MealRestaurant,
        as: 'restaurant',
        attributes: ['id', 'name'],
      },
    ],
    order: [['targetDate', 'DESC']],
  });
  res.json(events);
};

// 이벤트 생성 (식당 결정)
export const createEvent = async (req, res) => {
  const { restaurantId, targetDate } = req.body;
  if (!restaurantId || !targetDate) throw new ErrClass(ErrInfo.BadRequest);
  const event = await db.MealEvent.create({
    restaurantId,
    targetDate,
    status: 'active',
  });

  // 전체 구성원에게 푸시 발송
  sendPushToAll({
    title: '식사주문',
    body: '식사 주문이 시작되었습니다.',
    data: { path: '/feed/meal' },
    senderType: 'system',
  }).catch(() => {});

  res.status(201).json(event);
};

// 이벤트 수정 (상태, 날짜, 식당)
export const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { status, targetDate, restaurantId } = req.body;
  const event = await db.MealEvent.findByPk(id);
  if (!event) throw new ErrClass(ErrInfo.NotFound);
  if (status !== undefined) event.status = status;
  if (targetDate !== undefined) event.targetDate = targetDate;
  if (restaurantId !== undefined) event.restaurantId = restaurantId;
  await event.save();
  res.json(event);
};

// 이벤트 삭제 (관련 주문도 함께 삭제)
export const deleteEvent = async (req, res) => {
  const { id } = req.params;
  const event = await db.MealEvent.findByPk(id);
  if (!event) throw new ErrClass(ErrInfo.NotFound);
  // 관련 주문 아이템 → 주문 삭제
  const orders = await db.MealOrder.findAll({ where: { eventId: id } });
  for (const order of orders) {
    await db.MealOrderItem.destroy({ where: { orderId: order.id } });
  }
  await db.MealOrder.destroy({ where: { eventId: id } });
  await event.destroy();
  res.json({ ok: true });
};

// ========== 앱: 활성 이벤트 + 주문 ==========

// 현재 활성 이벤트 조회 (가장 가까운 active 이벤트 + 메뉴 + 내 주문)
export const getActiveEvent = async (req, res) => {
  const userId = req.user?.id;

  const event = await db.MealEvent.findOne({
    where: { status: 'active' },
    include: [
      {
        model: db.MealRestaurant,
        as: 'restaurant',
        include: [
          {
            model: db.MealMenu,
            as: 'menus',
            attributes: ['id', 'name', 'price', 'displayOrder'],
          },
        ],
      },
    ],
    order: [
      ['targetDate', 'ASC'],
      [
        { model: db.MealRestaurant, as: 'restaurant' },
        { model: db.MealMenu, as: 'menus' },
        'displayOrder',
        'ASC',
      ],
    ],
  });

  if (!event) return res.json(null);

  // 내 주문 조회
  let myOrder = null;
  if (userId) {
    myOrder = await db.MealOrder.findOne({
      where: { eventId: event.id, userId },
      include: [
        {
          model: db.MealOrderItem,
          as: 'items',
          include: [
            {
              model: db.MealMenu,
              as: 'menu',
              attributes: ['id', 'name', 'price'],
            },
          ],
        },
      ],
    });
  }

  res.json({ event, myOrder });
};

// 주문 생성/수정 (upsert)
export const submitOrder = async (req, res) => {
  const userId = req.user.id;
  const { eventId, items } = req.body;
  // items: [{ menuId, quantity }]

  if (!eventId || !Array.isArray(items) || items.length === 0) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  const event = await db.MealEvent.findByPk(eventId);
  if (!event || event.status !== 'active') {
    throw new ErrClass(ErrInfo.BadRequest, '주문이 마감되었습니다.');
  }

  // 기존 주문 조회 또는 생성
  const [order] = await db.MealOrder.findOrCreate({
    where: { eventId, userId },
    defaults: { eventId, userId },
  });

  // 기존 아이템 삭제 후 새로 생성
  await db.MealOrderItem.destroy({ where: { orderId: order.id } });
  const validItems = items.filter((i) => i.quantity > 0);
  if (validItems.length > 0) {
    await db.MealOrderItem.bulkCreate(
      validItems.map((i) => ({
        orderId: order.id,
        menuId: i.menuId,
        quantity: i.quantity,
      })),
    );
  }

  res.json({ ok: true });
};

// 주문 삭제 (취소)
export const deleteOrder = async (req, res) => {
  const userId = req.user.id;
  const { eventId } = req.params;

  const order = await db.MealOrder.findOne({
    where: { eventId, userId },
  });
  if (!order) throw new ErrClass(ErrInfo.NotFound);

  await db.MealOrderItem.destroy({ where: { orderId: order.id } });
  await order.destroy();
  res.json({ ok: true });
};

// 전체 주문 현황 (요약 테이블)
export const getOrderSummary = async (req, res) => {
  const { eventId } = req.params;

  const orders = await db.MealOrder.findAll({
    where: { eventId },
    include: [
      { model: db.User, as: 'user', attributes: ['id', 'nickname'] },
      {
        model: db.MealOrderItem,
        as: 'items',
        include: [
          {
            model: db.MealMenu,
            as: 'menu',
            attributes: ['id', 'name', 'price'],
          },
        ],
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  res.json(orders);
};

// 입금 여부 토글 (어드민/sub_admin)
export const togglePaid = async (req, res) => {
  const { orderId } = req.params;
  const order = await db.MealOrder.findByPk(orderId);
  if (!order) throw new ErrClass(ErrInfo.NotFound);
  order.isPaid = !order.isPaid;
  await order.save();
  res.json(order);
};

// 본인 주문 입금 토글 (일반 유저)
export const toggleMyPaid = async (req, res) => {
  const userId = req.user.id;
  const { orderId } = req.params;
  const order = await db.MealOrder.findByPk(orderId);
  if (!order) throw new ErrClass(ErrInfo.NotFound);
  if (order.userId !== userId) throw new ErrClass(ErrInfo.Forbidden);
  order.isPaid = !order.isPaid;
  await order.save();
  res.json(order);
};
