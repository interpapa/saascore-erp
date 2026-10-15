/**
 * SaaSCore ERP - Paleta Cromática Protegida para la Agenda de Citas
 * 
 * Contiene 20 colores seleccionados para identificar agendas, profesionales y servicios
 * diseñados específicamente para NUNCA confundirse con los colores de estados y acciones:
 * - Verde Esmeralda (#10b981): Pago completado / Cita finalizada
 * - Rojo / Rosa (#f43f5e): Cita cancelada / Bloqueo
 * - Ámbar (#f59e0b): Pendiente de atención / En espera
 * - Teal (#14b8a6): En consulta activa
 * - Gris (#64748b): No asistió
 */

export interface AgendaColor {
  id: string;
  name: string;
  hex: string;
  borderClass: string;
  bgLightClass: string;
}

export const AGENDA_20_COLORS: AgendaColor[] = [
  { id: 'c_indigo', name: 'Índigo Imperial', hex: '#6366f1', borderClass: 'border-indigo-500', bgLightClass: 'bg-indigo-500/10' },
  { id: 'c_violet', name: 'Violeta Real', hex: '#8b5cf6', borderClass: 'border-violet-500', bgLightClass: 'bg-violet-500/10' },
  { id: 'c_purple', name: 'Púrpura Orquídea', hex: '#a855f7', borderClass: 'border-purple-500', bgLightClass: 'bg-purple-500/10' },
  { id: 'c_magenta', name: 'Fucsia Magenta', hex: '#d946ef', borderClass: 'border-fuchsia-500', bgLightClass: 'bg-fuchsia-500/10' },
  { id: 'c_berry', name: 'Frambuesa Intensa', hex: '#be185d', borderClass: 'border-pink-600', bgLightClass: 'bg-pink-600/10' },
  { id: 'c_wine', name: 'Vino Tinto / Borgoña', hex: '#9f1239', borderClass: 'border-rose-700', bgLightClass: 'bg-rose-700/10' },
  { id: 'c_sapphire', name: 'Azul Zafiro', hex: '#2563eb', borderClass: 'border-blue-600', bgLightClass: 'bg-blue-600/10' },
  { id: 'c_cobalt', name: 'Azul Cobalto', hex: '#1d4ed8', borderClass: 'border-blue-700', bgLightClass: 'bg-blue-700/10' },
  { id: 'c_navy', name: 'Azul Marino Profundo', hex: '#1e3a8a', borderClass: 'border-blue-900', bgLightClass: 'bg-blue-900/10' },
  { id: 'c_denim', name: 'Azul Denim', hex: '#4338ca', borderClass: 'border-indigo-700', bgLightClass: 'bg-indigo-700/10' },
  { id: 'c_sky', name: 'Celeste / Sky', hex: '#0284c7', borderClass: 'border-sky-600', bgLightClass: 'bg-sky-600/10' },
  { id: 'c_ocean', name: 'Cian Océano', hex: '#0891b2', borderClass: 'border-cyan-600', bgLightClass: 'bg-cyan-600/10' },
  { id: 'c_terracotta', name: 'Terracota Cálido', hex: '#c2410c', borderClass: 'border-orange-700', bgLightClass: 'bg-orange-700/10' },
  { id: 'c_cinnamon', name: 'Canela Tostada', hex: '#b45309', borderClass: 'border-amber-700', bgLightClass: 'bg-amber-700/10' },
  { id: 'c_moka', name: 'Café Moca', hex: '#78350f', borderClass: 'border-amber-900', bgLightClass: 'bg-amber-900/10' },
  { id: 'c_sienna', name: 'Siena Oscuro', hex: '#854d0e', borderClass: 'border-yellow-800', bgLightClass: 'bg-yellow-800/10' },
  { id: 'c_graphite', name: 'Grafito Neutro', hex: '#475569', borderClass: 'border-slate-600', bgLightClass: 'bg-slate-600/10' },
  { id: 'c_carbon', name: 'Carbón Suave', hex: '#334155', borderClass: 'border-slate-700', bgLightClass: 'bg-slate-700/10' },
  { id: 'c_lavender', name: 'Lavanda Profunda', hex: '#7c3aed', borderClass: 'border-violet-600', bgLightClass: 'bg-violet-600/10' },
  { id: 'c_plum', name: 'Ciruela Oscuro', hex: '#6b21a8', borderClass: 'border-purple-800', bgLightClass: 'bg-purple-800/10' },
];

export const DEFAULT_AGENDA_COLOR = AGENDA_20_COLORS[0].hex; // #6366f1 (Índigo)

/**
 * Valida si un color personalizado no colisiona con los estados reservados
 */
export function isProtectedAgendaColor(hex: string): boolean {
  return AGENDA_20_COLORS.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}
