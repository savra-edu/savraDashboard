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
        startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
    }
    startDate.setHours(0, 0, 0, 0);

    let daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
    daysDiff = Math.min(Math.max(daysDiff, 1), 365); 

    const [lessons, quizzes, assessments] = await Promise.all([
      prisma.lesson.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      }),
      prisma.quiz.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      }),
      prisma.assessment.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        select: { teacherId: true, createdAt: true }
      })
    ]);

    const activeUsersPerDay: Record<string, Set<string>> = {};
    for (let i = 0; i <= daysDiff; i++) {
       const d = new Date(startDate);
       d.setDate(d.getDate() + i);
       if (d > endDate) break;
       const key = d.toISOString().split('T')[0];
       activeUsersPerDay[key] = new Set();
    }

    const processArtifacts = (artifacts: Array<{teacherId: string, createdAt: Date}>) => {
       artifacts.forEach(a => {
           const dKey = a.createdAt.toISOString().split('T')[0];
           if (activeUsersPerDay[dKey]) {
               activeUsersPerDay[dKey].add(a.teacherId);
           }
       });
    };

    processArtifacts(lessons);
    processArtifacts(quizzes);
    processArtifacts(assessments);

    let totalActiveAcrossPeriod = new Set<string>();
    let totalDauSum = 0;

    const chartData = Object.keys(activeUsersPerDay).map(k => {
      const dau = activeUsersPerDay[k].size;
      activeUsersPerDay[k].forEach(u => totalActiveAcrossPeriod.add(u));
      totalDauSum += dau;
      return {
        date: k,
        dau
      };
    });

    const numDays = chartData.length;
    const averageDau = numDays === 0 ? 0 : totalDauSum / numDays;
    const uniqueActiveTeachers = totalActiveAcrossPeriod.size;

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        averageDau,
        uniqueActiveTeachers,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('DAU stats error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch DAU stats' }, { status: 500 });
  }
}
