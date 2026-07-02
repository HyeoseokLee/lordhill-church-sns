import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 공지사항 이미지 모델
export default (sequelize) => {
  class NoticeMedia extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.Notice, {
        foreignKey: 'noticeId',
        as: 'notice',
      });
    }
  }

  NoticeMedia.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      noticeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'notice_id',
      },
      url: {
        type: DataTypes.STRING(500),
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
      modelName: 'NoticeMedia',
      tableName: 'notice_media',
      underscored: true,
      timestamps: true,
    },
  );

  return NoticeMedia;
};
