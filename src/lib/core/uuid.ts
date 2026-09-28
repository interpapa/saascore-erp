/**
 * Rendo ERP / SaaSCore - Central UUID and Temporary ID Guardian
 *
 * Provides strict validation and detection of synthetic/optimistic IDs
 * to prevent PostgreSQL 22P02 errors (invalid input syntax for type uuid)
 * and protect database integrity across all modules.
 */

// PostgreSQL RFC 4122 compliant UUID regex (v1-v5) and general 8-4-4-4-12 hex UUID
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENERAL_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Common prefixes for temporary/synthetic client-side IDs
const TEMPORARY_PREFIXES = [
  'temp_',
  'temp-',
  'tmp_',
  'tmp-',
  'custom-',
  'rec_',
  'acc-',
  'att-',
  'step-',
  'photo_',
  'appt-',
  'held-',
  'generic_',
];

/**
 * Validates whether the given value is a valid PostgreSQL UUID string.
 */
export function isValidUUID(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  return UUID_REGEX.test(trimmed) || GENERAL_UUID_REGEX.test(trimmed);
}

/**
 * Checks whether an ID is a temporary, client-generated or optimistic ID
 * that should not be queried against UUID columns in PostgreSQL.
 */
export function isTemporaryId(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim().toLowerCase();
  return TEMPORARY_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Sanitizes an ID to ensure it can be safely passed to a PostgreSQL UUID column.
 * Returns the valid UUID string, or null if invalid or temporary.
 */
export function sanitizeUUID(id: unknown): string | null {
  if (isValidUUID(id) && !isTemporaryId(id)) {
    return id.trim().toLowerCase();
  }
  return null;
}
