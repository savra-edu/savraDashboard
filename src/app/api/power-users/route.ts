import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // We use queryRaw to avoid any Prisma Client caching issues regarding the 'grade' column
    const rawTeachers: any = await prisma.$queryRaw`
      SELECT 
        t.id, t.created_at as "createdAt",
        u.name as teacher_name, u.email as teacher_email, u.avatar_url as "avatarUrl",
        s.name as school_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN schools s ON t.school_id = s.id
    `;

    // Map and calculate totals
    const powerUsers = await Promise.all(rawTeachers.map(async (t: any) => {
        const countsRes: any = await prisma.$queryRaw`
            SELECT 
                (SELECT COUNT(*) FROM lessons WHERE teacher_id = ${t.id}) as lessons,
                (SELECT COUNT(*) FROM quizzes WHERE teacher_id = ${t.id}) as quizzes,
                (SELECT COUNT(*) FROM assessments WHERE teacher_id = ${t.id}) as assessments
        `;
        const counts = countsRes[0];
        const total = Number(counts.lessons) + Number(counts.quizzes) + Number(counts.assessments);
        
        // Fetch raw phone
        const rawPhoneRes: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
        const phone = rawPhoneRes?.[0]?.phone || null;

        // Fetch grades from teacher_classes
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
            name: t.teacher_name,
            email: t.teacher_email,
            avatarUrl: t.avatarUrl,
            schoolName: t.school_name,
            phone,
            grade: grades,
            lastActiveAt,
            artifactCounts: {
                lessons: Number(counts.lessons),
                quizzes: Number(counts.quizzes),
                assessments: Number(counts.assessments),
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
