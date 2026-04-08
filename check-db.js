const { PrismaClient } = require("@prisma/client");

async function check() {
  const prisma = new PrismaClient();
  try {
    const docs = await prisma.uploadedDocument.findMany({
      where: {
        category: "pelaporan_penyuapan",
        isDeleted: false,
      },
    });
    console.log("Found", docs.length, "active documents:");
    docs.forEach((d) => {
      console.log(`  Name: ${d.name}`);
      console.log(`  IsDeleted: ${d.isDeleted}`);
      console.log(`  UpdatedAt: ${d.updatedAt}`);
    });
  } finally {
    await prisma.$disconnect();
  }
}

check();
