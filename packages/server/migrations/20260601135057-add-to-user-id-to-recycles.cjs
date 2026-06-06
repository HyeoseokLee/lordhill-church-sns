'use strict';

// recycles 테이블에 to_user_id 컬럼 추가 (공유받는 사람)
module.exports = {
  async up(queryInterface, Sequelize) {
    // TiDB: addColumn + references 동시 불가 → 분리
    await queryInterface.addColumn('recycles', 'to_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });
    await queryInterface.addIndex('recycles', ['to_user_id'], {
      name: 'recycles_to_user_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('recycles', 'to_user_id');
  },
};
