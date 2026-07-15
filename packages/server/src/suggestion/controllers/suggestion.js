import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { sendPushToUser } from '../../push/pushService.js';
import logger from '../../logger.js';

// 개선요청 목록 조회 (댓글 포함, 최신순)
export const getSuggestions = async (_req, res) => {
  const suggestions = await models.Suggestion.findAll({
    attributes: ['id', 'userId', 'content', 'createdAt'],
    include: [
      {
        model: models.SuggestionComment,
        as: 'comments',
        attributes: ['id', 'userId', 'content', 'createdAt'],
      },
    ],
    order: [
      ['createdAt', 'DESC'],
      [{ model: models.SuggestionComment, as: 'comments' }, 'createdAt', 'ASC'],
    ],
  });
  res.json(suggestions);
};

// 개선요청 작성
export const createSuggestion = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const suggestion = await models.Suggestion.create({
    userId: req.user?.id || null,
    content: content.trim(),
  });
  res.status(201).json(suggestion);
};

// 개선요청 수정 (본인만)
export const updateSuggestion = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const suggestion = await models.Suggestion.findByPk(id);
  if (!suggestion) throw new ErrClass(ErrInfo.NotFound);
  if (suggestion.userId !== req.user.id) throw new ErrClass(ErrInfo.Forbidden);

  suggestion.content = content.trim();
  await suggestion.save();
  res.json(suggestion);
};

// 개선요청 삭제 (본인만, 댓글도 일괄 삭제)
export const deleteSuggestion = async (req, res) => {
  const { id } = req.params;
  const suggestion = await models.Suggestion.findByPk(id);
  if (!suggestion) throw new ErrClass(ErrInfo.NotFound);
  if (suggestion.userId !== req.user.id) throw new ErrClass(ErrInfo.Forbidden);

  await models.SuggestionComment.destroy({ where: { suggestionId: id } });
  await suggestion.destroy();
  res.json({ ok: true });
};

// 개선요청 댓글 작성
export const createSuggestionComment = async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const suggestion = await models.Suggestion.findByPk(id);
  if (!suggestion) throw new ErrClass(ErrInfo.NotFound);

  const comment = await models.SuggestionComment.create({
    userId: req.user?.id || null,
    suggestionId: id,
    content: content.trim(),
  });

  // 글 작성자에게 푸시 (본인 댓글 제외, 익명이라 이름 미노출)
  if (suggestion.userId && suggestion.userId !== req.user?.id) {
    sendPushToUser(suggestion.userId, {
      title: '개선요청',
      body: '내 글에 새 댓글이 달렸습니다.',
      data: { path: '/feed/suggestions' },
    }).catch((err) =>
      logger.error('suggestion-comment-push-failed', { error: err.message }),
    );
  }

  res.status(201).json(comment);
};

// 개선요청 댓글 수정 (본인만)
export const updateSuggestionComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;
  if (!content || !content.trim()) throw new ErrClass(ErrInfo.BadRequest);

  const comment = await models.SuggestionComment.findByPk(commentId);
  if (!comment) throw new ErrClass(ErrInfo.NotFound);
  if (comment.userId !== req.user.id) throw new ErrClass(ErrInfo.Forbidden);

  comment.content = content.trim();
  await comment.save();
  res.json(comment);
};

// 개선요청 댓글 삭제 (본인만)
export const deleteSuggestionComment = async (req, res) => {
  const { commentId } = req.params;
  const comment = await models.SuggestionComment.findByPk(commentId);
  if (!comment) throw new ErrClass(ErrInfo.NotFound);
  if (comment.userId !== req.user.id) throw new ErrClass(ErrInfo.Forbidden);

  await comment.destroy();
  res.json({ ok: true });
};
