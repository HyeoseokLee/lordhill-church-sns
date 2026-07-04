import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';

// 개선요청 목록 조회 (댓글 포함, 최신순)
export const getSuggestions = async (_req, res) => {
  const suggestions = await models.Suggestion.findAll({
    include: [
      {
        model: models.SuggestionComment,
        as: 'comments',
        attributes: ['id', 'content', 'createdAt'],
        order: [['createdAt', 'ASC']],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: models.SuggestionComment, as: 'comments' }, 'createdAt', 'ASC'],
    ],
  });
  res.json(suggestions);
};

// 개선요청 작성 (익명)
export const createSuggestion = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const suggestion = await models.Suggestion.create({
    content: content.trim(),
  });
  res.status(201).json(suggestion);
};

// 개선요청 댓글 작성 (익명)
export const createSuggestionComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const suggestion = await models.Suggestion.findByPk(id);
  if (!suggestion) throw new ErrClass(ErrInfo.NotFound);

  const comment = await models.SuggestionComment.create({
    suggestionId: id,
    content: content.trim(),
  });
  res.status(201).json(comment);
};
