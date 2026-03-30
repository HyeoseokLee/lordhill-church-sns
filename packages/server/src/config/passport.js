const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./db');

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
        if (!email) {
          return done(new Error('Google 계정에서 이메일을 가져올 수 없습니다.'));
        }

        let user = await prisma.user.findUnique({
          where: { provider_providerId: { provider: 'google', providerId: profile.id } },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              nickname: profile.displayName || null,
              profileImageUrl: profile.photos?.[0]?.value || null,
              provider: 'google',
              providerId: profile.id,
              status: 'PENDING',
              role: 'MEMBER',
            },
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
    )
  );
} else {
  console.warn('Google OAuth credentials not set. Google login disabled.');
}

module.exports = passport;
