import { jwtStrategy } from './jwtStrategy.js';
import { googleStrategy } from './googleStrategy.js';

const passportConfig = () => {
  jwtStrategy();
  googleStrategy();
};

export default passportConfig;
