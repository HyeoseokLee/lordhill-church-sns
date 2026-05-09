import { jwtStrategy } from './jwtStrategy.js';
import { googleStrategy } from './googleStrategy.js';
import { kakaoStrategy } from './kakaoStrategy.js';
import { naverStrategy } from './naverStrategy.js';

const passportConfig = () => {
  jwtStrategy();
  googleStrategy();
  kakaoStrategy();
  naverStrategy();
};

export default passportConfig;
