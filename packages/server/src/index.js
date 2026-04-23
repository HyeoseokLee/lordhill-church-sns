import 'dotenv/config';
import config from 'config';
import http from 'http';
import app from './app.js';
import logger from './logger.js';
import db from './db.js';

app.set('port', config.bind.port);

const server = http.createServer(app);

(async () => {
  try {
    await db.sequelize.authenticate();
    logger.info('db-connected', {
      host: config.sequelize.host,
      port: config.sequelize.port,
      database: config.sequelize.database,
    });

    server.listen(config.bind.port, config.bind.address, () => {
      logger.info('server-listening-on', config.bind);
    });
  } catch (err) {
    logger.error('server-startup-failed', {
      err: err.message,
      stack: err.stack,
    });
    process.exit(1);
  }
})();
