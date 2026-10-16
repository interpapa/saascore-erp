/**
 * Utilidades de Color, Contraste y Temas Públicos para SaaSCore ERP
 */

export interface PublicThemePreset {
  id: string;
  name: string;
  bgColor: string;
  btnColor: string;
}

export const PRESET_PUBLIC_THEMES: PublicThemePreset[] = [
  { id: 'emerald', name: 'Verde Esmeralda', bgColor: '#f8fafc', btnColor: '#064e3b' },
  { id: 'sapphire', name: 'Azul Zafiro', bgColor: '#f8fafc', btnColor: '#1e3a8a' },
  { id: 'purple', name: 'Púrpura Real', bgColor: '#faf5ff', btnColor: '#581c87' },
  { id: 'obsidian', name: 'Obsidiana / Carbón', bgColor: '#f1f5f9', btnColor: '#0f172a' },
  { id: 'wine', name: 'Vino / Borgoña', bgColor: '#fff1f2', btnColor: '#881337' },
  { id: 'amber', name: 'Café & Ámbar', bgColor: '#fdfbf7', btnColor: '#78350f' },
  { id: 'ocean', name: 'Cian Océano', bgColor: '#f0fdfa', btnColor: '#0e7490' },
  { id: 'ruby', name: 'Rosa Rubí', bgColor: '#fff1f2', btnColor: '#be123c' },
];

/**
 * Normaliza cualquier entrada de color hexadecimal a un formato válido de 6 dígitos (#RRGGBB).
 * Si la entrada es inválida (por ejemplo 'fff', 'white', vacía o corrupta), devuelve el fallback sin fallar.
 */
export function normalizeHexColor(input?: string | null, fallback = '#0B3B24'): string {
  if (!input) return fallback;
  let val = String(input).trim();
  
  if (!val.startsWith('#')) {
    val = '#' + val;
  }
  
  // Soporta notación de 3 dígitos #RGB -> #RRGGBB
  if (/^#[0-9A-Fa-f]{3}$/.test(val)) {
    val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
  }
  
  if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
    return val.toLowerCase();
  }
  
  return fallback;
}

/**
 * Calcula la luminancia relativa según la fórmula estándar WCAG 2.1
 * Retorna un valor entre 0 (negro absoluto) y 1 (blanco absoluto).
 */
export function getLuminance(hex: string): number {
  const clean = normalizeHexColor(hex, '#000000').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  
  const a = [r, g, b].map(v => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determina automáticamente si un color de texto contrastante debe ser oscuro o claro.
 * Si el fondo es claro (> 0.52 luminancia), retorna texto oscuro (#0f172a).
 * Si el fondo es oscuro (<= 0.52 luminancia), retorna texto blanco (#ffffff).
 */
export function getContrastTextColor(hex: string, darkColor = '#0f172a', lightColor = '#ffffff'): string {
  return getLuminance(hex) > 0.52 ? darkColor : lightColor;
}
