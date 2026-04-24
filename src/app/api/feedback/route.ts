import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const ratingFilter = searchParams.get('rating');
    const skip = (page - 1) * limit;

    // Base query for stats (always unfiltered by rating for the global summary)
    const statsRes: any = await prisma.$queryRaw`
      SELECT 
        rating,
        COUNT(*) as count
      FROM feedback
      GROUP BY rating
    `;

    const distribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
      total: 0,
      average: 0
    };

    let totalRatingSum = 0;
    statsRes.forEach((row: any) => {
      const r = Number(row.rating);
      if (r >= 1 && r <= 5) {
        distribution[r as keyof typeof distribution] = Number(row.count);
        distribution.total += Number(row.count);
        totalRatingSum += (r * Number(row.count));
      }
    });
    distribution.average = distribution.total > 0 ? Number((totalRatingSum / distribution.total).toFixed(1)) : 0;

    // Filtered query for the list
    let feedback: any[];
    let total: number;

    if (ratingFilter) {
      const r = parseInt(ratingFilter);
      feedback = await prisma.$queryRaw`
        SELECT f.*, u.name as teacher_name, u.email as teacher_email, s.name as school_name
        FROM feedback f
        JOIN teachers t ON f.teacher_id = t.id
        JOIN users u ON t.user_id = u.id
        JOIN schools s ON t.school_id = s.id
        WHERE f.rating = ${r}
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      total = distribution[r as keyof typeof distribution] || 0;
    } else {
      feedback = await prisma.$queryRaw`
        SELECT f.*, u.name as teacher_name, u.email as teacher_email, s.name as school_name
        FROM feedback f
        JOIN teachers t ON f.teacher_id = t.id
        JOIN users u ON t.user_id = u.id
        JOIN schools s ON t.school_id = s.id
        ORDER BY f.created_at DESC
        LIMIT ${limit} OFFSET ${skip}
      `;
      total = distribution.total;
    }

    const mappedFeedback = await Promise.all(feedback.map(async (f: any) => {
        // Fetch phone and grade using the same robust logic
        const rawTeacher: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${f.teacher_id} LIMIT 1`;
        const phone = rawTeacher?.[0]?.phone || null;

        const rawGrades: any = await prisma.$queryRaw`
            SELECT DISTINCT c.grade 
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            WHERE tc.teacher_id = ${f.teacher_id}
        `;
        const grades = rawGrades.map((g: any) => g.grade).filter(Boolean).join(', ') || 'N/A';

        return {
            id: f.id,
            rating: f.rating,
            message: f.message,
            promptKind: f.prompt_kind,
            artifactType: f.artifact_type,
            artifactId: f.artifact_id,
            createdAt: f.created_at,
            teacher: {
                id: f.teacher_id,
                name: f.teacher_name,
                email: f.teacher_email,
                schoolName: f.school_name,
                phone,
                grade: grades
            }
        };
    }));

    return NextResponse.json({
      success: true,
      data: mappedFeedback,
      distribution,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
