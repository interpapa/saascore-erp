/**
 * Motor de Telemetría y Rendimiento APM — Rendo ERP
 * 
 * Especializado para el Squad SRE & Performance.
 * Monitorea latencia, cold-starts, cuellos de botella de PostgreSQL/Supabase
 * y fallos en Server Actions sin interrumpir el flujo del usuario.
 */

export type LatencyTier = 'FAST' | 'NORMAL' | 'SLOW' | 'CRITICAL_SLOW';

export interface TelemetrySpan {
  actionName: string;
  tenantId?: string;
  actorEmail?: string;
  startedAt: string;
  endedAt?: string;
  durationMs: number;
  latencyTier: LatencyTier;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export interface TelemetryMetricsSummary {
  totalActions: number;
  successRate: number;
  avgDurationMs: number;
  p95DurationMs: number;
  slowActionsCount: number;
  recentSpans: TelemetrySpan[];
}

// Buffer circular en memoria para métricas locales del runtime Next.js
const RECENT_SPANS_BUFFER_LIMIT = 100;
const memorySpansBuffer: TelemetrySpan[] = [];

function determineLatencyTier(durationMs: number): LatencyTier {
  if (durationMs < 200) return 'FAST';
  if (durationMs < 800) return 'NORMAL';
  if (durationMs < 2500) return 'SLOW';
  return 'CRITICAL_SLOW';
}

function recordSpanInMemory(span: TelemetrySpan) {
  memorySpansBuffer.push(span);
  if (memorySpansBuffer.length > RECENT_SPANS_BUFFER_LIMIT) {
    memorySpansBuffer.shift();
  }
}

/**
 * Envoltorio de Telemetría APM para Server Actions y Consultas Críticas.
 * 
 * Uso:
 * const result = await measureTelemetry('createBooking', tenantId, async () => {
 *   return await doDatabaseOperation();
 * }, { actorEmail: 'admin@rendo.com' });
 */
export async function measureTelemetry<T>(
  actionName: string,
  tenantId: string | undefined,
  operation: () => Promise<T>,
  options?: {
    actorEmail?: string;
    metadata?: Record<string, unknown>;
    silent?: boolean;
  }
): Promise<T> {
  const start = performance.now();
  const startedAt = new Date().toISOString();
  let success = true;
  let errorCode: string | undefined;
  let errorMessage: string | undefined;

  try {
    const result = await operation();
    return result;
  } catch (err: unknown) {
    success = false;
    if (err instanceof Error) {
      errorMessage = err.message;
      errorCode = (err as { code?: string }).code || 'UNHANDLED_EXCEPTION';
    } else {
      errorMessage = String(err);
      errorCode = 'UNKNOWN_EXCEPTION';
    }
    throw err;
  } finally {
    const end = performance.now();
    const durationMs = Math.round((end - start) * 100) / 100;
    const latencyTier = determineLatencyTier(durationMs);

    const span: TelemetrySpan = {
      actionName,
      tenantId: tenantId || 'anonymous-or-public',
      actorEmail: options?.actorEmail,
      startedAt,
      endedAt: new Date().toISOString(),
      durationMs,
      latencyTier,
      success,
      errorCode,
      errorMessage,
      metadata: options?.metadata,
    };

    recordSpanInMemory(span);

    if (!options?.silent) {
      const icon = !success ? '❌' : latencyTier === 'CRITICAL_SLOW' ? '🚨' : latencyTier === 'SLOW' ? '⚠️' : '⚡';
      const logMsg = `[RENDO APM] ${icon} [${span.latencyTier}] ${span.actionName} - ${durationMs}ms | Tenant: ${span.tenantId} | Success: ${success}${errorCode ? ` | Code: ${errorCode}` : ''}`;
      
      if (!success) {
        console.error(logMsg, errorMessage);
      } else if (latencyTier === 'CRITICAL_SLOW' || latencyTier === 'SLOW') {
        console.warn(logMsg);
      } else {
        console.log(logMsg);
      }
    }
  }
}

/**
 * Obtiene métricas agregadas del runtime actual para monitoreo y health checks.
 */
export function getRuntimeTelemetryMetrics(): TelemetryMetricsSummary {
  const totalActions = memorySpansBuffer.length;
  if (totalActions === 0) {
    return {
      totalActions: 0,
      successRate: 100,
      avgDurationMs: 0,
      p95DurationMs: 0,
      slowActionsCount: 0,
      recentSpans: [],
    };
  }

  const successCount = memorySpansBuffer.filter((s) => s.success).length;
  const durations = memorySpansBuffer.map((s) => s.durationMs).sort((a, b) => a - b);
  const totalDuration = durations.reduce((acc, d) => acc + d, 0);
  const avgDurationMs = Math.round((totalDuration / totalActions) * 100) / 100;

  const p95Index = Math.min(Math.floor(totalActions * 0.95), totalActions - 1);
  const p95DurationMs = durations[p95Index] || 0;

  const slowActionsCount = memorySpansBuffer.filter(
    (s) => s.latencyTier === 'SLOW' || s.latencyTier === 'CRITICAL_SLOW'
  ).length;

  return {
    totalActions,
    successRate: Math.round((successCount / totalActions) * 1000) / 10,
    avgDurationMs,
    p95DurationMs,
    slowActionsCount,
    recentSpans: [...memorySpansBuffer].reverse().slice(0, 20),
  };
}
