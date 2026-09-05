/**
 * Rendo - Gestor de Webhooks de Salida & API Keys (Developer Portal)
 * 
 * Emite notificaciones HTTP POST transaccionales hacia endpoints externos configurados
 * por el cliente (Zapier, Make, n8n, e-commerce) ante eventos del sistema.
 */

export interface WebhookSubscription {
  id: string;
  tenantId: string;
  targetUrl: string;
  events: string[]; // ej. ['sale.completed', 'invoice.created']
  secretKey: string;
  isActive: boolean;
}

const subscriptions: WebhookSubscription[] = [];

/**
 * Registra un webhook de salida para un tenant.
 */
export function registerWebhook(
  tenantId: string,
  targetUrl: string,
  events: string[]
): WebhookSubscription {
  const sub: WebhookSubscription = {
    id: `wh_${crypto.randomUUID().replace(/-/g, '')}`,
    tenantId,
    targetUrl,
    events,
    secretKey: `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
    isActive: true,
  };
  subscriptions.push(sub);
  return sub;
}

/**
 * Despacha una notificación HTTP POST asíncrona no bloqueante hacia la URL del cliente.
 */
export async function dispatchOutboundWebhook(
  eventName: string,
  tenantId: string,
  payload: Record<string, unknown>
): Promise<{ dispatchedCount: number }> {
  const activeSubs = subscriptions.filter(
    s => s.tenantId === tenantId && s.isActive && s.events.includes(eventName)
  );

  let dispatchedCount = 0;

  for (const sub of activeSubs) {
    try {
      fetch(sub.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rendo-Signature': sub.secretKey,
          'X-Rendo-Event': eventName,
        },
        body: JSON.stringify({
          event: eventName,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      }).catch((err) => console.warn(`[OutboundWebhook] Error enviando a ${sub.targetUrl}:`, (err as Error).message));

      dispatchedCount++;
    } catch (err: unknown) {
      console.error(`[OutboundWebhook Exception] URL ${sub.targetUrl}:`, (err as Error).message);
    }
  }

  return { dispatchedCount };
}
