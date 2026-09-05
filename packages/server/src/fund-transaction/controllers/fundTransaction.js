import { Op } from 'sequelize';
import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import {
  BalanceCheckCode,
  verifyBalanceContinuity,
  verifyUploadChain,
} from '../../balance/balanceService.js';

// 울타리기금 거래내역 벌크 저장 (CSV 파싱 결과)
// force: true면 계좌 연속성 검증만 건너뛴다 (관리자가 불일치를 확인하고 진행하는 경우).
// 파일 내부 잔액 연쇄는 파일 자체가 깨졌다는 뜻이므로 건너뛰지 않는다.
export const bulkCreateFundTransactions = async (req, res) => {
  const { rows, force } = req.body;
  const skipContinuityCheck = force === true;

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ErrClass(ErrInfo.BadRequest, '저장할 데이터가 없습니다.');
  }

  const chainResult = verifyUploadChain(rows);
  if (chainResult.code !== BalanceCheckCode.Ok) {
    throw new ErrClass(chainResult.errInfo, chainResult.message);
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

  // 4. 잔액 연속성 검증 + 저장
  // 검증과 저장 사이에 다른 요청이 끼어들면 잔액이 어긋나므로 한 트랜잭션으로 묶는다.
  await db.sequelize.transaction(async (tx) => {
    if (!skipContinuityCheck) {
      const continuityResult = await verifyBalanceContinuity(
        db.FundTransaction,
        newRows,
        { transaction: tx },
      );
      if (continuityResult.code !== BalanceCheckCode.Ok) {
        throw new ErrClass(continuityResult.errInfo, continuityResult.message);
      }
    }

    if (newRows.length > 0) {
      await db.FundTransaction.bulkCreate(newRows, { transaction: tx });
    }
  });

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

// 울타리기금 거래내역 개별 수정 (확정이름, 카테고리)
export const updateFundTransaction = async (req, res) => {
  const { id } = req.params;
  const { counterpartyId, categoryId } = req.body;

  const tx = await db.FundTransaction.findByPk(id);
  if (!tx) throw new ErrClass(ErrInfo.NotFound);

  if (counterpartyId !== undefined) tx.counterpartyId = counterpartyId;
  if (categoryId !== undefined) tx.categoryId = categoryId;
  await tx.save();

  const updated = await db.FundTransaction.findByPk(id, {
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
  });
  res.json(updated);
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
