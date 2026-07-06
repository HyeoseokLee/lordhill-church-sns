import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 식사 이벤트 모델 (특정 날짜에 식당 노출)
export default (sequelize) => {
  class MealEvent extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.MealRestaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
      this.hasMany(models.MealOrder, {
        foreignKey: 'eventId',
        as: 'orders',
      });
    }
  }

  MealEvent.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      restaurantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'restaurant_id',
      },
      targetDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        field: 'target_date',
      },
      status: {
        type: DataTypes.ENUM('active', 'closed'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'MealEvent',
      tableName: 'meal_events',
      underscored: true,
      timestamps: true,
    },
  );

  return MealEvent;
};
