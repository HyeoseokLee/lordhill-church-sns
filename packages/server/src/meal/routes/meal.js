import express from 'express';
import asyncHandler from 'express-async-handler';
import {
  getRestaurants,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  uploadRestaurantIcon,
  createMenu,
  updateMenu,
  deleteMenu,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  togglePaid,
} from '../controllers/meal.js';
import { uploadMealIcon } from '../../uploader/index.js';

const router = express.Router();

// 식당 CRUD
router.get('/meal/restaurants', asyncHandler(getRestaurants));
router.post('/meal/restaurants', asyncHandler(createRestaurant));
router.patch('/meal/restaurants/:id', asyncHandler(updateRestaurant));
router.delete('/meal/restaurants/:id', asyncHandler(deleteRestaurant));
router.post(
  '/meal/restaurants/:id/icon',
  uploadMealIcon.single('icon'),
  asyncHandler(uploadRestaurantIcon),
);

// 메뉴 CRUD
router.post('/meal/menus', asyncHandler(createMenu));
router.patch('/meal/menus/:id', asyncHandler(updateMenu));
router.delete('/meal/menus/:id', asyncHandler(deleteMenu));

// 이벤트 관리
router.get('/meal/events', asyncHandler(getEvents));
router.post('/meal/events', asyncHandler(createEvent));
router.patch('/meal/events/:id', asyncHandler(updateEvent));
router.delete('/meal/events/:id', asyncHandler(deleteEvent));

// 입금 토글
router.patch('/meal/orders/:orderId/paid', asyncHandler(togglePaid));

export default router;
