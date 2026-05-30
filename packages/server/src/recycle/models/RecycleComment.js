import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class RecycleComment extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.belongsTo(models.Recycle, {
        foreignKey: 'recycleId',
        as: 'recycle',
      });
    }
  }

  RecycleComment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recycleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recycle_id',
        references: { model: 'recycles', key: 'id' },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: { model: 'users', key: 'id' },
      },
      content: {
        type: DataTypes.STRING(500),
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
      modelName: 'RecycleComment',
      tableName: 'recycle_comments',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return RecycleComment;
};
