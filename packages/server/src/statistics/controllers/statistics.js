import { Op, fn, col, literal } from 'sequelize';
import db from '../../db.js';
import { UNCATEGORIZED_ID } from '../../transaction-note/models/TransactionCategoryNote.js';

// 집계 결과의 categoryId는 미분류일 때 null이지만, 메모 테이블은 0으로 저장한다.
const noteKeyOf = (type, month, categoryId) =>
  `${type}|${month}|${categoryId ?? UNCATEGORIZED_ID}`;

// 연도별 카테고리 메모를 키로 찾을 수 있게 정리한다.
const buildNoteMap = async (year) => {
  const notes = await db.TransactionCategoryNote.findAll({
    where: { year },
    attributes: ['type', 'month', 'categoryId', 'content'],
    raw: true,
  });

  return new Map(
    notes.map((n) => [noteKeyOf(n.type, n.month, n.categoryId), n.content]),
  );
};

// 공통 통계 집계 함수 (모델만 다르게 전달)
// noteMap이 있으면 카테고리 항목에 관리자 메모를 함께 실어 보낸다.
const buildStatistics = async (Model, year, noteMap = null) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  const incomeByCategory = await Model.findAll({
    attributes: [
      [fn('MONTH', col('transaction_date')), 'month'],
      'categoryId',
      [fn('SUM', col('deposit')), 'total'],
      [fn('COUNT', col(`${Model.name}.id`)), 'count'],
    ],
    where: {
      type: 'income',
      transactionDate: { [Op.gte]: startDate, [Op.lt]: endDate },
    },
    include: [
      {
        model: db.TransactionCategory,
        as: 'category',
        attributes: ['id', 'name'],
        // 삭제된 카테고리도 이름을 살려야 '미분류'로 둔갑하지 않는다.
        paranoid: false,
      },
    ],
    group: [literal('month'), 'categoryId', 'category.id'],
    order: [literal('month ASC')],
    raw: false,
  });

  const expenseByCategory = await Model.findAll({
    attributes: [
      [fn('MONTH', col('transaction_date')), 'month'],
      'categoryId',
      [fn('SUM', col('withdrawal')), 'total'],
      [fn('COUNT', col(`${Model.name}.id`)), 'count'],
    ],
    where: {
      type: 'expense',
      transactionDate: { [Op.gte]: startDate, [Op.lt]: endDate },
    },
    include: [
      {
        model: db.TransactionCategory,
        as: 'category',
        attributes: ['id', 'name'],
        // 삭제된 카테고리도 이름을 살려야 '미분류'로 둔갑하지 않는다.
        paranoid: false,
      },
    ],
    group: [literal('month'), 'categoryId', 'category.id'],
    order: [literal('month ASC')],
    raw: false,
  });

  const monthlyTotals = await Model.findAll({
    attributes: [
      [fn('MONTH', col('transaction_date')), 'month'],
      [fn('SUM', col('deposit')), 'totalIncome'],
      [fn('SUM', col('withdrawal')), 'totalExpense'],
    ],
    where: {
      transactionDate: { [Op.gte]: startDate, [Op.lt]: endDate },
    },
    group: [literal('month')],
    order: [literal('month ASC')],
    raw: true,
  });

  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const totals = monthlyTotals.find((t) => Number(t.month) === m);
    const toItem = (type) => (r) => {
      const item = {
        categoryId: r.categoryId,
        categoryName: r.category?.name || '미분류',
        total: Number(r.get('total')),
        count: Number(r.get('count')),
      };

      // 메모는 헌금 통계에만 붙는다 (울타리기금은 대상 아님).
      if (noteMap) {
        item.note = noteMap.get(noteKeyOf(type, m, r.categoryId)) || null;
      }

      return item;
    };

    const incomeItems = incomeByCategory
      .filter((r) => Number(r.get('month')) === m)
      .map(toItem('income'));
    const expenseItems = expenseByCategory
      .filter((r) => Number(r.get('month')) === m)
      .map(toItem('expense'));

    monthly.push({
      month: m,
      income: {
        total: totals ? Number(totals.totalIncome) : 0,
        categories: incomeItems,
      },
      expense: {
        total: totals ? Number(totals.totalExpense) : 0,
        categories: expenseItems,
      },
    });
  }

  const latestTransaction = await Model.findOne({
    attributes: ['balance', 'transactionDate'],
    order: [['transactionDate', 'DESC']],
    raw: true,
  });

  return {
    year,
    monthly,
    currentBalance: latestTransaction ? latestTransaction.balance : 0,
    balanceDate: latestTransaction ? latestTransaction.transactionDate : null,
  };
};

// 헌금 통계 조회 (연도별 월별 카테고리별 집계 + 카테고리 메모)
export const getOfferingStatistics = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const noteMap = await buildNoteMap(year);
  const result = await buildStatistics(db.Transaction, year, noteMap);
  res.json(result);
};

// 울타리기금 통계 조회
export const getFundStatistics = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const result = await buildStatistics(db.FundTransaction, year);
  res.json(result);
};
