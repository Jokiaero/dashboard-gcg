const path = require("path");
const fs = require("fs");

// Direct Prisma client for testing
async function testSync() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Check if tables exist by querying
    const existingDocs = await prisma.uploadedDocument.findMany({
      where: { category: "pelaporan_penyuapan" },
    });
    
    console.log("Existing records in database:", existingDocs.length);
    existingDocs.forEach(d => console.log(`  - ${d.name}`));

    // Check disk files
    const dirPath = path.join(process.cwd(), "public", "assets", "pelaporan_penyuapan");
    const diskFiles = fs.readdirSync(dirPath).filter(f => !f.startsWith("."));
    console.log("\nFiles on disk:", diskFiles);

    // Manually upsert the file
    for (const fileName of diskFiles) {
      const filePath = path.join(dirPath, fileName);
      const stat = fs.statSync(filePath);
      
      const result = await prisma.uploadedDocument.upsert({
        where: {
          category_name: {
            category: "pelaporan_penyuapan",
            name: fileName,
          },
        },
        update: {
          isDeleted: false,
          deletedAt: null,
        },
        create: {
          category: "pelaporan_penyuapan",
          name: fileName,
          originalName: fileName,
          url: `/assets/pelaporan_penyuapan/${fileName}`,
          size: BigInt(stat.size),
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          isDeleted: false,
        },
      });

      console.log(`\nUpserted: ${fileName}`);
      console.log(`  ID: ${result.id}`);
      console.log(`  Size: ${stat.size}`);
    }

    // Check again
    const finalDocs = await prisma.uploadedDocument.findMany({
      where: { category: "pelaporan_penyuapan" },
    });
    console.log(`\nFinal count: ${finalDocs.length}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSync();
