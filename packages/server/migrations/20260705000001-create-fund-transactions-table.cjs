'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 울타리기금 거래내역 테이블 (transactions와 동일 스키마)
    await queryInterface.createTable('fund_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transaction_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('income', 'expense'),
        allowNull: false,
      },
      raw_name: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
      },
      counterparty_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'counterparties', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      withdrawal: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      deposit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      balance: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      note: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
      },
      memo: {
        type: Sequelize.STRING(200),
        allowNull: false,
        defaultValue: '',
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'transaction_categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fund_transactions');
  },
};
