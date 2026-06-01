import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class Recycle extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.belongsTo(models.User, {
        foreignKey: 'toUserId',
        as: 'toUser',
      });
      this.hasMany(models.RecycleMedia, {
        foreignKey: 'recycleId',
        as: 'media',
      });
      this.hasMany(models.RecycleComment, {
        foreignKey: 'recycleId',
        as: 'comments',
      });
    }
  }

  Recycle.init(
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
        references: { model: 'users', key: 'id' },
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      toUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'to_user_id',
        references: { model: 'users', key: 'id' },
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'Recycle',
      tableName: 'recycles',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Recycle;
};
