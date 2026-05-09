// Google OAuth 2.0 Passport 전략
import config from 'config';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { oauthProvider } from '../define.js';

export const googleStrategy = () => {
  passport.use(
    'google',
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackUrl,
      },
      (_accessToken, _refreshToken, profile, done) => {
        // Google 프로필을 oauthProfile 형태로 변환
        const oauthProfile = {
          provider: oauthProvider.google,
          providerId: profile.id,
          email: profile.emails?.[0]?.value || '',
          profileImageUrl: profile.photos?.[0]?.value || '',
          nickname: profile.displayName || '',
        };
        return done(null, oauthProfile);
      },
    ),
  );
};
