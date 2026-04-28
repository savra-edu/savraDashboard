import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email parameter is required' }, { status: 400 });
    }

    // 1. Fetch user & subscription data
    const users: any[] = await prisma.$queryRaw`
      SELECT id, email, name, plan, plan_billing_cycle as "planBillingCycle", activated_on as "activatedOn"
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

    if (!users || users.length === 0) {
      return NextResponse.json({ success: false, error: 'Instructor not found with that email address.' }, { status: 404 });
    }

    const user = users[0];

    // 2. Fetch corresponding teacher details
    const teachers: any[] = await prisma.$queryRaw`
      SELECT t.id, t.created_at as "createdAt", s.name as "schoolName"
      FROM teachers t
      LEFT JOIN schools s ON t.school_id = s.id
      WHERE t.user_id = ${user.id}
      LIMIT 1
    `;

    if (!teachers || teachers.length === 0) {
      // User exists but has no Teacher profile
      return NextResponse.json({
        success: true,
        data: {
          user,
          teacher: null,
          subscription: {
            plan: user.plan || 'free',
            billingCycle: user.planBillingCycle || 'monthly',
            activatedOn: user.activatedOn,
            endsAt: null
          }
        }
      });
    }

    const teacher = teachers[0];

    // 2.5 Fetch grades
    const rawGrades: any = await prisma.$queryRaw`
      SELECT DISTINCT c.grade 
      FROM teacher_classes tc
      JOIN classes c ON tc.class_id = c.id
      WHERE tc.teacher_id = ${teacher.id}
    `;
    const grades = rawGrades.map((g: any) => g.grade).filter(Boolean).join(', ') || 'N/A';

    // Calculate subscription endsAt
    let endsAt = null;
    if (user.activatedOn && user.plan && user.plan !== 'free') {
      const startDate = new Date(user.activatedOn);
      if (user.planBillingCycle === 'annual') {
        endsAt = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
      } else {
        endsAt = new Date(startDate.setMonth(startDate.getMonth() + 1));
      }
    }

    // 3. Retrieve raw artifact breakdown
    const [
      worksheets,
      questionPapers,
      quizzes,
      lessons,
      presentations
    ] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) as count FROM assessments WHERE teacher_id = ${teacher.id} AND is_worksheet = true`,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) as count FROM assessments WHERE teacher_id = ${teacher.id} AND is_worksheet = false`,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) as count FROM quizzes WHERE teacher_id = ${teacher.id}`,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) as count FROM lessons WHERE teacher_id = ${teacher.id}`,
      prisma.$queryRaw<Array<{ count: bigint | number }>>`SELECT COUNT(*) as count FROM presentations WHERE teacher_id = ${teacher.id}`
    ]);

    return NextResponse.json({
      success: true,
      data: {
        user,
        teacher: {
          id: teacher.id,
          createdAt: teacher.createdAt,
          schoolName: teacher.schoolName || 'Unknown',
          grade: grades
        },
        subscription: {
          plan: user.plan || 'free',
          billingCycle: user.planBillingCycle || 'monthly',
          activatedOn: user.activatedOn,
          endsAt: endsAt ? endsAt.toISOString() : null
        },
        usageBreakdown: {
          worksheets: Number(worksheets?.[0]?.count ?? 0),
          questionPapers: Number(questionPapers?.[0]?.count ?? 0),
          quizzes: Number(quizzes?.[0]?.count ?? 0),
          lessons: Number(lessons?.[0]?.count ?? 0),
          presentations: Number(presentations?.[0]?.count ?? 0),
          total: Number(worksheets?.[0]?.count ?? 0) + 
                 Number(questionPapers?.[0]?.count ?? 0) + 
                 Number(quizzes?.[0]?.count ?? 0) + 
                 Number(lessons?.[0]?.count ?? 0) + 
                 Number(presentations?.[0]?.count ?? 0)
        }
      }
    });

  } catch (error: any) {
    console.error('Deep dive query failed:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
