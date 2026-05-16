import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import config from 'config';
import models from '../../db.js';
import { ErrClass, ErrInfo } from '../../err.js';
import { userRole } from '../../define.js';

// 어드민 아이디/비밀번호 로그인
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ErrClass(ErrInfo.BadRequest);
  }

  const user = await models.User.findOne({
    where: { username, role: userRole.admin },
  });

  if (!user) {
    throw new ErrClass(ErrInfo.InvalidCredentials);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new ErrClass(ErrInfo.InvalidCredentials);
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    config.JWT.JWT_SECRET,
    { expiresIn: config.JWT.EXPIRE_TIME },
  );

  res.json({ accessToken });
};
