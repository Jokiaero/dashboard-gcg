import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2] || 'vip';
  const plainPassword = process.argv[3] || 'vip123';
  const password = await bcrypt.hash(plainPassword, 10);
  
  await prisma.user.upsert({
    where: { username },
    update: {
      password: password,
      role: 'USER_VIP'
    },
    create: {
      username,
      password: password,
      role: 'USER_VIP'
    }
  });
  
  console.log('--- AKUN VIP BERHASIL DIBUAT / DIPERBARUI ---');
  console.log(`Username: ${username}`);
  console.log(`Password: ${plainPassword}`);
  console.log('Role: USER_VIP');
}

main().catch(console.error).finally(() => prisma.$disconnect());
