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

// 소셜 로그인 시 유저 조회/복구/생성 공통 처리
const findOrRestoreUser = async ({
  provider,
  providerId,
  email,
  nickname,
  profileImageUrl,
}) => {
  // soft-deleted 유저도 포함하여 조회
  let user = await models.User.findOne({
    where: { provider, providerId },
    paranoid: false,
  });

  // 잠금 계정
  if (user && user.status === userStatus.deactivated) {
    return { user: null, error: 'account_locked' };
  }

  // 삭제된 계정
  if (user && user.deletedAt) {
    return { user: null, error: 'account_deleted' };
  }

  // 신규 가입
  if (!user) {
    user = await models.User.create({
      email,
      nickname,
      profileImageUrl,
      provider,
      providerId,
      status: userStatus.approved,
    });
  }

  return { user, error: null };
};

export const oauthCallback = async (req, res) => {
  const { provider, providerId, email, profileImageUrl, nickname } =
    req.oauthProfile;

  const clientUrl = config.cors.origins[0];
  const { user, error } = await findOrRestoreUser({
    provider,
    providerId,
    email,
    nickname,
    profileImageUrl,
  });

  // 잠금 계정 → 에러 쿼리 파라미터로 리다이렉트
  if (error) {
    return res.redirect(`${clientUrl}/login?error=${error}`);
  }

  const tokens = generateTokens(user);
  setCookies(res, tokens);

  // 프론트 OAuthCallbackPage에서 토큰으로 유저 정보 조회 후 분기 처리
  return res.redirect(`${clientUrl}/auth/callback?token=${tokens.accessToken}`);
};

// 네이티브 앱에서 Google idToken으로 로그인
export const googleNativeLogin = async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  // Google idToken 검증
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
  );
  if (!response.ok) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  const payload = await response.json();
  const { sub: providerId, email, name, picture } = payload;

  const { user, error } = await findOrRestoreUser({
    provider: 'google',
    providerId,
    email,
    nickname: name,
    profileImageUrl: picture,
  });
  if (error === 'account_locked') throw new ErrClass(ErrInfo.UserDeactivated);
  if (error === 'account_deleted') throw new ErrClass(ErrInfo.UserDeleted);

  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
};

// 네이티브 앱에서 Kakao accessToken으로 로그인
export const kakaoNativeLogin = async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  // Kakao 사용자 정보 조회
  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  const payload = await response.json();
  const providerId = String(payload.id);
  const email = payload.kakao_account?.email || '';
  const nickname = payload.kakao_account?.profile?.nickname || '';
  const profileImageUrl =
    payload.kakao_account?.profile?.profile_image_url || '';

  const { user, error } = await findOrRestoreUser({
    provider: 'kakao',
    providerId,
    email,
    nickname,
    profileImageUrl,
  });
  if (error === 'account_locked') throw new ErrClass(ErrInfo.UserDeactivated);
  if (error === 'account_deleted') throw new ErrClass(ErrInfo.UserDeleted);

  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
};

// 네이티브 앱에서 Apple identityToken으로 로그인
export const appleNativeLogin = async (req, res) => {
  const { identityToken, fullName } = req.body;
  if (!identityToken) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  // Apple identityToken 검증 (JWT 디코딩)
  const tokenParts = identityToken.split('.');
  if (tokenParts.length !== 3) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  const payload = JSON.parse(
    Buffer.from(tokenParts[1], 'base64').toString('utf8'),
  );
  const providerId = payload.sub;
  const email = payload.email || '';

  if (!providerId) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  // Apple은 최초 로그인 시에만 이름을 제공
  const nickname = fullName || '';

  const { user, error } = await findOrRestoreUser({
    provider: 'apple',
    providerId,
    email,
    nickname,
    profileImageUrl: '',
  });
  if (error === 'account_locked') throw new ErrClass(ErrInfo.UserDeactivated);
  if (error === 'account_deleted') throw new ErrClass(ErrInfo.UserDeleted);

  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
};

// 네이티브 앱에서 Naver accessToken으로 로그인
export const naverNativeLogin = async (req, res) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  // Naver 사용자 정보 조회
  const response = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  const { response: profile } = await response.json();
  const providerId = profile.id;
  const email = profile.email || '';
  const nickname = profile.nickname || profile.name || '';
  const profileImageUrl = profile.profile_image || '';

  const { user, error } = await findOrRestoreUser({
    provider: 'naver',
    providerId,
    email,
    nickname,
    profileImageUrl,
  });
  if (error === 'account_locked') throw new ErrClass(ErrInfo.UserDeactivated);
  if (error === 'account_deleted') throw new ErrClass(ErrInfo.UserDeleted);

  const tokens = generateTokens(user);
  res.json({ accessToken: tokens.accessToken });
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

// 심사용 로그인 (고정 계정 + 비밀번호)
export const reviewLogin = async (req, res) => {
  const { email, password } = req.body;
  if (email !== 'review@lordhill.church' || password !== 'lordhill2026!') {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }

  const [user] = await models.User.findOrCreate({
    where: { provider: 'dev', providerId: 'review-user' },
    defaults: {
      email: 'review@lordhill.church',
      nickname: '심사계정',
      provider: 'dev',
      providerId: 'review-user',
      role: 'member',
      status: userStatus.approved,
      tosAcceptedAt: new Date(),
    },
  });

  if (user.status !== userStatus.approved) {
    await user.update({ status: userStatus.approved });
  }

  const tokens = generateTokens(user);
  setCookies(res, tokens);
  res.json({ accessToken: tokens.accessToken });
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
