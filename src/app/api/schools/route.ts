import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { teachers: true }
        }
      },
      orderBy: {
        teachers: {
          _count: 'desc'
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: schools
    });
  } catch (error) {
    console.error('Schools fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch schools' }, { status: 500 });
  }
}
