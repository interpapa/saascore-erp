import { NextRequest, NextResponse } from 'next/server';
import { processBookingAction } from '@/app/actions/booking';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await processBookingAction(body);

    if (!result?.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[API /api/booking/process Error]:', err);
    return NextResponse.json({
      success: false,
      error: err?.message || 'Error inesperado procesando la reserva en el endpoint REST',
      debugDetails: {
        timestamp: new Date().toISOString(),
        type: 'api_route_exception',
        message: err?.message,
        stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
      }
    }, { status: 500 });
  }
}
