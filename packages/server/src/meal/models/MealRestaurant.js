import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 식당 모델
export default (sequelize) => {
  class MealRestaurant extends Sequelize.Model {
    static associate(models) {
      this.hasMany(models.MealMenu, {
        foreignKey: 'restaurantId',
        as: 'menus',
      });
      this.hasMany(models.MealEvent, {
        foreignKey: 'restaurantId',
        as: 'events',
      });
    }
  }

  MealRestaurant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      iconUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'icon_url',
      },
    },
    {
      sequelize,
      modelName: 'MealRestaurant',
      tableName: 'meal_restaurants',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return MealRestaurant;
};
