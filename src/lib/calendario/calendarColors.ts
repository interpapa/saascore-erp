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

/**
 * Determina el estado visual cromático de una cita, priorizando el estado de cobro
 * para que citas con "pago pendiente" se muestren en AMARILLO brillante y las pagadas en VERDE.
 */
export function getAppointmentVisualStatus(
  status: string,
  metadata?: Record<string, any> | null
) {
  const paymentStatus = metadata?.payment_status;

  // 1. Pago Pendiente -> AMARILLO / ÁMBAR
  if (paymentStatus === 'pending') {
    return {
      isPendingPayment: true,
      isPaid: false,
      label: 'Pago Pendiente',
      bg: 'bg-amber-500/15 text-amber-900 dark:text-amber-200 border-amber-500/40',
      dot: 'bg-amber-500',
      tagBg: 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40',
      color: '#f59e0b',
    };
  }

  // 2. Pagado -> VERDE / ESMERALDA
  if (paymentStatus === 'paid') {
    return {
      isPendingPayment: false,
      isPaid: true,
      label: 'Pagado',
      bg: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/40',
      dot: 'bg-emerald-500',
      tagBg: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40',
      color: '#10b981',
    };
  }

  // 3. Fallback a los estados regulares de agendamiento
  switch (status) {
    case 'in_progress':
      return {
        isPendingPayment: false,
        isPaid: false,
        label: 'En Curso',
        bg: 'bg-teal-500/15 text-teal-900 dark:text-teal-200 border-teal-500/30',
        dot: 'bg-teal-500',
        tagBg: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
        color: '#14b8a6',
      };
    case 'confirmed':
      return {
        isPendingPayment: false,
        isPaid: false,
        label: 'Confirmada',
        bg: 'bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 border-indigo-500/30',
        dot: 'bg-indigo-500',
        tagBg: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        color: '#6366f1',
      };
    case 'completed':
      return {
        isPendingPayment: false,
        isPaid: true,
        label: 'Completada',
        bg: 'bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border-emerald-500/30',
        dot: 'bg-emerald-500',
        tagBg: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        color: '#10b981',
      };
    case 'cancelled':
      return {
        isPendingPayment: false,
        isPaid: false,
        label: 'Cancelada',
        bg: 'bg-rose-500/15 text-rose-900 dark:text-rose-200 border-rose-500/30',
        dot: 'bg-rose-500',
        tagBg: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
        color: '#f43f5e',
      };
    case 'no_show':
      return {
        isPendingPayment: false,
        isPaid: false,
        label: 'No Asistió',
        bg: 'bg-slate-500/15 text-slate-800 dark:text-slate-300 border-slate-500/30',
        dot: 'bg-slate-400',
        tagBg: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
        color: '#64748b',
      };
    case 'scheduled':
    default:
      return {
        isPendingPayment: false,
        isPaid: false,
        label: 'Programada',
        bg: 'bg-blue-500/15 text-blue-900 dark:text-blue-200 border-blue-500/30',
        dot: 'bg-blue-500',
        tagBg: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
        color: '#3b82f6',
      };
  }
}

