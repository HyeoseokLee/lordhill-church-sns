import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 거래처 모델 (입금자/출금처)
export default (sequelize) => {
  class Counterparty extends Sequelize.Model {}

  Counterparty.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(50),
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
      modelName: 'Counterparty',
      tableName: 'counterparties',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Counterparty;
};
