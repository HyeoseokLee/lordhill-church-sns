import { ErrClass, ErrInfo } from './err.js';

export const onlyLoginUser = (req, _res, next) => {
  if (req.user) {
    next();
    return;
  }
  if (req.tokenExpired) {
    throw new ErrClass(ErrInfo.TokenExpired);
  }
  throw new ErrClass(ErrInfo.UnAuthorized);
};

export const onlyApprovedUser = (req, _res, next) => {
  if (!req.user) {
    throw new ErrClass(ErrInfo.UnAuthorized);
  }
  if (req.user.status === 'pending') {
    throw new ErrClass(ErrInfo.UserPending);
  }
  if (req.user.status === 'rejected') {
    throw new ErrClass(ErrInfo.UserRejected);
  }
  if (req.user.status === 'deactivated') {
    throw new ErrClass(ErrInfo.UserDeactivated);
  }
  next();
};

export const onlyAdmin = (req, _res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
    return;
  }
  throw new ErrClass(ErrInfo.Forbidden);
};
