const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Execute raw SQL to add the column
    await prisma.$executeRaw`ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bonusEnabled" BOOLEAN DEFAULT true`;
    console.log('Successfully added bonusEnabled column to Store table');
    
    // Verify the column was added
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
        bonusEnabled: true
      },
      take: 1
    });
    console.log('Verification - Sample store:', stores[0]);
  } catch (error) {
    console.error('Error adding column:', error);
    // If column already exists, that's okay
    if (error.code === 'P2010') {
      console.log('Column might already exist, continuing...');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });