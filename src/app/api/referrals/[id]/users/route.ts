import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const referredUsers = await (prisma as any).user.findMany({
      where: {
        referredById: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: referredUsers,
    });
  } catch (error) {
    console.error('Failed to fetch referred users:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch referred users' }, { status: 500 });
  }
}
