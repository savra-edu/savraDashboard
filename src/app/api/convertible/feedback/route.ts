import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseAssignedTo } from '@/lib/assigned-to';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, feedback } = body;
    console.log('Upserting feedback for userId:', userId, 'Feedback length:', feedback?.length);

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    const updateData: { feedback: string; assignedTo?: ReturnType<typeof parseAssignedTo> } = {
      feedback: typeof feedback === 'string' ? feedback : '',
    };

    let createAssignedTo = parseAssignedTo(undefined);
    if ('assignedTo' in body && body.assignedTo !== undefined) {
      const a = parseAssignedTo(body.assignedTo);
      updateData.assignedTo = a;
      createAssignedTo = a;
    }

    let conversionFeedback;
    try {
      conversionFeedback = await prisma.conversionFeedback.upsert({
        where: { userId },
        update: updateData,
        create: {
          userId,
          feedback: typeof feedback === 'string' ? feedback : '',
          assignedTo: createAssignedTo,
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
