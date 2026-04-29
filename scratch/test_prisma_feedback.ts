import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Prisma models:', Object.keys(prisma));
  try {
    const count = await (prisma as any).feedback.count();
    console.log('Feedback count:', count);
  } catch (e) {
    console.log('Feedback model error:', e.message);
  }
}

main().catch(console.error).finally(() => (prisma as any).$disconnect());
