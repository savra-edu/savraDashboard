import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'joined_desc';
    const skip = (page - 1) * limit;

    let orderBy: any = undefined;
    if (sort === 'name_asc') orderBy = { user: { name: 'asc' } };
    else if (sort === 'name_desc') orderBy = { user: { name: 'desc' } };
    else if (sort === 'joined_asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'joined_desc') orderBy = { createdAt: 'desc' };

    const includeConfig = {
      user: { select: { name: true, email: true, avatarUrl: true } },
      school: { select: { name: true } },
      _count: { select: { lessons: true, quizzes: true, assessments: true } }
    };

    let teachersData = [];
    const total = await prisma.teacher.count();

    // If sorting by artifacts, Prisma can't natively sort by a sum of multiple _count relationships
    // Since this is an internal mock overview, we fetch all and sort in JavaScript memory before slicing.
    if (sort === 'artifacts_desc' || sort === 'artifacts_asc') {
        const rawTeachers = await prisma.teacher.findMany({ include: includeConfig });
        
        const mapped = rawTeachers.map(t => ({
            id: t.id,
            name: t.user.name,
            email: t.user.email,
            avatarUrl: t.user.avatarUrl,
            schoolName: t.school.name,
            createdAt: t.createdAt,
            artifactCounts: {
              lessons: t._count.lessons,
              quizzes: t._count.quizzes,
              assessments: t._count.assessments,
              total: t._count.lessons + t._count.quizzes + t._count.assessments
            }
        }));

        mapped.sort((a, b) => {
            if (sort === 'artifacts_desc') return b.artifactCounts.total - a.artifactCounts.total;
            return a.artifactCounts.total - b.artifactCounts.total;
        });

        // Paginate manually
        teachersData = mapped.slice(skip, skip + limit);
    } else {
        // Standard DB operations
        const rawTeachers = await prisma.teacher.findMany({
            skip,
            take: limit,
            include: includeConfig,
            orderBy
        });

        teachersData = rawTeachers.map(t => ({
            id: t.id,
            name: t.user.name,
            email: t.user.email,
            avatarUrl: t.user.avatarUrl,
            schoolName: t.school.name,
            createdAt: t.createdAt,
            artifactCounts: {
              lessons: t._count.lessons,
              quizzes: t._count.quizzes,
              assessments: t._count.assessments,
              total: t._count.lessons + t._count.quizzes + t._count.assessments
            }
        }));
    }

    return NextResponse.json({
      success: true,
      data: teachersData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Teachers error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch teachers' }, { status: 500 });
  }
}
