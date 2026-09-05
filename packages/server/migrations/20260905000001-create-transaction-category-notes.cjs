const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');

// 헌금 통계의 월별 카테고리에 붙는 관리자 메모.
// 교인용 통계 화면에서 해당 카테고리를 펼치면 노출된다.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_category_notes', {
      ...deletedAtCreate,
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      month: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      // 0은 카테고리가 지정되지 않은 거래(미분류)를 뜻한다. 실제 행이 아니므로 외래키를 걸지 않는다.
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
    });

    // 한 칸(구분/연/월/카테고리)에 메모는 하나만 존재한다.
    await queryInterface.addIndex(
      'transaction_category_notes',
      ['type', 'year', 'month', 'category_id'],
      { unique: true, name: 'transaction_category_notes_unique' },
    );

    // 통계 조회 시 연도 단위로 한 번에 읽는다.
    await queryInterface.addIndex('transaction_category_notes', ['year']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transaction_category_notes');
  },
};
