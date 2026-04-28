import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const daysParam = parseInt(searchParams.get('days') || '14', 10);
    const days = isNaN(daysParam) ? 14 : daysParam;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const chartStartDate = new Date(now);
    chartStartDate.setDate(now.getDate() - days);
    chartStartDate.setHours(0, 0, 0, 0);

    const [
      periodTeachers,
      teachersToday,
      totalTeachersLifetime,
      periodLessons,
      periodQuizzes,
      periodAssessmentsWorksheet,
      periodAssessmentsQuestionPaper,
      periodPresentations,
    ] = await Promise.all([
      prisma.teacher.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma.teacher.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.teacher.count(),
      prisma.lesson.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma.quiz.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma
        .$queryRaw<Array<{ count: bigint | number }>>`
          SELECT COUNT(*) as count
          FROM "assessments"
          WHERE "created_at" >= ${chartStartDate} AND "is_worksheet" = true
        `
        .then((rows) => Number(rows?.[0]?.count ?? 0)),
      prisma
        .$queryRaw<Array<{ count: bigint | number }>>`
          SELECT COUNT(*) as count
          FROM "assessments"
          WHERE "created_at" >= ${chartStartDate} AND "is_worksheet" = false
        `
        .then((rows) => Number(rows?.[0]?.count ?? 0)),
      prisma
        .$queryRaw<Array<{ count: bigint | number }>>`
          SELECT COUNT(*) as count
          FROM "presentations"
          WHERE "created_at" >= ${chartStartDate}
        `
        .then((rows) => Number(rows?.[0]?.count ?? 0)),
    ]);

    // Fetch daily teacher join counts
    const teachersByDayRaw = await prisma.teacher.findMany({
      where: {
        createdAt: {
          gte: chartStartDate
        }
      },
      select: { createdAt: true }
    });

    const dayCountMap: Record<string, number> = {};
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayCountMap[key] = 0;
    }

    teachersByDayRaw.forEach(t => {
      const dateKey = t.createdAt.toISOString().split('T')[0];
      if (dayCountMap[dateKey] !== undefined) {
        dayCountMap[dateKey]++;
      }
    });

    const chartData = Object.entries(dayCountMap).map(([date, count]) => ({
      date,
      count
    }));

    return NextResponse.json({
      success: true,
      data: {
        periodTeachers,
        teachersToday,
        totalTeachersLifetime,
        periodArtifacts:
          periodLessons +
          periodQuizzes +
          periodAssessmentsWorksheet +
          periodAssessmentsQuestionPaper +
          periodPresentations,
        artifactsBreakdown: {
          lessons: periodLessons,
          quizzes: periodQuizzes,
          assessments:
            periodAssessmentsWorksheet + periodAssessmentsQuestionPaper,
          worksheets: periodAssessmentsWorksheet,
          questionPapers: periodAssessmentsQuestionPaper,
          presentations: periodPresentations,
        },
        chartData
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
