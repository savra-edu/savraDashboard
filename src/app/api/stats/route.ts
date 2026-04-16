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
      periodAssessments,
    ] = await Promise.all([
      prisma.teacher.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma.teacher.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.teacher.count(),
      prisma.lesson.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma.quiz.count({ where: { createdAt: { gte: chartStartDate } } }),
      prisma.assessment.count({ where: { createdAt: { gte: chartStartDate } } }),
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
        periodArtifacts: periodLessons + periodQuizzes + periodAssessments,
        artifactsBreakdown: {
          lessons: periodLessons,
          quizzes: periodQuizzes,
          assessments: periodAssessments
        },
        chartData
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
