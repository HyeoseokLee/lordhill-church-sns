module.exports = {
  async up(queryInterface, Sequelize) {
    // username 컬럼 추가 (TiDB: addColumn + unique 동시 불가 → 분리)
    await queryInterface.addColumn('users', 'username', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await queryInterface.addIndex('users', ['username'], {
      unique: true,
      name: 'users_username_unique',
    });

    // password 컬럼 추가
    await queryInterface.addColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'password');
    await queryInterface.removeColumn('users', 'username');
  },
};
