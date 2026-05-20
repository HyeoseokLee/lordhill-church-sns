const { defaultCreate } = require('../migrationLib/createHelper.cjs');
const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('fcm_tokens', {
      ...defaultCreate,
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      platform: {
        type: Sequelize.ENUM('ios', 'android'),
        allowNull: false,
      },
    });

    // 같은 토큰 중복 방지
    await queryInterface.addIndex('fcm_tokens', ['token'], { unique: true });
    // 유저별 토큰 조회용
    await queryInterface.addIndex('fcm_tokens', ['user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fcm_tokens');
  },
};
