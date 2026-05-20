import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class PushLog extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'senderId',
        as: 'sender',
      });
      this.belongsTo(models.User, {
        foreignKey: 'targetUserId',
        as: 'targetUser',
      });
    }
  }

  PushLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'sender_id',
      },
      targetType: {
        type: DataTypes.ENUM('user', 'all'),
        allowNull: false,
        field: 'target_type',
      },
      targetUserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'target_user_id',
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'scheduled_at',
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'sent_at',
      },
      successCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'success_count',
      },
      failureCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'failure_count',
      },
      status: {
        type: DataTypes.ENUM('pending', 'sent', 'failed'),
        defaultValue: 'pending',
      },
    },
    {
      sequelize,
      modelName: 'PushLog',
      tableName: 'push_logs',
      underscored: true,
      timestamps: true,
    },
  );

  return PushLog;
};
