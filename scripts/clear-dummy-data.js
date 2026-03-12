const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.dataLaporan.count();
  const deleted = await prisma.dataLaporan.deleteMany();
  const after = await prisma.dataLaporan.count();

  console.log(JSON.stringify({ before, deleted: deleted.count, after }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
