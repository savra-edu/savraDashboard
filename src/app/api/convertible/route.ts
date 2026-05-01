import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const rawLeads: any[] = await prisma.$queryRaw`
      WITH recent_actions AS (
          SELECT teacher_id, created_at::date as action_date, 'lesson' as type FROM lessons WHERE created_at >= ${fourteenDaysAgo}
          UNION ALL
          SELECT teacher_id, created_at::date as action_date, 'quiz' as type FROM quizzes WHERE created_at >= ${fourteenDaysAgo}
          UNION ALL
          SELECT teacher_id, created_at::date as action_date, 'presentation' as type FROM presentations WHERE created_at >= ${fourteenDaysAgo}
          UNION ALL
          SELECT teacher_id, created_at::date as action_date, 
                 CASE WHEN is_worksheet THEN 'worksheet' ELSE 'question_paper' END as type 
          FROM assessments WHERE created_at >= ${fourteenDaysAgo}
      ),
      aggregated_signals AS (
          SELECT 
              teacher_id,
              COUNT(DISTINCT action_date) as distinct_days,
              COUNT(*) as total_artifacts,
              COUNT(*) FILTER (WHERE type = 'worksheet') as worksheets_count,
              COUNT(*) FILTER (WHERE type = 'question_paper') as question_papers_count,
              COUNT(*) FILTER (WHERE type = 'quiz') as quizzes_count,
              COUNT(*) FILTER (WHERE type = 'lesson') as lessons_count,
              COUNT(*) FILTER (WHERE type = 'presentation') as presentations_count
          FROM recent_actions
          GROUP BY teacher_id
      )
      SELECT 
          u.id as "userId",
          u.name as "userName",
          u.email as "userEmail",
          t.id as "teacherId",
          t.phone as "teacherPhone",
          t.created_at as "joinedAt",
          CAST(s.distinct_days AS INTEGER) as "distinctDays",
          CAST(s.total_artifacts AS INTEGER) as "totalArtifacts",
          CAST(s.worksheets_count AS INTEGER) as "worksheets",
          CAST(s.question_papers_count AS INTEGER) as "questionPapers",
          CAST(s.quizzes_count AS INTEGER) as "quizzes",
          CAST(s.lessons_count AS INTEGER) as "lessons",
          CAST(s.presentations_count AS INTEGER) as "presentations",
          CAST(((s.distinct_days * 15) + (s.total_artifacts * 2)) AS INTEGER) as "conversionScore",
          cf.feedback as "feedback"
      FROM users u
      JOIN teachers t ON t.user_id = u.id
      JOIN aggregated_signals s ON s.teacher_id = t.id
      LEFT JOIN conversion_feedback cf ON cf.user_id = u.id
      WHERE u.plan = 'free' OR u.plan IS NULL
      ORDER BY "conversionScore" DESC
      LIMIT 100
    `;

    const leads = rawLeads.map(lead => ({
      id: lead.userId,
      teacherId: lead.teacherId,
      name: lead.userName || 'Anonymous User',
      email: lead.userEmail,
      phone: lead.teacherPhone || '—',
      joinedAt: lead.joinedAt,
      feedback: lead.feedback || '',
      metrics: {
        distinctDays: lead.distinctDays || 0,
        totalArtifacts: lead.totalArtifacts || 0,
        worksheets: lead.worksheets || 0,
        questionPapers: lead.questionPapers || 0,
        quizzes: lead.quizzes || 0,
        lessons: lead.lessons || 0,
        presentations: lead.presentations || 0
      },
      conversionScore: lead.conversionScore || 0
    }));

    return NextResponse.json({
      success: true,
      data: leads
    });

  } catch (error: any) {
    console.error('Convertible users failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
