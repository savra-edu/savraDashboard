import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/subscriptions
// Fetches subscribed teachers OR searches users by email
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchEmail = searchParams.get('email');

    if (searchEmail) {
      // Search users by email (for granting subscription)
      const users: any = await prisma.$queryRaw`
        SELECT id, email, name, plan, plan_billing_cycle as "planBillingCycle", activated_on as "activatedOn"
        FROM users
        WHERE email ILIKE ${'%' + searchEmail + '%'}
        LIMIT 10
      `;
      return NextResponse.json({ success: true, data: users });
    }

    // Fetch all teachers with their subscription details
    const teachers: any = await prisma.$queryRaw`
      SELECT 
        t.id as "teacherId",
        u.id as "userId",
        u.name,
        u.email,
        u.plan,
        u.plan_billing_cycle as "planBillingCycle",
        u.activated_on as "activatedOn",
        s.name as "schoolName"
      FROM teachers t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN schools s ON t.school_id = s.id
      ORDER BY u.activated_on DESC NULLS LAST, u.name ASC
    `;

    // Process dates
    const processedTeachers = teachers.map((t: any) => {
      let endsAt = null;
      if (t.activatedOn && t.plan && t.plan !== 'free') {
        const startDate = new Date(t.activatedOn);
        if (t.planBillingCycle === 'annual') {
          endsAt = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
        } else {
          endsAt = new Date(startDate.setMonth(startDate.getMonth() + 1));
        }
      }
      return {
        ...t,
        endsAt: endsAt ? endsAt.toISOString() : null,
      };
    });

    return NextResponse.json({ success: true, data: processedTeachers });

  } catch (error: any) {
    console.error('Failed to fetch subscriptions:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/subscriptions
// Grant or Update subscription
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, plan, billingCycle } = body;

    if (!plan || !['free', 'pro', 'max'].includes(plan)) {
      return NextResponse.json({ success: false, error: 'Invalid plan type' }, { status: 400 });
    }

    if (!billingCycle || !['monthly', 'annual', 'yearly'].includes(billingCycle)) {
      return NextResponse.json({ success: false, error: 'Invalid billing cycle' }, { status: 400 });
    }

    const dbBillingCycle = billingCycle === 'yearly' ? 'annual' : billingCycle;

    let targetUserId = userId;

    if (!targetUserId && email) {
      // Find user by email
      const users: any = await prisma.$queryRaw`
        SELECT id FROM users WHERE email = ${email} LIMIT 1
      `;
      if (!users || users.length === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }
      targetUserId = users[0].id;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'User ID or Email is required' }, { status: 400 });
    }

    // Update user subscription
    const now = new Date();
    await prisma.$queryRaw`
      UPDATE users 
      SET 
        plan = ${plan}::"UserPlan", 
        plan_billing_cycle = ${dbBillingCycle}::"UserPlanBillingCycle", 
        activated_on = ${now},
        updated_at = ${now}
      WHERE id = ${targetUserId}
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      data: {
        userId: targetUserId,
        plan,
        billingCycle: dbBillingCycle,
        activatedOn: now.toISOString()
      }
    });

  } catch (error: any) {
    console.error('Failed to update subscription:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
