import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [lessonsToday, quizzesToday, assessmentsToday] = await Promise.all([
      prisma.lesson.findMany({ where: { createdAt: { gte: todayStart } }, select: { teacherId: true } }),
      prisma.quiz.findMany({ where: { createdAt: { gte: todayStart } }, select: { teacherId: true } }),
      prisma.assessment.findMany({ where: { createdAt: { gte: todayStart } }, select: { teacherId: true } })
    ]);

    const activeSet = new Set<string>();

    lessonsToday.forEach(x => activeSet.add(x.teacherId));
    quizzesToday.forEach(x => activeSet.add(x.teacherId));
    assessmentsToday.forEach(x => activeSet.add(x.teacherId));

    const totalArtifactsToday = lessonsToday.length + quizzesToday.length + assessmentsToday.length;

    // Find ALL teachers that signed up today OR actively generated something today
    const rawTeachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { createdAt: { gte: todayStart } },
          { id: { in: Array.from(activeSet) } }
        ]
      },
      include: {
        user: { select: { name: true, email: true } },
        school: { select: { name: true } },
        _count: {
          select: { lessons: true, quizzes: true, assessments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    let newTeachersCount = 0;

    const teachersList = rawTeachers.map(t => {
      const isNewToday = new Date(t.createdAt) >= todayStart;
      if (isNewToday) newTeachersCount++;

      return {
        id: t.id,
        name: t.user?.name || 'Unknown',
        email: t.user?.email || 'Unknown',
        schoolName: t.school?.name || 'Unknown',
        createdAt: t.createdAt,
        isNewToday,
        generatedToday: activeSet.has(t.id),
        totalArtifacts: t._count.lessons + t._count.quizzes + t._count.assessments
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        newTeachersToday: newTeachersCount,
        totalArtifactsToday,
        lessonsToday: lessonsToday.length,
        quizzesToday: quizzesToday.length,
        assessmentsToday: assessmentsToday.length,
        activeUsersToday: activeSet.size,
        teachersList
      }
    });

  } catch (error) {
    console.error('Today stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch today stats' }, { status: 500 });
  }
}
