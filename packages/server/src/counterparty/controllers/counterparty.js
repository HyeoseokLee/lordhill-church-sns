import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 거래처 목록 조회
export const getCounterparties = async (req, res) => {
  const list = await db.Counterparty.findAll({
    order: [['name', 'ASC']],
  });
  res.json(list);
};

// 거래처 등록 (같은 이름 중복 방지)
export const createCounterparty = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const trimmed = name.trim();
  const existing = await db.Counterparty.findOne({
    where: { name: trimmed },
  });
  if (existing) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const item = await db.Counterparty.create({ name: trimmed });
  res.status(201).json(item);
};

// 거래처 수정
export const updateCounterparty = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !name.trim()) {
    throw new ErrClass(ErrInfo.BadRequest);
  }
  const item = await db.Counterparty.findByPk(id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  item.name = name.trim();
  await item.save();
  res.json(item);
};

// 거래처 삭제 (soft delete)
export const deleteCounterparty = async (req, res) => {
  const { id } = req.params;
  const item = await db.Counterparty.findByPk(id);
  if (!item) {
    throw new ErrClass(ErrInfo.NotFound);
  }
  await item.destroy();
  res.json({ success: true });
};
