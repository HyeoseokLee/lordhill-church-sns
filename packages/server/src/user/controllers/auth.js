import jwt from 'jsonwebtoken';
import config from 'config';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userStatus } from '../../define.js';

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    config.JWT.JWT_SECRET,
    { expiresIn: config.JWT.EXPIRE_TIME },
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    config.JWT.JWT_REFRESH_SECRET,
    { expiresIn: config.JWT.EXPIRE_REFRESH_TIME },
  );
  return { accessToken, refreshToken };
};

const setCookies = (res, { accessToken, refreshToken }) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 60 * 60 * 1000, // 1시간
  });
  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30일
  });
};

export const oauthCallback = async (req, res) => {
  const { provider, providerId, email, profileImageUrl, nickname } =
    req.oauthProfile;

  let user = await models.User.findOne({
    where: { provider, providerId },
  });

  if (!user) {
    user = await models.User.create({
      email,
      nickname,
      profileImageUrl,
      provider,
      providerId,
      status: userStatus.pending,
    });
  }

  const tokens = generateTokens(user);
  setCookies(res, tokens);

  const clientUrl = config.cors.origins[0];
  if (user.status === userStatus.pending) {
    return res.redirect(`${clientUrl}/pending`);
  }
  if (user.status === userStatus.rejected) {
    return res.redirect(`${clientUrl}/rejected`);
  }
  return res.redirect(`${clientUrl}/feed`);
};

export const refreshToken = async (req, res) => {
  const token = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!token) {
    throw new ErrClass(ErrInfo.InvalidRefreshToken);
  }

  let payload;
  try {
    payload = jwt.verify(token, config.JWT.JWT_REFRESH_SECRET);
  } catch {
    throw new ErrClass(ErrInfo.InvalidRefreshToken);
  }

  const user = await models.User.findByPk(payload.id);
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }
  if (user.status === userStatus.deactivated) {
    throw new ErrClass(ErrInfo.UserDeactivated);
  }

  const tokens = generateTokens(user);
  setCookies(res, tokens);

  res.json({
    accessToken: tokens.accessToken,
    user: {
      id: user.id,
      nickname: user.nickname,
      role: user.role,
      status: user.status,
    },
  });
};

export const logout = async (_req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'ok' });
};

export const devLogin = async (_req, res) => {
  const [user] = await models.User.findOrCreate({
    where: { provider: 'dev', providerId: 'dev-user-1' },
    defaults: {
      email: 'dev@lordhill.church',
      nickname: '개발테스트',
      provider: 'dev',
      providerId: 'dev-user-1',
      role: 'member',
      status: userStatus.approved,
    },
  });

  // 혹시 기존 유저가 approved가 아니면 업데이트
  if (user.status !== userStatus.approved) {
    await user.update({ status: userStatus.approved });
  }

  const tokens = generateTokens(user);
  setCookies(res, tokens);

  res.json({
    accessToken: tokens.accessToken,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      profileImageUrl: user.profileImageUrl,
      provider: user.provider,
      role: user.role,
      status: user.status,
    },
  });
};

export const getMe = async (req, res) => {
  const user = await models.User.findByPk(req.user.id, {
    attributes: { exclude: ['updatedAt'] },
  });
  if (!user) {
    throw new ErrClass(ErrInfo.NotFoundUser);
  }
  res.json(user);
};
