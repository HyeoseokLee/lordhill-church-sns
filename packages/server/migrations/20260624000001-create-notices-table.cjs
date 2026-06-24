'use strict';

const {
  defaultCreate,
  deletedAtCreate,
} = require('../migrationLib/createHelper.cjs');

// 공지사항 테이블 생성
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notices', {
      ...defaultCreate,
      ...deletedAtCreate,
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      display_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notices');
  },
};
