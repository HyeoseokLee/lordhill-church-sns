'use strict';

// provider ENUM에 'apple' 추가
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN provider ENUM('google', 'kakao', 'naver', 'dev', 'apple') NOT NULL",
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      "ALTER TABLE users MODIFY COLUMN provider ENUM('google', 'kakao', 'naver', 'dev') NOT NULL",
    );
  },
};
