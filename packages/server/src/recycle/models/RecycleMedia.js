import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

export default (sequelize) => {
  class RecycleMedia extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.Recycle, {
        foreignKey: 'recycleId',
        as: 'recycle',
      });
    }
  }

  RecycleMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      recycleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recycle_id',
        references: { model: 'recycles', key: 'id' },
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
      modelName: 'RecycleMedia',
      tableName: 'recycle_media',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    },
  );

  return RecycleMedia;
};
