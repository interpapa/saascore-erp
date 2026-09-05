/**
 * Rendo - Rate Limiting & Throttling Guard
 * 
 * Protege los Server Actions contra ataques de fuerza bruta, spam y DDoS.
 * Implementa el algoritmo de Token Bucket / Sliding Window en memoria por actor/IP.
 */

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

const LIMITS: Record<string, { maxTokens: number; refillRatePerSec: number }> = {
  checkout: { maxTokens: 10, refillRatePerSec: 1 },    // Máx 10 ventas en ráfaga, recarga 1/seg
  mutation: { maxTokens: 30, refillRatePerSec: 5 },    // Crear/Editar clientes o ítems
  read: { maxTokens: 100, refillRatePerSec: 20 },      // Consultas de catálogo/listas
};

const storage = new Map<string, RateLimitRecord>();

/**
 * Revisa si un actor o IP ha excedido la tasa de peticiones permitidas.
 */
export function checkRateLimit(
  actorKey: string, 
  actionType: 'checkout' | 'mutation' | 'read' = 'mutation'
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const config = LIMITS[actionType] || LIMITS.mutation;
  const key = `${actorKey}:${actionType}`;

  let record = storage.get(key);

  if (!record) {
    record = { tokens: config.maxTokens - 1, lastRefill: now };
    storage.set(key, record);
    return { allowed: true };
  }

  // Rellenar tokens según el tiempo transcurrido
  const elapsedSec = (now - record.lastRefill) / 1000;
  record.tokens = Math.min(config.maxTokens, record.tokens + elapsedSec * config.refillRatePerSec);
  record.lastRefill = now;

  if (record.tokens >= 1) {
    record.tokens -= 1;
    return { allowed: true };
  }

  // Excedido: calcular segundos para reintentar
  const retryAfterSec = Math.ceil((1 - record.tokens) / config.refillRatePerSec);
  console.warn(`[RateLimiter] Rate limit excedido para "${key}". Reintentar en ${retryAfterSec}s.`);

  return { allowed: false, retryAfterSec };
}
