import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class Post extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'authorId',
        as: 'author',
      });
      this.hasMany(models.PostMedia, {
        foreignKey: 'postId',
        as: 'media',
      });
      this.hasMany(models.Like, {
        foreignKey: 'postId',
        as: 'likes',
      });
      this.hasMany(models.Comment, {
        foreignKey: 'postId',
        as: 'comments',
      });
    }
  }

  Post.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      authorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'author_id',
        references: { model: 'users', key: 'id' },
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'deleted_at',
      },
    },
    {
      sequelize,
      modelName: 'Post',
      tableName: 'posts',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Post;
};
