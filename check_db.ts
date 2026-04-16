import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teacherId = '0ae33eea-ea81-4e8d-93a5-cfdafa1302bb';
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      lessons: true,
      quizzes: true,
      assessments: true
    }
  });

  console.log('Teacher:', teacher?.userId);
  console.log('Lessons:', teacher?.lessons.length);
  console.log('Quizzes:', teacher?.quizzes.length);
  console.log('Assessments:', teacher?.assessments.length);

  // Let's also find ANY lesson/quiz/assessment in the DB
  const firstLesson = await prisma.lesson.findFirst();
  const firstQuiz = await prisma.quiz.findFirst();

  console.log('First Lesson Teacher ID:', firstLesson?.teacherId);
  console.log('First Quiz Teacher ID:', firstQuiz?.teacherId);
}

main().catch(console.error).finally(() => prisma.$disconnect());
