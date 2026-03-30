const express = require('express');
const { z } = require('zod');
const { authenticate, requireApproved } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { profileImageUpload, resizeAndUpload, generateKey } = require('../middleware/upload');
const prisma = require('../config/db');

const router = express.Router();

const updateProfileSchema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 2자 이상이어야 합니다.')
    .max(20, '닉네임은 20자 이하여야 합니다.')
    .regex(/^[가-힣a-zA-Z0-9_]+$/, '한글, 영문, 숫자, 밑줄만 사용 가능합니다.')
    .optional(),
});

// 내 프로필
router.get('/me', authenticate, (req, res) => {
  const { id, email, nickname, profileImageUrl, role, status, createdAt } = req.user;
  res.json({ id, email, nickname, profileImageUrl, role, status, createdAt });
});

// 프로필 수정 (닉네임)
router.patch('/me', authenticate, requireApproved, validate(updateProfileSchema), async (req, res) => {
  try {
    const data = {};
    if (req.validated.nickname !== undefined) {
      data.nickname = req.validated.nickname;
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });

    const { id, email, nickname, profileImageUrl, role, status, createdAt } = user;
    res.json({ id, email, nickname, profileImageUrl, role, status, createdAt });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: '이미 사용 중인 닉네임입니다.' });
    }
    throw err;
  }
});

// 프로필 사진 업로드
router.patch('/me/photo', authenticate, requireApproved, profileImageUpload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '이미지 파일을 첨부해주세요.' });

  const key = generateKey('profiles', req.file.originalname);
  const url = await resizeAndUpload(req.file.buffer, key);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { profileImageUrl: url },
  });

  const { id, email, nickname, profileImageUrl, role, status, createdAt } = user;
  res.json({ id, email, nickname, profileImageUrl, role, status, createdAt });
});

// 다른 유저 프로필
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: '유효하지 않은 ID입니다.' });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nickname: true, profileImageUrl: true, createdAt: true, status: true },
  });

  if (!user || user.status === 'DEACTIVATED') {
    return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
  }

  res.json(user);
});

module.exports = router;
