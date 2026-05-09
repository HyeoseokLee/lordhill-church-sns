import { jwtStrategy } from './jwtStrategy.js';
import { googleStrategy } from './googleStrategy.js';
import { kakaoStrategy } from './kakaoStrategy.js';

const passportConfig = () => {
  jwtStrategy();
  googleStrategy();
  kakaoStrategy();
};

export default passportConfig;
