import config from 'config';
import passport from 'passport';
import passportJWT from 'passport-jwt';
import jwt from 'jsonwebtoken';
import models from '../db.js';
import { ErrClass, ErrInfo } from '../err.js';

const ExtractJWT = passportJWT.ExtractJwt;
const JWTStrategy = passportJWT.Strategy;

const cookieExtractor = (req) => {
  if (req && req.cookies) {
    return req.cookies.access_token;
  }
  return null;
};

const extractJwt = (req) => {
  // Bearer 토큰 우선, 없으면 쿠키 폴백
  const bearerToken = ExtractJWT.fromAuthHeaderAsBearerToken()(req);
  if (bearerToken) return bearerToken;
  return cookieExtractor(req);
};

export const jwtStrategy = () => {
  passport.use(
    'jwt',
    new JWTStrategy(
      {
        jwtFromRequest: extractJwt,
        secretOrKey: config.JWT.JWT_SECRET,
      },
      async (jwtPayload, done) => {
        const exUser = await models.User.findOne({
          where: { id: jwtPayload.id },
          attributes: {
            exclude: ['updatedAt'],
          },
        });

        if (exUser) {
          return done(null, exUser);
        }
        return done(new ErrClass(ErrInfo.UnAuthorized));
      },
    ),
  );
};

export const checkUserToken = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (_err, user) => {
    if (user) {
      req.user = user;
    } else {
      try {
        const userToken = extractJwt(req);
        if (userToken) {
          jwt.verify(userToken, config.JWT.JWT_SECRET);
        }
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          req.tokenExpired = true;
        }
      }
    }
    next();
  })(req, res, next);
};
