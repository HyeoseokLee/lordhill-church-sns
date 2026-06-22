'use strict';

// 이용약관 동의 일시 컬럼 추가
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'tos_accepted_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'tos_accepted_at');
  },
};
