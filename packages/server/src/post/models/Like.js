import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class Like extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      this.belongsTo(models.Post, {
        foreignKey: 'postId',
        as: 'post',
      });
    }
  }

  Like.init(
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
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'post_id',
        references: { model: 'posts', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'Like',
      tableName: 'likes',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'post_id'],
        },
      ],
    },
  );

  return Like;
};
