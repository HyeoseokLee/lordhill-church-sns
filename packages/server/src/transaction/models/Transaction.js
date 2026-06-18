import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 헌금 거래내역 모델
export default (sequelize) => {
  class Transaction extends Sequelize.Model {
    static associate(models) {
      Transaction.belongsTo(models.Counterparty, {
        foreignKey: 'counterpartyId',
        as: 'counterparty',
      });
      Transaction.belongsTo(models.TransactionCategory, {
        foreignKey: 'categoryId',
        as: 'category',
      });
    }
  }

  Transaction.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      transactionDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'transaction_date',
      },
      type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
      },
      rawName: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: '',
        field: 'raw_name',
      },
      counterpartyId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'counterparty_id',
      },
      withdrawal: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      deposit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      balance: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      note: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: '',
      },
      memo: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: '',
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'category_id',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Transaction;
};
