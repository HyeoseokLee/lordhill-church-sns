'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameTable('donors', 'counterparties');
  },

  async down(queryInterface) {
    await queryInterface.renameTable('counterparties', 'donors');
  },
};
