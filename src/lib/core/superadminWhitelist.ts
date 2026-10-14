/**
 * Rendo SuperAdmin Whitelist & Pure Validator
 * 
 * Centralised, zero-dependency helper to verify superadmin emails
 * across client stores, middleware, and server actions.
 */

const DEFAULT_SUPERADMINS = [
  'interpapadavid2811@gmail.com',
  'valerasilvamariajose@gmail.com',
  'admin@rendo.com',
  'rodolfo@rendo.com'
];

const rawSuperAdmins = typeof process !== 'undefined' && process.env?.SUPERADMIN_EMAIL ? process.env.SUPERADMIN_EMAIL : '';

export const SUPERADMIN_EMAILS = Array.from(
  new Set([
    ...DEFAULT_SUPERADMINS,
    ...rawSuperAdmins.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  ])
);

export function isSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return SUPERADMIN_EMAILS.includes(clean);
}
