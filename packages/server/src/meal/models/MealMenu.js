import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 식사 메뉴 모델 (식당에 종속)
export default (sequelize) => {
  class MealMenu extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.MealRestaurant, {
        foreignKey: 'restaurantId',
        as: 'restaurant',
      });
    }
  }

  MealMenu.init(
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
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'display_order',
      },
    },
    {
      sequelize,
      modelName: 'MealMenu',
      tableName: 'meal_menus',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return MealMenu;
};
