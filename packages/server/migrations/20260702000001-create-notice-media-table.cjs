'use strict';

const { defaultCreate } = require('../migrationLib/createHelper.cjs');

// 공지사항 이미지 테이블
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notice_media', {
      ...defaultCreate,
      notice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'notices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      url: {
        type: Sequelize.STRING(500),
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
    await queryInterface.dropTable('notice_media');
  },
};
