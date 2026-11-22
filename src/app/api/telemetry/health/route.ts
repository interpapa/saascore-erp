import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getRuntimeTelemetryMetrics, measureTelemetry } from '@/lib/core/performanceTelemetry';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pingOnly = searchParams.get('pingOnly') === 'true';

  const startDb = performance.now();
  let dbConnected = false;
  let dbLatencyMs = 0;
  let dbError: string | undefined;

  try {
    // Ping ligero a Supabase comprobando conectividad
    const { error } = await supabaseAdmin.from('tenants').select('id').limit(1);
    dbLatencyMs = Math.round((performance.now() - startDb) * 100) / 100;
    if (error) {
      dbError = error.message;
    } else {
      dbConnected = true;
    }
  } catch (err: unknown) {
    dbLatencyMs = Math.round((performance.now() - startDb) * 100) / 100;
    dbError = err instanceof Error ? err.message : String(err);
  }

  if (pingOnly) {
    return NextResponse.json({
      status: dbConnected ? 'ok' : 'error',
      dbLatencyMs,
      timestamp: new Date().toISOString(),
    }, { status: dbConnected ? 200 : 503 });
  }

  const memory = process.memoryUsage();
  const memoryMb = {
    rss: Math.round((memory.rss / (1024 * 1024)) * 10) / 10,
    heapUsed: Math.round((memory.heapUsed / (1024 * 1024)) * 10) / 10,
    heapTotal: Math.round((memory.heapTotal / (1024 * 1024)) * 10) / 10,
  };

  const telemetryMetrics = getRuntimeTelemetryMetrics();

  let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (!dbConnected) {
    healthStatus = 'unhealthy';
  } else if (dbLatencyMs > 1200 || telemetryMetrics.successRate < 90) {
    healthStatus = 'degraded';
  }

  return NextResponse.json({
    status: healthStatus,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      connected: dbConnected,
      latencyMs: dbLatencyMs,
      error: dbError,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memoryMb,
    },
    apm: telemetryMetrics,
  }, {
    status: healthStatus === 'unhealthy' ? 503 : 200,
  });
}
