import { NextResponse } from 'next/server';
// Cache bust: 2026-04-24
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      lessonsToday,
      quizzesToday,
      assessmentsWorksheetToday,
      assessmentsQuestionPaperToday,
    ] = await Promise.all([
      prisma.lesson.findMany({ where: { createdAt: { gte: todayStart } }, select: { teacherId: true } }),
      prisma.quiz.findMany({ where: { createdAt: { gte: todayStart } }, select: { teacherId: true } }),
      prisma.$queryRaw<Array<{ teacher_id: string }>>`
        SELECT "teacher_id"
        FROM "assessments"
        WHERE "created_at" >= ${todayStart} AND "is_worksheet" = true
      `.then((rows: Array<{ teacher_id: string }>) => rows.map((r: { teacher_id: string }) => ({ teacherId: r.teacher_id }))),
      prisma.$queryRaw<Array<{ teacher_id: string }>>`
        SELECT "teacher_id"
        FROM "assessments"
        WHERE "created_at" >= ${todayStart} AND "is_worksheet" = false
      `.then((rows: Array<{ teacher_id: string }>) => rows.map((r: { teacher_id: string }) => ({ teacherId: r.teacher_id }))),
    ]);

    const activeSet = new Set<string>();

    lessonsToday.forEach((x: { teacherId: string }) => activeSet.add(x.teacherId));
    quizzesToday.forEach((x: { teacherId: string }) => activeSet.add(x.teacherId));
    assessmentsWorksheetToday.forEach((x: { teacherId: string }) => activeSet.add(x.teacherId));
    assessmentsQuestionPaperToday.forEach((x: { teacherId: string }) => activeSet.add(x.teacherId));

    const assessmentsTodayTotal =
      assessmentsWorksheetToday.length + assessmentsQuestionPaperToday.length;

    const totalArtifactsToday =
      lessonsToday.length + quizzesToday.length + assessmentsTodayTotal;

    // Find ALL teachers that signed up today OR actively generated something today
    const rawTeachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { createdAt: { gte: todayStart } },
          { id: { in: Array.from(activeSet) } }
        ]
      },
      select: {
        id: true,
        createdAt: true,
        schoolId: true,
        user: { select: { name: true, email: true } },
        school: { select: { name: true } },
        _count: { select: { lessons: true, quizzes: true, assessments: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    let newTeachersCount = 0;

    const teachersList = await Promise.all(rawTeachers.map(async (t: any) => {
      const isNewToday = new Date(t.createdAt) >= todayStart;
      if (isNewToday) newTeachersCount++;

      // Fetch raw phone only
      const rawTeacher: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
      const phone = rawTeacher?.[0]?.phone || null;

      return {
        id: t.id,
        name: t.user?.name || 'Unknown',
        email: t.user?.email || 'Unknown',
        phoneNumber: phone,
        grade: 'N/A', // Grade fetching removed as requested
        schoolName: t.school?.name || 'Unknown',
        createdAt: t.createdAt,
        isNewToday,
        generatedToday: activeSet.has(t.id),
        totalArtifacts: t._count.lessons + t._count.quizzes + t._count.assessments
      };
    }));

    return NextResponse.json({
      success: true,
      data: {
        newTeachersToday: newTeachersCount,
        totalArtifactsToday,
        lessonsToday: lessonsToday.length,
        quizzesToday: quizzesToday.length,
        assessmentsToday: assessmentsTodayTotal,
        assessmentsWorksheetToday: assessmentsWorksheetToday.length,
        assessmentsQuestionPaperToday: assessmentsQuestionPaperToday.length,
        activeUsersToday: activeSet.size,
        teachersList
      }
    });

  } catch (error) {
    console.error('Today stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch today stats' }, { status: 500 });
  }
}
