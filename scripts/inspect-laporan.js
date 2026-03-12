const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.dataLaporan.count();
  const sample = await prisma.dataLaporan.findMany({
    orderBy: { id: 'desc' },
    take: 5,
  });

  console.log(JSON.stringify({ total, sample }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
