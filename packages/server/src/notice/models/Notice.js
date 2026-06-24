import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 공지사항 모델
export default (sequelize) => {
  class Notice extends Sequelize.Model {}

  Notice.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        field: 'display_order',
      },
    },
    {
      sequelize,
      modelName: 'Notice',
      tableName: 'notices',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Notice;
};
