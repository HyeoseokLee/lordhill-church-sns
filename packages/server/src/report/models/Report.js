import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 신고 모델 (게시글/댓글/재활용/재활용댓글 통합)
export default (sequelize) => {
  class Report extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'reporter',
      });
    }
  }

  Report.init(
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
      targetType: {
        type: DataTypes.ENUM('post', 'comment', 'recycle', 'recycle_comment'),
        allowNull: false,
        field: 'target_type',
      },
      targetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'target_id',
      },
      reason: {
        type: DataTypes.ENUM('spam', 'abuse', 'inappropriate', 'other'),
        allowNull: false,
      },
      detail: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'resolved', 'dismissed'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'Report',
      tableName: 'reports',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['user_id', 'target_type', 'target_id'],
        },
      ],
    },
  );

  return Report;
};
