import { NextRequest, NextResponse } from 'next/server';
import { getBookedTimesAction } from '@/app/actions/booking';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId') || '';
    const employeeId = searchParams.get('employeeId') || 'any';
    const date = searchParams.get('date') || '';
    const timezoneOffset = searchParams.get('timezoneOffset') || '-04:00';
    const serviceName = searchParams.get('serviceName') || undefined;

    if (!tenantId || !date) {
      return NextResponse.json({ 
        success: false, 
        bookedTimes: [], 
        groupSlots: {}, 
        error: 'Parámetros obligatorios faltantes (tenantId y date)' 
      }, { status: 400 });
    }

    const result = await getBookedTimesAction(
      tenantId, 
      employeeId, 
      date, 
      timezoneOffset, 
      serviceName
    );

    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('[API /api/booking/times GET Error]:', err);
    return NextResponse.json({
      success: false,
      bookedTimes: [],
      groupSlots: {},
      error: err?.message || 'Error al obtener horarios ocupados'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, employeeId, date, timezoneOffset, serviceName } = body || {};

    if (!tenantId || !date) {
      return NextResponse.json({ 
        success: false, 
        bookedTimes: [], 
        groupSlots: {}, 
        error: 'Parámetros obligatorios faltantes (tenantId y date)' 
      }, { status: 400 });
    }

    const result = await getBookedTimesAction(
      tenantId, 
      employeeId || 'any', 
      date, 
      timezoneOffset, 
      serviceName
    );

    return NextResponse.json(result, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (err: any) {
    console.error('[API /api/booking/times POST Error]:', err);
    return NextResponse.json({
      success: false,
      bookedTimes: [],
      groupSlots: {},
      error: err?.message || 'Error al obtener horarios ocupados'
    }, { status: 500 });
  }
}
