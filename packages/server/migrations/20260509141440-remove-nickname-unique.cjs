'use strict';

module.exports = {
  async up(queryInterface) {
    // nickname 유니크 인덱스 제거
    await queryInterface.removeIndex('users', 'nickname');
  },

  async down(queryInterface) {
    // 롤백 시 유니크 인덱스 복원
    await queryInterface.addIndex('users', ['nickname'], {
      unique: true,
      name: 'nickname',
    });
  },
};
