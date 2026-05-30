'use strict';

// recycles, recycle_media, recycle_comments 테이블 생성
module.exports = {
  async up(queryInterface, Sequelize) {
    // recycles
    await queryInterface.createTable('recycles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      content: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    // recycle_media
    await queryInterface.createTable('recycle_media', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recycle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'recycles', key: 'id' },
      },
      media_type: { type: Sequelize.ENUM('image', 'video'), allowNull: false },
      url: { type: Sequelize.STRING(500), allowNull: false },
      order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // recycle_comments
    await queryInterface.createTable('recycle_comments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      recycle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'recycles', key: 'id' },
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      content: { type: Sequelize.STRING(500), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recycle_comments');
    await queryInterface.dropTable('recycle_media');
    await queryInterface.dropTable('recycles');
  },
};
