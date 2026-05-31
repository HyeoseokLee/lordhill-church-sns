'use strict';

// recycles 테이블에 status 컬럼 추가 (0: 공유전, 1: 공유완료)
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('recycles', 'status', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('recycles', 'status');
  },
};
