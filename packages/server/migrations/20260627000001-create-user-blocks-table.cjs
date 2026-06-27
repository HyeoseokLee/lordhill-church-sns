'use strict';

const { defaultCreate } = require('../migrationLib/createHelper.cjs');

// 사용자 차단 테이블 생성
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_blocks', {
      ...defaultCreate,
      blocker_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      blocked_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
    });

    await queryInterface.addIndex('user_blocks', ['blocker_id', 'blocked_id'], {
      unique: true,
      name: 'user_blocks_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('user_blocks');
  },
};
