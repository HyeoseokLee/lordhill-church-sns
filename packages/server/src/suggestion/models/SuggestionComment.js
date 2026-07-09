import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 익명 개선요청 댓글 모델
export default (sequelize) => {
  class SuggestionComment extends Sequelize.Model {
    static associate(models) {
      this.belongsTo(models.Suggestion, {
        foreignKey: 'suggestionId',
        as: 'suggestion',
      });
    }
  }

  SuggestionComment.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
      },
      suggestionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'suggestion_id',
      },
      content: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'SuggestionComment',
      tableName: 'suggestion_comments',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return SuggestionComment;
};
