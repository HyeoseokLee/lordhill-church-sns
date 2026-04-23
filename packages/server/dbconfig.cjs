require('dotenv').config();

const config = {
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  database: process.env.DB_DATABASE || 'lordhill_sns',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3307,
  dialect: 'mysql',
  dialectOptions: {
    charset: 'utf8mb4_general_ci',
  },
};

module.exports = {
  development: config,
  test: config,
  production: {
    ...config,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  },
};
