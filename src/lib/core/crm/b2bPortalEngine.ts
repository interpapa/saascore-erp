/**
 * Rendo - Portal B2B Token Resolver Engine
 * 
 * Genera tokens seguros de autoservicio para que los clientes finales puedan
 * consultar sus estados de cuenta y facturas descargables en `/portal/[token]`.
 */

export interface B2BPortalSession {
  token: string;
  customerId: string;
  tenantId: string;
  expiresAt: string; // ISO String
}

const portalTokens = new Map<string, B2BPortalSession>();

/**
 * Genera un token seguro con expiración de 7 días para acceso al portal B2B.
 */
export function createB2BPortalToken(customerId: string, tenantId: string): string {
  const token = `b2b_${crypto.randomUUID().replace(/-/g, '')}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  portalTokens.set(token, {
    token,
    customerId,
    tenantId,
    expiresAt,
  });

  return token;
}

/**
 * Valida un token del portal B2B y retorna la sesión del cliente si es válido.
 */
export function validateB2BPortalToken(token: string): { valid: boolean; session?: B2BPortalSession; error?: string } {
  const session = portalTokens.get(token);

  if (!session) {
    return { valid: false, error: 'Token de portal B2B no válido o expirado.' };
  }

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    portalTokens.delete(token);
    return { valid: false, error: 'El enlace de autoservicio ha expirado.' };
  }

  return { valid: true, session };
}
