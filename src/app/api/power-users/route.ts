import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch all teachers with counts
    const allTeachers = await prisma.teacher.findMany({
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        school: { select: { name: true } },
        _count: { select: { lessons: true, quizzes: true, assessments: true } }
      }
    });

    // Map and calculate totals
    const powerUsers = await Promise.all(allTeachers.map(async t => {
        const total = t._count.lessons + t._count.quizzes + t._count.assessments;
        
        // Fetch phone and grade using raw SQL for reliability
        const rawTeacher: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
        const phone = rawTeacher?.[0]?.phone || null;

        const rawGrades: any = await prisma.$queryRaw`
            SELECT DISTINCT c.grade 
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            WHERE tc.teacher_id = ${t.id}
        `;
        const grades = rawGrades.map((g: any) => g.grade).filter(Boolean).join(', ') || 'N/A';

        // Fetch last active
        const [lastLesson, lastQuiz, lastAssessment] = await Promise.all([
            prisma.lesson.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
            prisma.quiz.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
            prisma.assessment.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
        ]);
        const dates = [lastLesson?.createdAt, lastQuiz?.createdAt, lastAssessment?.createdAt].filter(Boolean) as Date[];
        const lastActiveAt = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(t.createdAt);

        return {
            id: t.id,
            name: t.user.name,
            email: t.user.email,
            avatarUrl: t.user.avatarUrl,
            schoolName: t.school.name,
            phone,
            grade: grades,
            lastActiveAt,
            artifactCounts: {
                lessons: t._count.lessons,
                quizzes: t._count.quizzes,
                assessments: t._count.assessments,
                total
            }
        };
    }));

    // Sort by total artifacts descending and take top 50
    powerUsers.sort((a, b) => b.artifactCounts.total - a.artifactCounts.total);
    const topPowerUsers = powerUsers.slice(0, 50).filter(u => u.artifactCounts.total > 0);

    return NextResponse.json({
      success: true,
      data: topPowerUsers
    });

  } catch (error) {
    console.error('Power users fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch power users' }, { status: 500 });
  }
}
