const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

prisma
  .$executeRawUnsafe(
    'ALTER TABLE "MenuItemCache" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT',
  )
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(
      "[quickserve] imageUrl ensure failed:",
      err && err.message ? err.message : err,
    );
    try {
      await prisma.$disconnect();
    } catch (_) {
      /* ignore */
    }
    process.exit(1);
  });
