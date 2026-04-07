const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe(
      "SELECT penghargaan_note, penghargaan_url FROM dashboard_settings WHERE id = 1 LIMIT 1"
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
