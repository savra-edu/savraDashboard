import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');

    const endDate = endParam ? new Date(endParam) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startParam ? new Date(startParam) : new Date(endDate);
    if (!startParam) {
        startDate.setDate(startDate.getDate() - 60); // Default to last 60 days to show trend
    }
    startDate.setHours(0, 0, 0, 0);

    let daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    daysDiff = Math.min(Math.max(daysDiff, 1), 365); 

    // Fetch artifacts for the range + 7 days prior to calculate the first WAU points correctly
    const fetchStartDate = new Date(startDate);
    fetchStartDate.setDate(fetchStartDate.getDate() - 7);

    const [lessons, quizzes, assessments] = await Promise.all([
      prisma.lesson.findMany({
        where: { createdAt: { gte: fetchStartDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      }),
      prisma.quiz.findMany({
        where: { createdAt: { gte: fetchStartDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      }),
      prisma.assessment.findMany({
        where: { createdAt: { gte: fetchStartDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      })
    ]);

    const allArtifacts = [...lessons, ...quizzes, ...assessments];

    const chartData = [];
    for (let i = 0; i <= daysDiff; i++) {
       const targetDate = new Date(startDate);
       targetDate.setDate(targetDate.getDate() + i);
       const dateKey = targetDate.toISOString().split('T')[0];

       const weekAgo = new Date(targetDate);
       weekAgo.setDate(weekAgo.getDate() - 7);

       const uniqueUsersInWeek = new Set();
       allArtifacts.forEach(a => {
           if (a.createdAt >= weekAgo && a.createdAt <= targetDate) {
               uniqueUsersInWeek.add(a.teacherId);
           }
       });

       chartData.push({
         date: dateKey,
         wau: uniqueUsersInWeek.size
       });
    }

    const currentWau = chartData[chartData.length - 1].wau;
    const previousWau = chartData.length > 7 ? chartData[chartData.length - 8].wau : 0;
    const growth = previousWau === 0 ? 100 : ((currentWau - previousWau) / previousWau) * 100;

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        currentWau,
        growth,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('WAU stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch WAU stats' }, { status: 500 });
  }
}
