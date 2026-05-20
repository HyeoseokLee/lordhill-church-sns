const { defaultCreate } = require('../migrationLib/createHelper.cjs');
const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('push_logs', {
      ...defaultCreate,
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      target_type: {
        type: Sequelize.ENUM('user', 'all'),
        allowNull: false,
      },
      target_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      },
      title: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      body: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      scheduled_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      success_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      failure_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending',
      },
    });

    // 푸시 발신자 조회용
    await queryInterface.addIndex('push_logs', ['sender_id']);
    // 상태별 조회용
    await queryInterface.addIndex('push_logs', ['status']);
    // 생성 시간 역순 조회용
    await queryInterface.addIndex('push_logs', ['created_at'], { order: [['created_at', 'DESC']] });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('push_logs');
  },
};
