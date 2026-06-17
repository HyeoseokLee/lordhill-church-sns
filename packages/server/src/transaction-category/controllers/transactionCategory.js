import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 거래 카테고리 목록 조회 (type 필터 선택)
export const getTransactionCategories = async (req, res) => {
  const where = {};
  if (req.query.type) {
    where.type = req.query.type;
  }
  const list = await db.TransactionCategory.findAll({
    where,
    order: [
      ['type', 'ASC'],
      ['name', 'ASC'],
    ],
  });
  res.json(list);
};

// 거래 카테고리 등록 (같은 type+name 중복 방지)
export const createTransactionCategory = async (req, res) => {
  const { name, type } = req.body;
  if (!name || !name.trim() || !['income', 'expense'].includes(type)) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const trimmed = name.trim();
  const existing = await db.TransactionCategory.findOne({
    where: { name: trimmed, type },
  });
  if (existing) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const item = await db.TransactionCategory.create({ name: trimmed, type });
  res.status(201).json(item);
};

// 거래 카테고리 수정
export const updateTransactionCategory = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const item = await db.TransactionCategory.findByPk(id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  item.name = name.trim();
  await item.save();
  res.json(item);
};

// 거래 카테고리 삭제 (soft delete)
export const deleteTransactionCategory = async (req, res) => {
  const { id } = req.params;
  const item = await db.TransactionCategory.findByPk(id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  await item.destroy();
  res.json({ success: true });
};
