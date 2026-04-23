const {
  defaultCreate,
  deletedAtCreate,
} = require('../migrationLib/createHelper.cjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. users
    await queryInterface.createTable('users', {
      ...defaultCreate,
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      nickname: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
      },
      profile_image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      provider: {
        type: Sequelize.ENUM('google', 'kakao', 'naver'),
        allowNull: false,
      },
      provider_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.ENUM('member', 'admin'),
        allowNull: false,
        defaultValue: 'member',
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        allowNull: false,
        defaultValue: 'pending',
      },
    });

    await queryInterface.addIndex('users', ['provider', 'provider_id'], {
      unique: true,
      name: 'users_provider_provider_id_unique',
    });

    // 2. posts (soft delete)
    await queryInterface.createTable('posts', {
      ...deletedAtCreate,
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    });

    await queryInterface.addIndex('posts', ['author_id']);
    await queryInterface.addIndex('posts', ['created_at']);

    // 3. post_media
    await queryInterface.createTable('post_media', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      media_type: {
        type: Sequelize.ENUM('image', 'video'),
        allowNull: false,
      },
      url: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('post_media', ['post_id']);

    // 4. likes
    await queryInterface.createTable('likes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('likes', ['user_id', 'post_id'], {
      unique: true,
      name: 'likes_user_id_post_id_unique',
    });

    // 5. comments (soft delete)
    await queryInterface.createTable('comments', {
      ...deletedAtCreate,
      post_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'posts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      author_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      content: {
        type: Sequelize.STRING(500),
        allowNull: false,
      },
    });

    await queryInterface.addIndex('comments', ['post_id']);
    await queryInterface.addIndex('comments', ['author_id']);

    // 6. admin_audit_logs
    await queryInterface.createTable('admin_audit_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      admin_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      action: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      target: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addIndex('admin_audit_logs', ['admin_user_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('admin_audit_logs');
    await queryInterface.dropTable('comments');
    await queryInterface.dropTable('likes');
    await queryInterface.dropTable('post_media');
    await queryInterface.dropTable('posts');
    await queryInterface.dropTable('users');
  },
};
