/**
 * SaaSCore ERP - Utilidad Universal de Teléfonos y WhatsApp Multilínea
 * Soporta números individuales y números dobles (ej: "04141234567 / 04127654321", "0414-1111111, 0424-2222222")
 */

export interface ParsedPhones {
  raw: string;
  numbers: string[];
  primary: string;
  secondary?: string;
  hasMultiple: boolean;
  displayFormatted: string;
}

/**
 * Parsea una cadena de teléfono que puede contener uno o varios números
 * separados por '/', ',', ';', ' o ', ' y ', o espacios dobles.
 */
export function parsePhoneNumbers(rawPhone?: string | null, defaultCountry = '58'): ParsedPhones {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { raw: '', numbers: [], primary: '', hasMultiple: false, displayFormatted: '' };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { raw: '', numbers: [], primary: '', hasMultiple: false, displayFormatted: '' };
  }

  // Dividir por separadores habituales: /, ,, ;, o, y
  const tokens = trimmed
    .split(/[\/,;]|\s+o\s+|\s+y\s+/i)
    .map((t) => t.trim())
    .filter(Boolean);

  const cleanNumbers: string[] = [];

  for (const token of tokens) {
    let digits = token.replace(/[^0-9]/g, '');
    if (!digits) continue;

    if (digits.startsWith('0')) {
      digits = defaultCountry + digits.slice(1);
    } else if (
      digits.length === 10 &&
      (digits.startsWith('412') ||
        digits.startsWith('414') ||
        digits.startsWith('424') ||
        digits.startsWith('416') ||
        digits.startsWith('426'))
    ) {
      digits = defaultCountry + digits;
    }

    if (digits.length >= 7) {
      cleanNumbers.push(digits);
    }
  }

  const primary = cleanNumbers[0] || '';
  const secondary = cleanNumbers[1];

  return {
    raw: trimmed,
    numbers: cleanNumbers,
    primary,
    secondary,
    hasMultiple: cleanNumbers.length > 1,
    displayFormatted: tokens.join(' / '),
  };
}

/**
 * Genera el enlace de WhatsApp (wa.me) asegurando que no se concatenen múltiples números
 */
export function getPrimaryWhatsAppUrl(rawPhone?: string | null, message?: string, defaultCountry = '58'): string {
  const parsed = parsePhoneNumbers(rawPhone, defaultCountry);
  const textParam = message ? `?text=${encodeURIComponent(message)}` : '';
  if (!parsed.primary) {
    return `https://wa.me/${textParam}`;
  }
  return `https://wa.me/${parsed.primary}${textParam}`;
}
