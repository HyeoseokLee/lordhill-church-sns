import { Op, fn, col, literal } from 'sequelize';
import db from '../../db.js';

// 헌금 통계 조회 (연도별 월별 카테고리별 집계)
export const getOfferingStatistics = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);

  // 월별 + 카테고리별 입금 집계
  const incomeByCategory = await db.Transaction.findAll({
    attributes: [
      [fn('MONTH', col('transaction_date')), 'month'],
      'categoryId',
      [fn('SUM', col('deposit')), 'total'],
      [fn('COUNT', col('Transaction.id')), 'count'],
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
      },
    ],
    group: [literal('month'), 'categoryId', 'category.id'],
    order: [literal('month ASC')],
    raw: false,
  });

  // 월별 + 카테고리별 출금 집계
  const expenseByCategory = await db.Transaction.findAll({
    attributes: [
      [fn('MONTH', col('transaction_date')), 'month'],
      'categoryId',
      [fn('SUM', col('withdrawal')), 'total'],
      [fn('COUNT', col('Transaction.id')), 'count'],
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
      },
    ],
    group: [literal('month'), 'categoryId', 'category.id'],
    order: [literal('month ASC')],
    raw: false,
  });

  // 월별 총합 (입금/출금)
  const monthlyTotals = await db.Transaction.findAll({
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

  // 응답 구조 조합
  const monthly = [];
  for (let m = 1; m <= 12; m++) {
    const totals = monthlyTotals.find((t) => Number(t.month) === m);
    const incomeItems = incomeByCategory
      .filter((r) => Number(r.get('month')) === m)
      .map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.category?.name || '미분류',
        total: Number(r.get('total')),
        count: Number(r.get('count')),
      }));
    const expenseItems = expenseByCategory
      .filter((r) => Number(r.get('month')) === m)
      .map((r) => ({
        categoryId: r.categoryId,
        categoryName: r.category?.name || '미분류',
        total: Number(r.get('total')),
        count: Number(r.get('count')),
      }));

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

  res.json({ year, monthly });
};
