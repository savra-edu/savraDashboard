import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacherClasses = await prisma.$queryRaw`
    SELECT * FROM teacher_classes LIMIT 10
  `;
  console.log('Teacher Classes:', JSON.stringify(teacherClasses, null, 2));

  // Try to find if there is a 'classes' table
  try {
    const classes = await prisma.$queryRaw`SELECT * FROM classes LIMIT 10`;
    console.log('Classes:', JSON.stringify(classes, null, 2));
  } catch (e) {
    console.log('No classes table found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
