import { Op, fn, col } from 'sequelize';
import db from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { auditAction, contentLimit } from '../../define.js';
import { UNCATEGORIZED_ID } from '../models/TransactionCategoryNote.js';

const TRANSACTION_TYPES = ['income', 'expense'];
const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

const logAudit = async (adminUserId, action, target, metadata) => {
  await db.AdminAuditLog.create({ adminUserId, action, target, metadata });
};

// null/undefined는 숫자로 강제하지 않는다 (Number(null) === 0 이라 연도 0으로 저장되는 것을 막는다).
const toInteger = (value) => {
  if (value === null || value === undefined || value === '') return NaN;
  return Number(value);
};

const assertYear = (year) => {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new ErrClass(ErrInfo.BadRequest, '연도가 올바르지 않습니다.');
  }
};

// 메모 한 칸을 식별하는 값들을 검증하고 정규화한다.
const parseNoteKey = async (body) => {
  const { type } = body;
  const year = toInteger(body.year);
  const month = toInteger(body.month);
  const categoryId =
    body.categoryId === null || body.categoryId === undefined
      ? UNCATEGORIZED_ID
      : toInteger(body.categoryId);

  if (!TRANSACTION_TYPES.includes(type)) {
    throw new ErrClass(
      ErrInfo.BadRequest,
      '입금/출금 구분이 올바르지 않습니다.',
    );
  }
  assertYear(year);
  if (!Number.isInteger(month) || month < MIN_MONTH || month > MAX_MONTH) {
    throw new ErrClass(ErrInfo.BadRequest, '월이 올바르지 않습니다.');
  }
  if (!Number.isInteger(categoryId) || categoryId < 0) {
    throw new ErrClass(ErrInfo.BadRequest, '카테고리가 올바르지 않습니다.');
  }

  // 미분류(0)는 실제 카테고리 행이 아니므로 존재 검증에서 제외한다.
  if (categoryId !== UNCATEGORIZED_ID) {
    const category = await db.TransactionCategory.findByPk(categoryId);
    if (!category) {
      throw new ErrClass(ErrInfo.BadRequest, '존재하지 않는 카테고리입니다.');
    }
    // 출금 카테고리에 입금 메모를 다는 등의 불일치를 막는다.
    if (category.type !== type) {
      throw new ErrClass(
        ErrInfo.BadRequest,
        `카테고리 타입 불일치: ${category.name}은(는) ${category.type === 'income' ? '입금' : '출금'} 카테고리입니다.`,
      );
    }
  }

  return { type, year, month, categoryId };
};

const parseContent = (raw) => {
  if (typeof raw !== 'string') {
    throw new ErrClass(ErrInfo.BadRequest, '메모 내용을 입력해주세요.');
  }

  const content = raw.trim();
  if (!content) {
    throw new ErrClass(ErrInfo.BadRequest, '메모 내용을 입력해주세요.');
  }
  if (content.length > contentLimit.categoryNoteMaxLength) {
    throw new ErrClass(ErrInfo.CategoryNoteContentTooLong);
  }

  return content;
};

// 카테고리명을 붙여 조회한다. 삭제된 카테고리도 이름을 살린다.
const findNoteWithCategory = (id) =>
  db.TransactionCategoryNote.findByPk(id, {
    include: [
      {
        model: db.TransactionCategory,
        as: 'category',
        attributes: ['id', 'name', 'type'],
        required: false,
        paranoid: false,
      },
    ],
  });

// 해당 연도에 실제 거래가 있는 (구분/월/카테고리) 조합을 모은다.
// 거래가 없는 칸에 쓴 메모는 통계 화면에 나타나지 않으므로 이를 알려주기 위해 쓴다.
const findFilledSlots = async (year) => {
  const rows = await db.Transaction.findAll({
    attributes: [
      'type',
      'categoryId',
      [fn('MONTH', col('transaction_date')), 'month'],
    ],
    where: {
      transactionDate: {
        [Op.gte]: new Date(year, 0, 1),
        [Op.lt]: new Date(year + 1, 0, 1),
      },
    },
    group: ['type', 'categoryId', fn('MONTH', col('transaction_date'))],
    raw: true,
  });

  return new Set(
    rows.map(
      (r) => `${r.type}|${Number(r.month)}|${r.categoryId ?? UNCATEGORIZED_ID}`,
    ),
  );
};

// 연도별 카테고리 메모 목록 조회
export const getCategoryNotes = async (req, res) => {
  const year = toInteger(req.query.year);
  assertYear(year);

  const notes = await db.TransactionCategoryNote.findAll({
    where: { year },
    include: [
      {
        model: db.TransactionCategory,
        as: 'category',
        attributes: ['id', 'name', 'type'],
        required: false,
        paranoid: false,
      },
    ],
    order: [
      ['month', 'ASC'],
      ['type', 'ASC'],
      ['categoryId', 'ASC'],
    ],
  });

  const filledSlots = await findFilledSlots(year);

  // visible=false면 해당 월에 그 카테고리 거래가 없어 앱에 노출되지 않는다.
  res.json(
    notes.map((note) => ({
      ...note.toJSON(),
      visible: filledSlots.has(`${note.type}|${note.month}|${note.categoryId}`),
    })),
  );
};

// 카테고리 메모 저장 (같은 칸이면 덮어쓰기)
export const upsertCategoryNote = async (req, res) => {
  const key = await parseNoteKey(req.body);
  const content = parseContent(req.body.content);

  // 소프트 삭제된 메모가 유니크 인덱스 자리를 차지하고 있으므로 함께 찾아 되살린다.
  const findExisting = () =>
    db.TransactionCategoryNote.findOne({ where: key, paranoid: false });

  const saveOnto = async (existing) => {
    if (existing.deletedAt) {
      await existing.restore();
    }
    await existing.update({ content });
    return existing;
  };

  let note = await findExisting();
  if (note) {
    await saveOnto(note);
  } else {
    try {
      note = await db.TransactionCategoryNote.create({ ...key, content });
    } catch (err) {
      // 동시 요청이 같은 칸을 만들었으면 유니크 인덱스에 걸린다. 다시 찾아 갱신한다.
      if (err.parent?.code !== 'ER_DUP_ENTRY') throw err;
      note = await findExisting();
      if (!note) throw err;
      await saveOnto(note);
    }
  }

  await logAudit(
    req.user.id,
    auditAction.upsertCategoryNote,
    `category_note:${note.id}`,
    { ...key, content },
  );

  res.json(await findNoteWithCategory(note.id));
};

// 카테고리 메모 삭제
export const deleteCategoryNote = async (req, res) => {
  const { id } = req.params;

  const note = await db.TransactionCategoryNote.findByPk(id);
  if (!note) {
    throw new ErrClass(ErrInfo.NotFound);
  }

  await note.destroy();

  await logAudit(
    req.user.id,
    auditAction.deleteCategoryNote,
    `category_note:${id}`,
    {
      type: note.type,
      year: note.year,
      month: note.month,
      categoryId: note.categoryId,
    },
  );

  res.json({ id: Number(id) });
};
