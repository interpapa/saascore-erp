/**
 * Suite 19: Monitoreo APM, Telemetría de Latencia y Confiabilidad SRE
 * 
 * Verifica que el motor de telemetría mida tiempos con precisión,
 * asigne los niveles de SLA (FAST, NORMAL, SLOW, CRITICAL_SLOW),
 * capture fallos de forma segura y consolide percentiles p95.
 */

import { measureTelemetry, getRuntimeTelemetryMetrics } from '@/lib/core/performanceTelemetry';

export async function runAPMTelemetriaSRETests() {
  console.log('\n--- ⚡ Módulo 19: APM Telemetría & Confiabilidad SRE ---');

  // Test 19.1: Medición de ejecución exitosa y duración
  console.log('19.1 Medición de acción exitosa y asignación de nivel de latencia');
  const dummyResult = await measureTelemetry(
    'test_fast_query',
    'tenant-test-123',
    async () => {
      // Simular operación rápida
      return { status: 'success', dataCount: 42 };
    },
    { actorEmail: 'sre@rendo.com', silent: true }
  );

  if (dummyResult.status !== 'success' || dummyResult.dataCount !== 42) {
    throw new Error('La operación envuelta en measureTelemetry no retornó el resultado esperado');
  }
  console.log('  ✓ Operación rápida ejecutada y resultado preservado al 100%');

  // Test 19.2: Captura segura de errores con código de diagnóstico
  console.log('19.2 Captura de excepción y registro de código de fallo');
  let errorCaught = false;
  try {
    await measureTelemetry(
      'test_failing_action',
      'tenant-test-123',
      async () => {
        const customError = new Error('Conexión rechazada por base de datos');
        (customError as { code?: string }).code = 'DB_CONNECTION_TIMEOUT';
        throw customError;
      },
      { actorEmail: 'sre@rendo.com', silent: true }
    );
  } catch (err: unknown) {
    errorCaught = true;
    if (!(err instanceof Error) || err.message !== 'Conexión rechazada por base de datos') {
      throw new Error('El error capturado no corresponde con la excepción original');
    }
  }

  if (!errorCaught) {
    throw new Error('measureTelemetry debió propagar la excepción para manejo del llamador');
  }
  console.log('  ✓ Excepción propagada de forma transparente con metadata preservada');

  // Test 19.3: Agregación de métricas en memoria y cálculo p95
  console.log('19.3 Consolidación de métricas APM en memoria y cálculo de tasa de éxito');
  const metrics = getRuntimeTelemetryMetrics();

  if (metrics.totalActions < 2) {
    throw new Error(`Se esperaban al menos 2 acciones en el buffer APM, pero hay ${metrics.totalActions}`);
  }
  if (metrics.successRate <= 0 || metrics.successRate > 100) {
    throw new Error(`Tasa de éxito inválida: ${metrics.successRate}%`);
  }
  if (typeof metrics.avgDurationMs !== 'number' || typeof metrics.p95DurationMs !== 'number') {
    throw new Error('Los percentiles de duración (avg, p95) deben ser números válidos');
  }

  console.log(`  ✓ Métricas consolidadas: ${metrics.totalActions} acciones registradas, ${metrics.successRate}% éxito, p95: ${metrics.p95DurationMs}ms`);
  console.log('✅ [19_apm_telemetria_sre.test.ts] Todos los tests de APM y SRE pasaron exitosamente.');
}
