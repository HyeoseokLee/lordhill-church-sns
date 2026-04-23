import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class AdminAuditLog extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.User, {
        foreignKey: 'adminUserId',
        as: 'adminUser',
      });
    }
  }

  AdminAuditLog.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      adminUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'admin_user_id',
        references: { model: 'users', key: 'id' },
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      target: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'AdminAuditLog',
      tableName: 'admin_audit_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );

  return AdminAuditLog;
};
