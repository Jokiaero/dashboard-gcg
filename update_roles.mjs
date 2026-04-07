import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const mappings = [
    { from: 'SUPERADMIN', to: 'ADMIN' },
    { from: 'GUEST', to: 'USER' },
    { from: 'AUDITOR', to: 'USER' },
    { from: 'STAFF', to: 'USER_VIP' },
  ];

  for (const map of mappings) {
    const result = await prisma.user.updateMany({
      where: { role: map.from },
      data: { role: map.to }
    });
    console.log(`Updated ${result.count} users from ${map.from} to ${map.to}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
