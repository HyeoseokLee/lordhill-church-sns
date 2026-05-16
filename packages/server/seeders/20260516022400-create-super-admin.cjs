// 슈퍼 어드민 계정 시더
const bcrypt = require('bcryptjs');

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash('lordhill2026!', 10);

    await queryInterface.bulkInsert('users', [
      {
        email: 'admin@lordhill-sns.kr',
        nickname: '관리자',
        provider: 'dev',
        provider_id: 'super-admin',
        role: 'admin',
        status: 'approved',
        username: 'admin',
        password: hashedPassword,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', { username: 'admin' });
  },
};
