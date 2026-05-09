// Naver OAuth 2.0 Passport 전략
import config from 'config';
import passport from 'passport';
import { Strategy as NaverStrategy } from 'passport-naver-v2';
import { oauthProvider } from '../define.js';

export const naverStrategy = () => {
  passport.use(
    'naver',
    new NaverStrategy(
      {
        clientID: config.oauth.naver.clientId,
        clientSecret: config.oauth.naver.clientSecret,
        callbackURL: config.oauth.naver.callbackUrl,
      },
      (_accessToken, _refreshToken, profile, done) => {
        // Naver 프로필을 oauthProfile 형태로 변환
        const oauthProfile = {
          provider: oauthProvider.naver,
          providerId: profile.id,
          email: profile.email || '',
          profileImageUrl: profile.profileImage || '',
          nickname: profile.nickname || profile.name || '',
        };
        return done(null, oauthProfile);
      },
    ),
  );
};
