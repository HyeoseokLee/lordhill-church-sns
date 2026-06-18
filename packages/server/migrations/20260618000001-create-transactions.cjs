const { deletedAtCreate } = require('../migrationLib/createHelper.cjs');
const Sequelize = require('sequelize');

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable('transactions', {
      ...deletedAtCreate,
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: '거래일시',
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
        comment: '입금/출금',
      },
      raw_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
        comment: '보낸분/받는분 (CSV 원본)',
      },
      counterparty_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'counterparties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '확정이름 FK',
      },
      withdrawal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '출금액',
      },
      deposit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '입금액',
      },
      balance: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '잔액',
      },
      note: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
        comment: '내 통장 표시',
      },
      memo: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
        comment: '메모',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'transaction_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '카테고리 FK',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('transactions');
  },
};
