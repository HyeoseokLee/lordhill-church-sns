'use strict';

// pushs 테이블 생성 (알림 + 푸시 이력 통합)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pushs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      sender_type: {
        type: Sequelize.ENUM('system', 'admin', 'user'),
        allowNull: false,
        defaultValue: 'system',
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      body: { type: Sequelize.TEXT, allowNull: false },
      path: { type: Sequelize.STRING(500), allowNull: true },
      is_read: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // 유저별 조회 + 안 읽은 건수 인덱스
    await queryInterface.addIndex('pushs', ['user_id', 'is_read']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('pushs');
  },
};
