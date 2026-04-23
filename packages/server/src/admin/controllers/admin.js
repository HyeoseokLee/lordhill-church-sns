import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userStatus, auditAction } from '../../define.js';

const logAudit = async (adminUserId, action, target, metadata) => {
  await models.AdminAuditLog.create({ adminUserId, action, target, metadata });
};

export const getUsers = async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) {
    where.status = status;
  }

  const users = await models.User.findAll({
    where,
    attributes: [
      'id',
      'email',
      'nickname',
      'profileImageUrl',
      'provider',
      'role',
      'status',
      'createdAt',
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json(users);
};

export const approveUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  await user.update({ status: userStatus.approved });
  await logAudit(req.user.id, auditAction.approveUser, `user:${user.id}`, {
    nickname: user.nickname,
  });

  res.json(user);
};

export const rejectUser = async (req, res) => {
  const user = await models.User.findByPk(req.params.id);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }

  await user.update({ status: userStatus.rejected });
  await logAudit(req.user.id, auditAction.rejectUser, `user:${user.id}`, {
    nickname: user.nickname,
  });

  res.json(user);
};

export const deletePostByAdmin = async (req, res) => {
  const post = await models.Post.findByPk(req.params.id);
  if (!post) {
    throw new ErrClass(ErrInfo.NotFoundPost);
  }

  await post.destroy(); // soft delete
  await logAudit(req.user.id, auditAction.deletePost, `post:${post.id}`, {
    authorId: post.authorId,
  });

  res.json({ message: 'ok' });
};

export const deleteCommentByAdmin = async (req, res) => {
  const comment = await models.Comment.findByPk(req.params.id);
  if (!comment) {
    throw new ErrClass(ErrInfo.NotFoundComment);
  }

  await comment.destroy(); // soft delete
  await logAudit(
    req.user.id,
    auditAction.deleteComment,
    `comment:${comment.id}`,
    {
      authorId: comment.authorId,
      postId: comment.postId,
    },
  );

  res.json({ message: 'ok' });
};

export const getDashboard = async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, pendingUsers, todayPosts] = await Promise.all([
    models.User.count(),
    models.User.count({ where: { status: userStatus.pending } }),
    models.Post.count({
      where: { createdAt: { [models.Sequelize.Op.gte]: today } },
    }),
  ]);

  res.json({ totalUsers, pendingUsers, todayPosts });
};
