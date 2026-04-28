import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ success: false, error: 'Teacher ID is required' }, { status: 400 });
    }

    const teacherRecord = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { createdAt: true }
    });

    const joinDate = teacherRecord?.createdAt 
      ? new Date(teacherRecord.createdAt) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    joinDate.setHours(0, 0, 0, 0);

    // 1. Fetch exact breakdown counts
    const [
      worksheets,
      questionPapers,
      quizzes,
      lessons,
      presentations
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) as count FROM assessments WHERE teacher_id = ${teacherId} AND is_worksheet = true
      `.then(rows => Number(rows?.[0]?.count ?? 0)),
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) as count FROM assessments WHERE teacher_id = ${teacherId} AND is_worksheet = false
      `.then(rows => Number(rows?.[0]?.count ?? 0)),
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) as count FROM quizzes WHERE teacher_id = ${teacherId}
      `.then(rows => Number(rows?.[0]?.count ?? 0)),
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) as count FROM lessons WHERE teacher_id = ${teacherId}
      `.then(rows => Number(rows?.[0]?.count ?? 0)),
      prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) as count FROM presentations WHERE teacher_id = ${teacherId}
      `.then(rows => Number(rows?.[0]?.count ?? 0))
    ]);

    // 2. Fetch daily usage timestamps since joining
    const [
      rawWorksheets,
      rawQuestionPapers,
      rawQuizzes,
      rawLessons,
      rawPresentations
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM assessments WHERE teacher_id = ${teacherId} AND is_worksheet = true AND created_at >= ${joinDate}`,
      prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM assessments WHERE teacher_id = ${teacherId} AND is_worksheet = false AND created_at >= ${joinDate}`,
      prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM quizzes WHERE teacher_id = ${teacherId} AND created_at >= ${joinDate}`,
      prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM lessons WHERE teacher_id = ${teacherId} AND created_at >= ${joinDate}`,
      prisma.$queryRaw<Array<{ created_at: Date }>>`SELECT created_at FROM presentations WHERE teacher_id = ${teacherId} AND created_at >= ${joinDate}`
    ]);

    // Aggregate daily counts from join date to today
    const dayCountMap: Record<string, number> = {};
    const now = new Date();
    
    // Fill map from joinDate to now
    let runner = new Date(joinDate);
    while (runner <= now) {
      const key = runner.toISOString().split('T')[0];
      dayCountMap[key] = 0;
      runner.setDate(runner.getDate() + 1);
    }

    const processTimestamps = (rows: Array<{ created_at: Date }>) => {
      rows.forEach(r => {
        if (!r.created_at) return;
        const dateKey = new Date(r.created_at).toISOString().split('T')[0];
        if (dayCountMap[dateKey] !== undefined) {
          dayCountMap[dateKey]++;
        }
      });
    };

    processTimestamps(rawWorksheets);
    processTimestamps(rawQuestionPapers);
    processTimestamps(rawQuizzes);
    processTimestamps(rawLessons);
    processTimestamps(rawPresentations);

    const chartData = Object.entries(dayCountMap).map(([date, count]) => ({
      date,
      count
    }));

    return NextResponse.json({
      success: true,
      data: {
        breakdown: {
          worksheets,
          questionPapers,
          quizzes,
          lessons,
          presentations,
          total: worksheets + questionPapers + quizzes + lessons + presentations
        },
        chartData
      }
    });

  } catch (error: any) {
    console.error('Failed to fetch usage:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
