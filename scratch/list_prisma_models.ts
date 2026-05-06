import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Available models in Prisma Client:');
  const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  console.log(models);
}

main().catch(console.error);
