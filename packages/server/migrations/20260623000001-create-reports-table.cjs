'use strict';

const {
  defaultCreate,
} = require('../migrationLib/createHelper.cjs');

// 신고 테이블 생성 (게시글/댓글/재활용/재활용댓글 통합)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('reports', {
      ...defaultCreate,
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      target_type: {
        type: Sequelize.ENUM('post', 'comment', 'recycle', 'recycle_comment'),
        allowNull: false,
      },
      target_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      reason: {
        type: Sequelize.ENUM('spam', 'abuse', 'inappropriate', 'other'),
        allowNull: false,
      },
      detail: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'pending',
      },
    });

    // 같은 유저가 같은 대상을 중복 신고 방지
    await queryInterface.addIndex('reports', ['user_id', 'target_type', 'target_id'], {
      unique: true,
      name: 'reports_user_target_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('reports');
  },
};
