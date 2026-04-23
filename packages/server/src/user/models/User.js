import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class User extends Sequelize.Model {
    static associate(models) {
      this.hasMany(models.Post, {
        foreignKey: 'authorId',
        as: 'posts',
      });
      this.hasMany(models.Comment, {
        foreignKey: 'authorId',
        as: 'comments',
      });
      this.hasMany(models.Like, {
        foreignKey: 'userId',
        as: 'likes',
      });
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      nickname: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },
      profileImageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'profile_image_url',
      },
      provider: {
        type: DataTypes.ENUM('google', 'kakao', 'naver', 'dev'),
        allowNull: false,
      },
      providerId: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'provider_id',
      },
      role: {
        type: DataTypes.ENUM('member', 'admin'),
        allowNull: false,
        defaultValue: 'member',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['provider', 'provider_id'],
        },
      ],
    },
  );

  return User;
};
