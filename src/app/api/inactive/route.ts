import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - 14);

    const allTeachers = await prisma.teacher.findMany({
      include: {
        user: { select: { name: true, email: true } },
        school: { select: { name: true } },
        lessons: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        quizzes: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
        assessments: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } }
      }
    });

    const mappedTeachers = await Promise.all(allTeachers.map(async t => {
      const lastLesson = t.lessons[0]?.createdAt;
      const lastQuiz = t.quizzes[0]?.createdAt;
      const lastAssessment = t.assessments[0]?.createdAt;

      const dates = [lastLesson, lastQuiz, lastAssessment].filter(Boolean) as Date[];
      let lastActiveAt = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
      
      if (!lastActiveAt) {
          lastActiveAt = new Date(t.createdAt);
      }

      const rawTeacher: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
      const phone = rawTeacher?.[0]?.phone || null;

      return {
        id: t.id,
        name: t.user.name,
        email: t.user.email,
        phoneNumber: phone,
        schoolName: t.school.name,
        createdAt: t.createdAt,
        lastActiveAt
      };
    }));

    const inactiveTeachers = mappedTeachers.filter(t => {
      return t.lastActiveAt! < inactiveThreshold;
    });

    inactiveTeachers.sort((a, b) => {
        return b.lastActiveAt!.getTime() - a.lastActiveAt!.getTime();
    });

    return NextResponse.json({
      success: true,
      data: inactiveTeachers
    });

  } catch (error) {
    console.error('Inactive teachers error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch inactive teachers' }, { status: 500 });
  }
}
