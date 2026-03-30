const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 최초 관리자 계정 (Google OAuth로 로그인 후 이 이메일이면 자동 ADMIN)
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.log('ADMIN_EMAIL 환경변수를 설정해주세요.');
    console.log('예: ADMIN_EMAIL=admin@gmail.com npm run db:seed');
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    await prisma.user.update({
      where: { email: adminEmail },
      data: { role: 'ADMIN', status: 'APPROVED' },
    });
    console.log(`Updated ${adminEmail} to ADMIN`);
  } else {
    console.log(`${adminEmail} 계정이 아직 없습니다. 먼저 로그인한 후 seed를 다시 실행하세요.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
