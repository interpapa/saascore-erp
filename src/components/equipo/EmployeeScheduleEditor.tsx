'use client';

import { useState } from 'react';
import { Plus, Trash2, Clock } from 'lucide-react';

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

interface EmployeeScheduleEditorProps {
  value: WorkingHours;
  onChange: (newSchedule: WorkingHours) => void;
}

export function EmployeeScheduleEditor({ value, onChange }: EmployeeScheduleEditorProps) {
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

  return (
    <div className="space-y-4 border border-border rounded-xl p-4 bg-slate-50 dark:bg-slate-900">
      <h4 className="text-sm font-bold flex items-center gap-2 text-foreground">
        <Clock size={16} className="text-indigo-500" />
        Horarios y Turnos de Trabajo
      </h4>
      <p className="text-xs text-slate-500 mb-4">
        Activa los Días laborables y añade turnos. Puedes configurar horarios intercalados (ej. mañana y tarde).
      </p>

      <div className="space-y-3">
        {DAYS.map((d) => {
          const intervals = value[d.id] || [];
          const isActive = intervals.length > 0;

          return (
            <div key={d.id} className="flex flex-col sm:flex-row sm:items-start gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 sm:w-32 pt-1">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => toggleDay(d.id, e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className={\	ext-sm font-medium \\}>
                  {d.label}
                </span>
              </div>

              <div className="flex-1 space-y-2">
                {!isActive ? (
                  <span className="text-xs text-slate-400 italic pt-1 inline-block">Día libre</span>
                ) : (
                  intervals.map((interval, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={interval.start}
                        onChange={(e) => handleUpdateInterval(d.id, idx, 'start', e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-border rounded-md px-2 py-1 text-xs"
                      />
                      <span className="text-xs text-slate-400">a</span>
                      <input
                        type="time"
                        value={interval.end}
                        onChange={(e) => handleUpdateInterval(d.id, idx, 'end', e.target.value)}
                        className="bg-slate-100 dark:bg-slate-900 border border-border rounded-md px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveInterval(d.id, idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
                
                {isActive && (
                  <button
                    type="button"
                    onClick={() => handleAddInterval(d.id)}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mt-1"
                  >
                    <Plus size={12} /> Añadir turno
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
