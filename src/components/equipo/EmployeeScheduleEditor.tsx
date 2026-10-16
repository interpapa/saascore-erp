'use client';

import { useMemo } from 'react';
import { Plus, Trash2, Clock, Sparkles, ArrowRight, CalendarDays, Check } from 'lucide-react';

export type TimeInterval = { start: string; end: string };
export type WorkingHours = Record<string, TimeInterval[]>;

const DAYS = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
];

export const defaultWorkingHours: WorkingHours = {
  monday: [{ start: '09:00', end: '17:00' }],
  tuesday: [{ start: '09:00', end: '17:00' }],
  wednesday: [{ start: '09:00', end: '17:00' }],
  thursday: [{ start: '09:00', end: '17:00' }],
  friday: [{ start: '09:00', end: '17:00' }],
  saturday: [],
  sunday: []
};

const SLOT_PRESETS = [15, 30, 45, 60, 90, 120];

interface EmployeeScheduleEditorProps {
  value: WorkingHours;
  onChange: (newSchedule: WorkingHours) => void;
  slotMinutes?: number;
  onSlotMinutesChange?: (newMinutes: number) => void;
  onGoToServices?: () => void;
}

const parseTimeToMinutes = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export function EmployeeScheduleEditor({ 
  value, 
  onChange,
  slotMinutes = 60,
  onSlotMinutesChange,
  onGoToServices
}: EmployeeScheduleEditorProps) {
  const currentSlotMinutes = Math.max(5, Number(slotMinutes) || 60);

  const handleAddInterval = (day: string) => {
    const current = value[day] || [];
    onChange({
      ...value,
      [day]: [...current, { start: '09:00', end: '17:00' }]
    });
  };

  const handleRemoveInterval = (day: string, index: number) => {
    const current = [...(value[day] || [])];
    current.splice(index, 1);
    onChange({
      ...value,
      [day]: current
    });
  };

  const handleUpdateInterval = (day: string, index: number, field: 'start' | 'end', time: string) => {
    const current = [...(value[day] || [])];
    current[index] = { ...current[index], [field]: time };
    onChange({
      ...value,
      [day]: current
    });
  };

  const toggleDay = (day: string, active: boolean) => {
    onChange({
      ...value,
      [day]: active ? [{ start: '09:00', end: '17:00' }] : []
    });
  };

  // Resumen semanal calculado
  const weeklySummary = useMemo(() => {
    let totalMinutes = 0;
    let totalSlots = 0;
    let activeDaysCount = 0;

    DAYS.forEach((d) => {
      const intervals = value[d.id] || [];
      if (intervals.length > 0) activeDaysCount++;
      intervals.forEach((interval) => {
        const startM = parseTimeToMinutes(interval.start);
        const endM = parseTimeToMinutes(interval.end);
        if (endM > startM) {
          const diff = endM - startM;
          totalMinutes += diff;
          totalSlots += Math.floor(diff / currentSlotMinutes);
        }
      });
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return {
      activeDaysCount,
      totalHoursStr: mins > 0 ? `${hours}h ${mins}m` : `${hours}h`,
      totalSlots,
    };
  }, [value, currentSlotMinutes]);

  return (
    <div className="space-y-4">
      {/* Selector de Bloque General de Atención */}
      <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600 dark:text-indigo-400" />
              Bloque General de Atención (Duración Estándar)
            </h4>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 mt-0.5">
              Define cuánto dura cada turno general. El horario laboral se dividirá en bloques de este tamaño.
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500">Bloque activo:</span>
            <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {currentSlotMinutes} min
            </span>
          </div>
        </div>

        {/* Presets de Duración */}
        {onSlotMinutesChange && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mr-1">Preajustes rápidos:</span>
            {SLOT_PRESETS.map((preset) => {
              const isSelected = currentSlotMinutes === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSlotMinutesChange(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400 ring-offset-1'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  {preset} min {preset === 60 ? '★ Estándar' : ''}
                </button>
              );
            })}
          </div>
        )}

        {/* Banner de Complementariedad con Servicios Particulares */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Sparkles size={16} className="text-amber-500 shrink-0" />
            <span>
              <strong>¿Servicios particulares con otra duración?</strong> (ej: 15 min, 45 min, 90 min). Puedes crearlos en <strong>Funciones & Servicios</strong> sin romper tu horario de trabajo.
            </span>
          </div>
          {onGoToServices && (
            <button
              type="button"
              onClick={onGoToServices}
              className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 shrink-0 uppercase tracking-wider"
            >
              Ver Servicios <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Editor de Días y Franjas Horarias */}
      <div className="border border-border rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/60 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-foreground">
            <CalendarDays size={16} className="text-indigo-500" />
            Jornada Semanal por Días
          </h4>
          <span className="text-[11px] font-bold text-slate-500">
            {weeklySummary.activeDaysCount} días activos · {weeklySummary.totalHoursStr} total · ~{weeklySummary.totalSlots} turnos
          </span>
        </div>

        <div className="space-y-3">
          {DAYS.map((d) => {
            const intervals = value[d.id] || [];
            const isActive = intervals.length > 0;

            return (
              <div 
                key={d.id} 
                className={`flex flex-col sm:flex-row sm:items-start gap-3 p-3 rounded-xl border transition-all ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs' 
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 sm:w-32 pt-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => toggleDay(d.id, e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className={`text-sm font-bold ${isActive ? 'text-foreground' : 'text-slate-400'}`}>
                    {d.label}
                  </span>
                </div>

                <div className="flex-1 space-y-2">
                  {!isActive ? (
                    <span className="text-xs text-slate-400 italic pt-1 inline-block">Día no laborable / Libre</span>
                  ) : (
                    intervals.map((interval, idx) => {
                      const startM = parseTimeToMinutes(interval.start);
                      const endM = parseTimeToMinutes(interval.end);
                      const diffM = Math.max(0, endM - startM);
                      const diffHours = (diffM / 60).toFixed(1).replace('.0', '');
                      const slotCount = Math.floor(diffM / currentSlotMinutes);

                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-border rounded-xl px-2 py-1">
                            <input
                              type="time"
                              value={interval.start}
                              onChange={(e) => handleUpdateInterval(d.id, idx, 'start', e.target.value)}
                              className="bg-transparent border-0 outline-none text-xs text-foreground font-mono font-bold"
                            />
                            <span className="text-xs text-slate-400 font-medium">a</span>
                            <input
                              type="time"
                              value={interval.end}
                              onChange={(e) => handleUpdateInterval(d.id, idx, 'end', e.target.value)}
                              className="bg-transparent border-0 outline-none text-xs text-foreground font-mono font-bold"
                            />
                          </div>

                          {diffM > 0 && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                              <span>⏱️ {diffHours}h</span>
                              <span>•</span>
                              <span>~{slotCount} turnos ({currentSlotMinutes}m)</span>
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveInterval(d.id, idx)}
                            title="Eliminar franja"
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors ml-auto sm:ml-0"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                  
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => handleAddInterval(d.id)}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 mt-1.5"
                    >
                      <Plus size={13} /> Añadir franja intermedia (ej. turno tarde)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
