import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CALLING_STATUSES = [
  'DNP',
  'CALL_LATER',
  'WRONG_NUMBER',
  'INTERESTED',
  'NOT_INTERESTED',
  'CONVERTED',
  'IRRELEVANT',
] as const;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'joined_desc';
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    let orderBy: any = undefined;
    if (sort === 'name_asc') orderBy = { user: { name: 'asc' } };
    else if (sort === 'name_desc') orderBy = { user: { name: 'desc' } };
    else if (sort === 'joined_asc') orderBy = { createdAt: 'asc' };
    else if (sort === 'joined_desc') orderBy = { createdAt: 'desc' };

    const where: any = {};
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const dateParam = searchParams.get('date');
    if (dateParam) {
      const startOfDay = new Date(dateParam);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateParam);
      endOfDay.setHours(23, 59, 59, 999);
      
      where.createdAt = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    const callingStatusParam = searchParams.get('callingStatus')?.trim() || '';
    let teacherIdAllowList: string[] | null = null;

    if (callingStatusParam === '_none') {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT t.id::text AS id
        FROM teachers t
        JOIN users u ON u.id = t.user_id
        LEFT JOIN conversion_feedback cf ON cf.user_id = u.id
        WHERE cf.id IS NULL
           OR trim(cf.feedback) = ''
           OR trim(substring(cf.feedback FROM '"status"[[:space:]]*:[[:space:]]*"([^"]*)"')) IS NULL
           OR trim(substring(cf.feedback FROM '"status"[[:space:]]*:[[:space:]]*"([^"]*)"')) = ''
      `;
      teacherIdAllowList = rows.map((r) => r.id);
    } else if (CALLING_STATUSES.includes(callingStatusParam as (typeof CALLING_STATUSES)[number])) {
      const rows = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT t.id::text AS id
        FROM teachers t
        JOIN users u ON u.id = t.user_id
        JOIN conversion_feedback cf ON cf.user_id = u.id
        WHERE trim(substring(cf.feedback FROM '"status"[[:space:]]*:[[:space:]]*"([^"]*)"')) = ${callingStatusParam}
      `;
      teacherIdAllowList = rows.map((r) => r.id);
    }

    if (callingStatusParam && teacherIdAllowList !== null && teacherIdAllowList.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    }

    const whereWithStatus: Record<string, unknown> = { ...where };
    if (teacherIdAllowList !== null && teacherIdAllowList.length > 0) {
      Object.assign(whereWithStatus, { id: { in: teacherIdAllowList } });
    }

    const includeConfig = {
      user: { 
        select: { 
          id: true,
          name: true, 
          email: true, 
          avatarUrl: true,
          conversionFeedback: {
            select: {
              feedback: true
            }
          }
        } 
      },
      school: { select: { name: true } },
      _count: { select: { lessons: true, quizzes: true, assessments: true } }
    };

    const total = await prisma.teacher.count({ where: whereWithStatus });
    let rawTeachers = [];

    if (sort === 'artifacts_desc' || sort === 'artifacts_asc') {
        rawTeachers = await prisma.teacher.findMany({ where: whereWithStatus, include: includeConfig });
        rawTeachers.sort((a, b) => {
            const totalA = a._count.lessons + a._count.quizzes + a._count.assessments;
            const totalB = b._count.lessons + b._count.quizzes + b._count.assessments;
            return sort === 'artifacts_desc' ? totalB - totalA : totalA - totalB;
        });
        rawTeachers = rawTeachers.slice(skip, skip + limit);
    } else {
        rawTeachers = await prisma.teacher.findMany({
            where: whereWithStatus,
            skip,
            take: limit,
            include: includeConfig,
            orderBy
        });
    }

    const teachersData = await Promise.all(rawTeachers.map(async (t) => {
        // Fetch raw data to ensure we get 'phone' and other potentially unmapped fields
        const rawTeacher: any = await prisma.$queryRaw`SELECT phone FROM teachers WHERE id = ${t.id} LIMIT 1`;
        const phone = rawTeacher?.[0]?.phone || null;

        // Fetch grades from teacher_classes
        const rawGrades: any = await prisma.$queryRaw`
            SELECT DISTINCT c.grade 
            FROM teacher_classes tc
            JOIN classes c ON tc.class_id = c.id
            WHERE tc.teacher_id = ${t.id}
        `;
        const grades = rawGrades.map((g: any) => g.grade).filter(Boolean).join(', ') || 'N/A';

        const rawSubjects: any = await prisma.$queryRaw`
            SELECT DISTINCT s.name
            FROM teacher_subjects ts
            JOIN subjects s ON ts.subject_id = s.id
            WHERE ts.teacher_id = ${t.id}
        `;
        const subjects =
          rawSubjects.map((row: any) => row.name).filter(Boolean).join(', ') || 'N/A';

        const [lastLesson, lastQuiz, lastAssessment] = await Promise.all([
            prisma.lesson.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
            prisma.quiz.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
            prisma.assessment.findFirst({ where: { teacherId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
        ]);

        const dates = [lastLesson?.createdAt, lastQuiz?.createdAt, lastAssessment?.createdAt].filter(Boolean) as Date[];
        let lastActiveAt = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null;

        // Fallback to creation date if no activity found
        if (!lastActiveAt) {
            lastActiveAt = new Date(t.createdAt);
        }

        let callingStatus = '';
        let callingReason = '';
        let callingNotes = '';
        let rawFeedback = t.user.conversionFeedback?.feedback || '';

        if (rawFeedback) {
            try {
                const parsed = JSON.parse(rawFeedback);
                callingStatus = parsed.status || '';
                callingReason = parsed.reason || '';
                callingNotes = parsed.notes || '';
            } catch (e) {
                callingNotes = rawFeedback;
            }
        }

        return {
            id: t.id,
            userId: t.user.id,
            name: t.user.name,
            email: t.user.email,
            phoneNumber: phone,
            grade: grades,
            subjects,
            avatarUrl: t.user.avatarUrl,
            schoolName: t.school.name,
            createdAt: t.createdAt,
            lastActiveAt,
            callingStatus,
            callingReason,
            callingNotes,
            rawFeedback,
            artifactCounts: {
                lessons: t._count.lessons,
                quizzes: t._count.quizzes,
                assessments: t._count.assessments,
                total: t._count.lessons + t._count.quizzes + t._count.assessments
            }
        };
    }));

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
