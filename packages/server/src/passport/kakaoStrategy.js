// Kakao OAuth 2.0 Passport 전략
import config from 'config';
import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import { oauthProvider } from '../define.js';

export const kakaoStrategy = () => {
  passport.use(
    'kakao',
    new KakaoStrategy(
      {
        clientID: config.oauth.kakao.clientId,
        clientSecret: config.oauth.kakao.clientSecret,
        callbackURL: config.oauth.kakao.callbackUrl,
      },
      (_accessToken, _refreshToken, profile, done) => {
        // Kakao 프로필을 oauthProfile 형태로 변환
        const oauthProfile = {
          provider: oauthProvider.kakao,
          providerId: String(profile.id),
          email: profile._json?.kakao_account?.email || '',
          profileImageUrl:
            profile._json?.kakao_account?.profile?.profile_image_url || '',
          nickname: profile.displayName || '',
        };
        return done(null, oauthProfile);
      },
    ),
  );
};
