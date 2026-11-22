---
name: apm-telemetry
description: Monitoreo de rendimiento, medición de latencia de conexiones PostgreSQL y Server Actions, health checks, detección de cold-starts y prevención de degradación en Rendo ERP.
---

# ⚡ Skill: Telemetría APM, Métricas de Conexión y Salud de Producción

Esta habilidad estandariza la instrumentación y medición de rendimiento en Rendo ERP, proporcionando herramientas y pautas para diagnosticar latencias, cold-starts y cuellos de botella en la conexión con Supabase/PostgreSQL.

---

## 1. Niveles de Latencia Estandarizados (SLA)

| Nivel | Rango de Duración | Diagnóstico | Acción Requerida |
|---|---|---|---|
| ⚡ **FAST** | < 200 ms | Óptimo. Consulta indexada o en caché. | Ninguna. |
| 🟢 **NORMAL** | 200 ms - 800 ms | Esperado para transacciones atómicas con Supabase. | Monitorear en p95. |
| ⚠️ **SLOW** | 800 ms - 2,500 ms | Degradación. Posible cold-start o query no indexada. | Revisar índices y payload. |
| 🚨 **CRITICAL_SLOW** | > 2,500 ms | Inaceptable. Riesgo de timeout en Vercel/cliente. | Investigar pool exhaustion o bucle de red. |

---

## 2. Herramientas Nucleares de Telemetría

### A. Medición en Server Actions (`measureTelemetry`)
```typescript
import { measureTelemetry } from '@/lib/core/performanceTelemetry';

export async function miAccionCritica(payload: unknown) {
  return await measureTelemetry('miAccionCritica', payload.tenantId, async () => {
    // Código de la acción...
  }, { actorEmail: actor.email });
}
```

### B. Endpoint de Salud y Telemetría (`/api/telemetry/health`)
- **GET `/api/telemetry/health`**: Devuelve estado de conexión a Supabase, latencia en ms, consumo de memoria de Node (`rss`, `heapUsed`), métricas agregadas y p95.
- **GET `/api/telemetry/health?pingOnly=true`**: Liveness probe ultra-rápido para balanceadores o monitores externos.

---

## 3. Protocolo de Diagnóstico de Incidentes de Rendimiento

1. **Verificar Latencia de Base de Datos:**
   - Consultar `/api/telemetry/health` para comprobar el roundtrip real a Supabase.
   - Si la latencia supera 1,000 ms de forma persistente, verificar si el plan de Supabase o la región geográfica está sufriendo degradación.
2. **Detectar Fugas de Memoria o Procesos Zombi:**
   - Inspeccionar el objeto `system.memoryMb`. Si `heapUsed` supera 500 MB en reposo, rastrear closures o scripts no terminados.
   - Todo script de Node.js en segundo plano debe invocar `process.exit(0)`.
3. **Validación Pre-Despliegue:**
   - Todo cambio debe mantener la compilación limpia (`npm run build`) y las 18 suites de pruebas (`npm run test:runner`) por debajo de 2 segundos.
