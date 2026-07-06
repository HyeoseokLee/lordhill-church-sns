'use strict';

const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    // 중복 방지: 이미 존재하면 스킵
    const [existing] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE username = 'sub-admin' LIMIT 1",
    );
    if (existing.length > 0) return;

    const hashedPassword = await bcrypt.hash('1111', 10);
    await queryInterface.bulkInsert('users', [
      {
        email: 'sub-admin@lordhill-sns.kr',
        nickname: '서브관리자',
        provider: 'dev',
        provider_id: 'sub-admin',
        role: 'sub_admin',
        status: 'approved',
        username: 'sub-admin',
        password: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: 'sub-admin' });
  },
};
