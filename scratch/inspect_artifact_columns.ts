import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tables = ['lessons', 'quizzes', 'assessments'];
  for (const table of tables) {
    console.log(`--- ${table} Columns ---`);
    const cols = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = '${table}'
    `);
    console.log(JSON.stringify(cols, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
