import Sequelize from 'sequelize';

const { DataTypes } = Sequelize;

// 익명 개선요청 모델
export default (sequelize) => {
  class Suggestion extends Sequelize.Model {
    static associate(models) {
      this.hasMany(models.SuggestionComment, {
        foreignKey: 'suggestionId',
        as: 'comments',
      });
    }
  }

  Suggestion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Suggestion',
      tableName: 'suggestions',
      underscored: true,
      timestamps: true,
      paranoid: true,
    },
  );

  return Suggestion;
};
