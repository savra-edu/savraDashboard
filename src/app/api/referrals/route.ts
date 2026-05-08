import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const referrals = await (prisma as any).referral.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        _count: {
          select: {
            usersReferred: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: referrals.map((r: any) => ({
        ...r,
        useCount: r._count?.usersReferred || 0
      }))
    });
  } catch (error) {
    console.error('Failed to fetch referrals:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch referrals' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json({ success: false, error: 'User ID and code are required' }, { status: 400 });
    }

    const referral = await (prisma as any).referral.create({
      data: {
        userId,
        code,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: referral });
  } catch (error: any) {
    console.error('Failed to create referral:', error);
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Referral code already exists or user already has a referral code' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create referral' }, { status: 500 });
  }
}
