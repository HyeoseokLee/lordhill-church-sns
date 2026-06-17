const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');
const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('transaction_categories', {
      ...deletedAtCreate,
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
    });

    // 타입별 이름 중복 방지
    await queryInterface.addIndex('transaction_categories', ['type', 'name'], {
      unique: true,
      where: { deleted_at: null },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transaction_categories');
  },
};
