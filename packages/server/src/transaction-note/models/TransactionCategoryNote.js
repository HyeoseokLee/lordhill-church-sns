import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 카테고리가 지정되지 않은 거래(미분류)의 메모를 담는 자리
export const UNCATEGORIZED_ID = 0;

// 헌금 통계 월별 카테고리 메모 모델 (soft delete)
export default (sequelize) => {
  class TransactionCategoryNote extends Sequelize.Model {
    static associate(models) {
      TransactionCategoryNote.belongsTo(models.TransactionCategory, {
        foreignKey: 'categoryId',
        as: 'category',
        constraints: false,
      });
    }
  }

  TransactionCategoryNote.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      month: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // UNCATEGORIZED_ID(0)는 실제 카테고리 행이 아니므로 외래키 제약을 걸지 않는다.
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: UNCATEGORIZED_ID,
        field: 'category_id',
      },
      content: {
        type: DataTypes.TEXT,
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
      modelName: 'TransactionCategoryNote',
      tableName: 'transaction_category_notes',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return TransactionCategoryNote;
};
