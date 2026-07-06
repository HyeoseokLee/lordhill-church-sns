import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 유저 식사 주문 모델 (이벤트당 유저 1개)
export default (sequelize) => {
  class MealOrder extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.MealEvent, {
        foreignKey: 'eventId',
        as: 'event',
      });
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.hasMany(models.MealOrderItem, {
        foreignKey: 'orderId',
        as: 'items',
      });
    }
  }

  MealOrder.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'event_id',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      isPaid: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'is_paid',
      },
    },
    {
      sequelize,
      modelName: 'MealOrder',
      tableName: 'meal_orders',
      underscored: true,
      timestamps: true,
    },
  );

  return MealOrder;
};
