'use strict';

// posts, comments 테이블의 author_id 컬럼을 user_id로 변경
module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn('posts', 'author_id', 'user_id');
    await queryInterface.renameColumn('comments', 'author_id', 'user_id');
  },

  async down(queryInterface) {
    await queryInterface.renameColumn('posts', 'user_id', 'author_id');
    await queryInterface.renameColumn('comments', 'user_id', 'author_id');
  },
};
