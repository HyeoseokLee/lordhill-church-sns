import express from 'express';
import asyncHandler from 'express-async-handler';
import { adminLogin } from '../controllers/auth.js';

const router = express.Router();

// 어드민 로그인 (인증 불필요)
router.post('/login', asyncHandler(adminLogin));

export default router;
