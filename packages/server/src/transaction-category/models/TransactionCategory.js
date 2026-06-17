import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 거래 카테고리 모델 (입금/출금 구분, soft delete)
export default (sequelize) => {
  class TransactionCategory extends Sequelize.Model {}

  TransactionCategory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'TransactionCategory',
      tableName: 'transaction_categories',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return TransactionCategory;
};
