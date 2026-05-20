import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class FcmToken extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  FcmToken.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
      },
      token: {
        type: DataTypes.STRING(500),
        allowNull: false,
        unique: true,
      },
      platform: {
        type: DataTypes.ENUM('ios', 'android'),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'FcmToken',
      tableName: 'fcm_tokens',
      underscored: true,
      timestamps: true,
    },
  );

  return FcmToken;
};
