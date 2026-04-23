import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class Comment extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'authorId',
        as: 'author',
      });
      this.belongsTo(models.Post, {
        foreignKey: 'postId',
        as: 'post',
      });
    }
  }

  Comment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'post_id',
        references: { model: 'posts', key: 'id' },
      },
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'author_id',
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
      modelName: 'Comment',
      tableName: 'comments',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Comment;
};
