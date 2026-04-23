import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class PostMedia extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.Post, {
        foreignKey: 'postId',
        as: 'post',
      });
    }
  }

  PostMedia.init(
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
      mediaType: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: false,
        field: 'media_type',
      },
      url: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'PostMedia',
      tableName: 'post_media',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );

  return PostMedia;
};
