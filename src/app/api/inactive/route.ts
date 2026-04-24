import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const inactiveThreshold = new Date();
    inactiveThreshold.setDate(inactiveThreshold.getDate() - 14);

    // Using queryRaw to avoid any Prisma Client caching issues
    const rawTeachers: any = await prisma.$queryRaw`
      SELECT 
        t.id, t.created_at as "createdAt",
        u.name as teacher_name, u.email as teacher_email,
        s.name as school_name
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      JOIN schools s ON t.school_id = s.id
    `;

    const mappedTeachers = await Promise.all(rawTeachers.map(async (t: any) => {
      const [lastLesson, lastQuiz, lastAssessment] = await Promise.all([
        prisma.lesson.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.quiz.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
        prisma.assessment.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
      ]);

      const dates = [lastLesson?.createdAt, lastQuiz?.createdAt, lastAssessment?.createdAt].filter(Boolean) as Date[];
      let lastActiveAt = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;
      
      if (!lastActiveAt) {
          lastActiveAt = new Date(t.createdAt);
      }

      const rawPhoneRes: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
      const phone = rawPhoneRes?.[0]?.phone || null;

      return {
        id: t.id,
        name: t.teacher_name,
        email: t.teacher_email,
        phoneNumber: phone,
        schoolName: t.school_name,
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
