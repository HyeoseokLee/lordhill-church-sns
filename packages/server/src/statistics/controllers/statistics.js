import { Op, fn, col, literal } from 'sequelize';
import db from '../../db.js';

// 공통 통계 집계 함수 (모델만 다르게 전달)
const buildStatistics = async (Model, year) => {
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

// 헌금 통계 조회 (연도별 월별 카테고리별 집계)
export const getOfferingStatistics = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const result = await buildStatistics(db.Transaction, year);
  res.json(result);
};

// 울타리기금 통계 조회
export const getFundStatistics = async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  const result = await buildStatistics(db.FundTransaction, year);
  res.json(result);
};
