import { prisma } from '../src/lib/prisma';

async function test() {
  try {
    const total = await prisma.teacher.count();
    console.log('Direct Prisma Count:', total);
    
    const rawTeachers = await prisma.teacher.findMany({
      skip: 0,
      take: 10,
      include: {
        _count: {
          select: {
            lessons: true,
            quizzes: true,
            assessments: true
          }
        }
      }
    });
    console.log('Prisma success. Found teachers:', rawTeachers.length);
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
