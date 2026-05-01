import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, feedback } = body;
    console.log('Upserting feedback for userId:', userId, 'Feedback length:', feedback?.length);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    let conversionFeedback;
    try {
      conversionFeedback = await (prisma as any).conversionFeedback.upsert({
        where: { userId },
        update: { feedback },
        create: {
          userId,
          feedback,
        },
      });
      console.log('Successfully upserted feedback:', conversionFeedback.id);
    } catch (dbError: any) {
      console.error('Database error during upsert:', dbError);
      throw dbError;
    }

    return NextResponse.json({
      success: true,
      data: conversionFeedback
    });

  } catch (error: any) {
    console.error('Failed to save conversion feedback:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
