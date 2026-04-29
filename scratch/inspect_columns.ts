import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users: any = await prisma.$queryRaw`
    SELECT email, name, plan 
    FROM users 
    LIMIT 5
  `;
  console.log("Sample Users:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());

