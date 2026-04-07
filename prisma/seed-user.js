const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: hash, role: 'ADMIN' }
  });
  console.log('User admin berhasil dibuat!');
  console.log('Username: admin');
  console.log('Password: admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
