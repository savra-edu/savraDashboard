import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params;

    const [lessons, quizzes, assessments] = await Promise.all([
      prisma.lesson.findMany({
        where: { teacherId },
        select: { id: true, title: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.quiz.findMany({
        where: { teacherId },
        select: { id: true, title: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      }),
      prisma.assessment.findMany({
        where: { teacherId },
        select: { id: true, title: true, createdAt: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 50
      })
    ]);

    const artifacts = [
      ...lessons.map(l => ({ ...l, type: 'lesson' })),
      ...quizzes.map(q => ({ ...q, type: 'quiz' })),
      ...assessments.map(a => ({ ...a, type: 'assessment' }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return NextResponse.json({
      success: true,
      data: { artifacts }
    });
  } catch (error) {
    console.error('Teacher artifacts error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch artifacts' }, { status: 500 });
  }
}
