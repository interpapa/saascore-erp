/**
 * calendarDateUtils.ts
 * Utilidades seguras de fecha y hora para citas y agenda médica / ERP.
 * 
 * Evita discrepancias de zona horaria (UTC vs Local) y valida jornadas laborales de médicos/colaboradores.
 */

import { WorkingHours } from '@/components/equipo/EmployeeScheduleEditor';

export const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
] as const;

export const DAY_LABELS_ES: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

/**
 * Formatea una fecha ISO a la hora local HH:mm (ej. "10:00")
 * Previene el error común de `slice(11, 16)` que extrae la hora UTC sin convertir a hora local.
 */
export function formatAppointmentTime(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
    }
  } catch {}
  return String(isoString).slice(11, 16);
}

/**
 * Formatea una fecha ISO a formato 12 horas (ej. "10:00 AM" / "03:00 PM")
 */
export function formatAppointmentTime12h(isoString?: string | null): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('es-VE', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    }
  } catch {}
  return String(isoString).slice(11, 16);
}

/**
 * Convierte un objeto Date a formato local YYYY-MM-DD
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Obtiene la clave del día ('monday', 'tuesday', ...) a partir de una fecha YYYY-MM-DD o Date
 */
export function getDayKeyFromDate(dateInput: string | Date): string {
  let d: Date;
  if (typeof dateInput === 'string') {
    // Si es YYYY-MM-DD, parsear con componentes locales para evitar salto por timezone
    const parts = dateInput.split('T')[0].split('-').map(Number);
    if (parts.length === 3) {
      d = new Date(parts[0], parts[1] - 1, parts[2]);
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }
  const dayIdx = d.getDay();
  return DAY_KEYS[dayIdx] || 'monday';
}

const parseTimeToMinutes = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export interface WorkingHoursValidationResult {
  isWithinHours: boolean;
  dayKey: string;
  dayLabel: string;
  hasScheduleConfigured: boolean;
  summary: string;
  error?: string;
}

/**
 * Valida si un horario solicitado (dateStr + timeStr) está dentro de la jornada laboral del médico.
 */
export function isTimeWithinWorkingHours(
  dateStr: string,
  timeStr: string,
  durationMinutes: number = 30,
  workingHours?: WorkingHours | null
): WorkingHoursValidationResult {
  const dayKey = getDayKeyFromDate(dateStr);
  const dayLabel = DAY_LABELS_ES[dayKey] || dayKey;

  // Si el médico no tiene horarios configurados en su metadata, se asume sin restricción
  if (!workingHours || typeof workingHours !== 'object') {
    return {
      isWithinHours: true,
      dayKey,
      dayLabel,
      hasScheduleConfigured: false,
      summary: 'Sin restricción horaria específica'
    };
  }

  // Verificar si hay algún día con configuración en workingHours
  const hasConfiguredDays = Object.values(workingHours).some(
    v => Array.isArray(v) && v.length > 0
  );

  if (!hasConfiguredDays) {
    return {
      isWithinHours: true,
      dayKey,
      dayLabel,
      hasScheduleConfigured: false,
      summary: 'Sin restricción horaria específica'
    };
  }

  const intervals = workingHours[dayKey];
  // Si el médico tiene horarios configurados pero este día no tiene intervalos o está vacío:
  if (!intervals || !Array.isArray(intervals) || intervals.length === 0) {
    return {
      isWithinHours: false,
      dayKey,
      dayLabel,
      hasScheduleConfigured: true,
      summary: `No labora los días ${dayLabel}`,
      error: `El profesional no tiene jornada laboral configurada para los días ${dayLabel}.`
    };
  }

  const reqStartMins = parseTimeToMinutes(timeStr);
  const reqEndMins = reqStartMins + Math.max(5, durationMinutes);

  const summary = intervals
    .map(i => `${i.start} a ${i.end}`)
    .join(', ');

  // Verificar si el turno cabe completamente en alguno de los intervalos del día
  const fitsInInterval = intervals.some(interval => {
    const intStartMins = parseTimeToMinutes(interval.start);
    const intEndMins = parseTimeToMinutes(interval.end);
    return reqStartMins >= intStartMins && reqEndMins <= intEndMins;
  });

  if (fitsInInterval) {
    return {
      isWithinHours: true,
      dayKey,
      dayLabel,
      hasScheduleConfigured: true,
      summary: `${dayLabel}: ${summary}`
    };
  }

  return {
    isWithinHours: false,
    dayKey,
    dayLabel,
    hasScheduleConfigured: true,
    summary: `${dayLabel}: ${summary}`,
    error: `El horario (${timeStr} - ${Math.floor(reqEndMins/60).toString().padStart(2, '0')}:${(reqEndMins%60).toString().padStart(2, '0')}) está fuera de la jornada del profesional para los ${dayLabel} (${summary}).`
  };
}
