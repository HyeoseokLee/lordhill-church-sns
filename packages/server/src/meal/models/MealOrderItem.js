import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 주문 상세 모델 (메뉴별 수량)
export default (sequelize) => {
  class MealOrderItem extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.MealOrder, {
        foreignKey: 'orderId',
        as: 'order',
      });
      this.belongsTo(models.MealMenu, {
        foreignKey: 'menuId',
        as: 'menu',
      });
    }
  }

  MealOrderItem.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'order_id',
      },
      menuId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'menu_id',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'MealOrderItem',
      tableName: 'meal_order_items',
      underscored: true,
      timestamps: true,
    },
  );

  return MealOrderItem;
};
