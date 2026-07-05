import { Op } from 'sequelize';
import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 울타리기금 거래내역 벌크 저장 (CSV 파싱 결과)
export const bulkCreateFundTransactions = async (req, res) => {
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '저장할 데이터가 없습니다.');
  }

  // 1. counterpartyId / categoryId 유효성 검증
  const counterpartyIds = [
    ...new Set(
      rows.filter((r) => r.counterpartyId).map((r) => r.counterpartyId),
    ),
  ];
  const categoryIds = [
    ...new Set(rows.filter((r) => r.categoryId).map((r) => r.categoryId)),
  ];

  if (counterpartyIds.length > 0) {
    const cpCount = await db.Counterparty.count({
      where: { id: { [Op.in]: counterpartyIds } },
    });
    if (cpCount !== counterpartyIds.length) {
      throw new ErrClass(
        ErrInfo.BadRequest,
        '존재하지 않는 입출금자가 포함되어 있습니다.',
      );
    }
  }

  if (categoryIds.length > 0) {
    const catList = await db.TransactionCategory.findAll({
      where: { id: { [Op.in]: categoryIds } },
      attributes: ['id', 'type'],
    });
    if (catList.length !== categoryIds.length) {
      throw new ErrClass(
        ErrInfo.BadRequest,
        '존재하지 않는 카테고리가 포함되어 있습니다.',
      );
    }
    const catMap = Object.fromEntries(catList.map((c) => [c.id, c.type]));
    for (const row of rows) {
      if (row.categoryId && catMap[row.categoryId] !== row.type) {
        throw new ErrClass(
          ErrInfo.BadRequest,
          `카테고리 타입 불일치: ${row.rawName} (${row.type} ≠ ${catMap[row.categoryId]})`,
        );
      }
    }
  }

  // 2. 중복 체크
  const conditions = rows.map((r) => ({
    [Op.and]: [
      { transactionDate: new Date(r.transactionDate) },
      { rawName: r.rawName || '' },
      { withdrawal: r.withdrawal || 0 },
      { deposit: r.deposit || 0 },
    ],
  }));

  const existing = await db.FundTransaction.findAll({
    where: { [Op.or]: conditions },
    attributes: ['transactionDate', 'rawName', 'withdrawal', 'deposit'],
    raw: true,
  });

  const existingKeys = new Set(
    existing.map(
      (e) =>
        `${new Date(e.transactionDate).toISOString()}|${e.rawName}|${e.withdrawal}|${e.deposit}`,
    ),
  );

  // 3. 신규/중복 분리
  const newRows = [];
  const skippedRows = [];

  for (const row of rows) {
    const key = `${new Date(row.transactionDate).toISOString()}|${row.rawName || ''}|${row.withdrawal || 0}|${row.deposit || 0}`;
    if (existingKeys.has(key)) {
      skippedRows.push(row);
    } else {
      newRows.push({
        transactionDate: new Date(row.transactionDate),
        type: row.type,
        rawName: row.rawName || '',
        counterpartyId: row.counterpartyId || null,
        withdrawal: row.withdrawal || 0,
        deposit: row.deposit || 0,
        balance: row.balance || 0,
        note: row.note || '',
        memo: row.memo || '',
        categoryId: row.categoryId || null,
      });
    }
  }

  // 4. 벌크 저장
  if (newRows.length > 0) {
    await db.FundTransaction.bulkCreate(newRows);
  }

  res.json({
    inserted: newRows.length,
    skipped: skippedRows.length,
    skippedRows: skippedRows.map((r) => ({
      transactionDate: r.transactionDate,
      rawName: r.rawName,
      withdrawal: r.withdrawal,
      deposit: r.deposit,
    })),
  });
};

// 울타리기금 거래내역 목록 조회
export const getFundTransactions = async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const { count, rows } = await db.FundTransaction.findAndCountAll({
    include: [
      {
        model: db.Counterparty,
        as: 'counterparty',
        attributes: ['id', 'name'],
      },
      {
        model: db.TransactionCategory,
        as: 'category',
        attributes: ['id', 'name', 'type'],
      },
    ],
    order: [['transactionDate', 'DESC']],
    limit: Number(limit),
    offset,
  });

  res.json({
    items: rows,
    total: count,
    totalPages: Math.ceil(count / Number(limit)),
  });
};
