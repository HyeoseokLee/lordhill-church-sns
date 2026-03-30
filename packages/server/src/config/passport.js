const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const KakaoStrategy = require('passport-kakao').Strategy;
const NaverStrategy = require('passport-naver-v2').Strategy;
const prisma = require('./db');

// 공통: OAuth 프로필 → DB 유저 찾기/생성
async function findOrCreateUser(provider, providerId, email, nickname, profileImage) {
  let user = await prisma.user.findUnique({
    where: { provider_providerId: { provider, providerId } },
  });

  if (!user) {
    // 이메일이 없는 경우 (Kakao에서 이메일 미동의 시)
    const finalEmail = email || `${provider}_${providerId}@no-email.local`;

    user = await prisma.user.create({
      data: {
        email: finalEmail,
        nickname: nickname || null,
        profileImageUrl: profileImage || null,
        provider,
        providerId,
        status: 'PENDING',
        role: 'MEMBER',
      },
    });
  }

  return user;
}

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const user = await findOrCreateUser(
            'google',
            profile.id,
            email,
            profile.displayName,
            profile.photos?.[0]?.value
          );
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
} else {
  console.warn('Google OAuth credentials not set. Google login disabled.');
}

// Kakao
if (process.env.KAKAO_CLIENT_ID) {
  passport.use(
    new KakaoStrategy(
      {
        clientID: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
        callbackURL: process.env.KAKAO_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile._json?.kakao_account?.email || null;
          const nickname = profile.displayName || profile._json?.properties?.nickname;
          const profileImage =
            profile._json?.properties?.profile_image ||
            profile._json?.kakao_account?.profile?.profile_image_url;

          const user = await findOrCreateUser(
            'kakao',
            String(profile.id),
            email,
            nickname,
            profileImage
          );
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
} else {
  console.warn('Kakao OAuth credentials not set. Kakao login disabled.');
}

// Naver
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: process.env.NAVER_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.email || null;
          const nickname = profile.nickname || profile.name;
          const profileImage = profile.profileImage;

          const user = await findOrCreateUser(
            'naver',
            profile.id,
            email,
            nickname,
            profileImage
          );
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
} else {
  console.warn('Naver OAuth credentials not set. Naver login disabled.');
}

module.exports = passport;
