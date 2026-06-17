const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');
const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('donors', {
      ...deletedAtCreate,
      name: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('donors');
  },
};
