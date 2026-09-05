// 거래내역 벌크 업로드 잔액 검증 (일반헌금/울타리기금 공용)
//
// 은행 CSV는 계좌마다 잔액이 이어지므로, 업로드 파일이 대상 계좌의 기존 거래와
// 잔액으로 이어지지 않으면 다른 계좌의 파일일 가능성이 높다.

import { Op } from 'sequelize';
import { ErrInfo } from '../err.js';

// 벌크 업로드 rows는 은행 CSV 순서를 유지한다 — 앞이 최신, 뒤가 과거.

// 잔액 비교 후보 개수. 같은 시각에 여러 건이 기록될 수 있어 한 건만 보지 않는다.
const BALANCE_CANDIDATE_LIMIT = 20;

export const BalanceCheckCode = {
  Ok: 'ok',
  ChainBroken: 'chain_broken',
  Discontinuous: 'discontinuous',
};

const toAmount = (value) => Number(value) || 0;

// 값이 없으면 0으로 보고, 숫자로 읽을 수 없는 값만 걸러낸다.
const isReadableAmount = (value) =>
  value === undefined || value === null || Number.isFinite(Number(value));

const hasUnreadableAmount = (row) =>
  !isReadableAmount(row.balance) ||
  !isReadableAmount(row.deposit) ||
  !isReadableAmount(row.withdrawal);

const formatAmount = (value) => `${toAmount(value).toLocaleString('ko-KR')}원`;

// DB는 UTC로 저장되므로 한국 날짜로 변환해 표시한다 (sv-SE 로케일이 YYYY-MM-DD 형식).
const formatDate = (value) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(
    new Date(value),
  );

// 해당 행의 입출금을 반영하기 직전의 잔액을 역산한다.
const balanceBefore = (row) =>
  toAmount(row.balance) - toAmount(row.deposit) + toAmount(row.withdrawal);

/**
 * 업로드 파일 내부의 잔액 연쇄를 검증한다.
 * rows[i](최신)의 직전 잔액은 rows[i + 1](과거)의 잔액과 같아야 한다.
 *
 * 프론트에서도 검증하지만, API 직접 호출과 행 순서 전제를 함께 보장하기 위해 서버에서 다시 확인한다.
 * 중복 제거 전의 원본 rows로 호출해야 한다 — 중복을 걷어낸 배열은 연쇄가 끊겨 있을 수 있다.
 *
 * 파일 자체가 깨졌다는 뜻이므로 이 검증은 강제 진행(force)으로 건너뛰지 않는다.
 *
 * @param {Array<object>} rows 업로드할 거래 행 (최신 → 과거 순)
 * @returns {{ code: string, errInfo?: object, message?: string }}
 */
export const verifyUploadChain = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { code: BalanceCheckCode.Ok };
  }

  const unreadableIndex = rows.findIndex(hasUnreadableAmount);
  if (unreadableIndex !== -1) {
    return {
      code: BalanceCheckCode.ChainBroken,
      errInfo: ErrInfo.BalanceChainBroken,
      message: `${unreadableIndex + 1}행의 금액을 숫자로 읽을 수 없습니다.`,
    };
  }

  for (let i = 0; i < rows.length - 1; i += 1) {
    const expected = balanceBefore(rows[i]);
    const actual = toAmount(rows[i + 1].balance);

    if (expected !== actual) {
      return {
        code: BalanceCheckCode.ChainBroken,
        errInfo: ErrInfo.BalanceChainBroken,
        message:
          `${i + 1}행과 ${i + 2}행의 잔액이 맞지 않습니다. ` +
          `${i + 2}행 잔액이 ${formatAmount(expected)}이어야 하는데 ` +
          `${formatAmount(actual)}입니다.`,
      };
    }
  }

  return { code: BalanceCheckCode.Ok };
};

/**
 * 업로드 파일이 대상 계좌의 기존 거래와 이어지는지 검증한다.
 * 다른 계좌의 파일을 잘못 올리면 잔액이 어긋나므로 여기서 걸러진다.
 *
 * 앞뒤 양쪽을 본다. 뒤에 이어 붙이는 경우는 시작 잔액이 기존 거래에서 이어져야 하고,
 * 과거 구간을 채워 넣는 경우는 마지막 잔액이 이후 거래로 이어져야 한다.
 * 어느 한쪽이라도 맞으면 통과시킨다.
 *
 * 중복을 제외한 실제 저장 대상(newRows)으로 호출한다.
 *
 * @param {object} model 대상 Sequelize 모델 (Transaction | FundTransaction)
 * @param {Array<object>} rows 저장할 거래 행 (최신 → 과거 순)
 * @param {{ transaction?: object }} options 저장과 같은 트랜잭션에서 읽기 위한 옵션
 * @returns {Promise<{ code: string, errInfo?: object, message?: string }>}
 */
export const verifyBalanceContinuity = async (model, rows, options = {}) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { code: BalanceCheckCode.Ok };
  }

  const oldestRow = rows[rows.length - 1];
  const newestRow = rows[0];
  const openingBalance = balanceBefore(oldestRow);
  const closingBalance = toAmount(newestRow.balance);

  // 업로드 구간 이전 거래들 — 시작 잔액이 이 중 하나에서 이어져야 한다.
  const beforeRows = await model.findAll({
    where: {
      transactionDate: { [Op.lte]: new Date(oldestRow.transactionDate) },
    },
    order: [
      ['transactionDate', 'DESC'],
      ['id', 'ASC'],
    ],
    attributes: ['transactionDate', 'balance'],
    limit: BALANCE_CANDIDATE_LIMIT,
    transaction: options.transaction,
  });

  if (beforeRows.some((row) => toAmount(row.balance) === openingBalance)) {
    return { code: BalanceCheckCode.Ok };
  }

  // 업로드 구간 이후 거래들 — 과거 구간을 채워 넣는 경우를 위해 반대쪽도 확인한다.
  const afterRows = await model.findAll({
    where: {
      transactionDate: { [Op.gte]: new Date(newestRow.transactionDate) },
    },
    order: [
      ['transactionDate', 'ASC'],
      ['id', 'DESC'],
    ],
    attributes: ['transactionDate', 'balance', 'deposit', 'withdrawal'],
    limit: BALANCE_CANDIDATE_LIMIT,
    transaction: options.transaction,
  });

  if (afterRows.some((row) => balanceBefore(row) === closingBalance)) {
    return { code: BalanceCheckCode.Ok };
  }

  // 비교할 기존 거래가 아예 없으면 최초 업로드다.
  if (beforeRows.length === 0 && afterRows.length === 0) {
    return { code: BalanceCheckCode.Ok };
  }

  // 안내 메시지는 가장 가까운 기존 거래를 기준으로 만든다.
  const [nearestBefore] = beforeRows;
  const reference = nearestBefore
    ? {
        date: nearestBefore.transactionDate,
        stored: toAmount(nearestBefore.balance),
        uploaded: openingBalance,
      }
    : {
        date: afterRows[0].transactionDate,
        stored: balanceBefore(afterRows[0]),
        uploaded: closingBalance,
      };

  return {
    code: BalanceCheckCode.Discontinuous,
    errInfo: ErrInfo.BalanceDiscontinuous,
    message:
      `잔액이 이어지지 않습니다. ` +
      `기존 거래(${formatDate(reference.date)}) 기준 잔액은 ${formatAmount(reference.stored)}인데, ` +
      `업로드 파일은 ${formatAmount(reference.uploaded)}입니다. ` +
      `(차이 ${formatAmount(Math.abs(reference.uploaded - reference.stored))}) ` +
      `다른 계좌의 파일이 아닌지 확인해주세요.`,
  };
};
