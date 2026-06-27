import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 사용자 차단 모델
export default (sequelize) => {
  class UserBlock extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'blockerId',
        as: 'blocker',
      });
      this.belongsTo(models.User, {
        foreignKey: 'blockedId',
        as: 'blocked',
      });
    }
  }

  UserBlock.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      blockerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'blocker_id',
      },
      blockedId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'blocked_id',
      },
    },
    {
      sequelize,
      modelName: 'UserBlock',
      tableName: 'user_blocks',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['blocker_id', 'blocked_id'],
        },
      ],
    },
  );

  return UserBlock;
};
