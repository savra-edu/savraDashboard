import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = '00000000-0000-0000-0000-000000000000'; // Dummy ID, will likely fail FK but test Prisma mapping
  const feedback = 'Test feedback';

  console.log('Testing ConversionFeedback upsert...');
  try {
    const result = await prisma.conversionFeedback.upsert({
      where: { userId },
      update: { feedback },
      create: {
        userId,
        feedback,
      },
    });
    console.log('Result:', result);
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
