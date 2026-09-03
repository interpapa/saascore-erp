'use client';

import React from 'react';
import { CalendarDays, Clock, User, Plus } from 'lucide-react';
import { Appointment, AppointmentStatus, Employee } from '@/types/calendario';
import { EmptyState } from '@/components/core/EmptyState';

export interface CalendarGridProps {
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  appointments: Appointment[];
  employees?: Employee[];
  isLoading: boolean;
  onSelectAppointment: (appt: Appointment) => void;
  onSelectDateSlot: (date: Date, timeStr?: string) => void;
  onOpenCreateModal: () => void;
}

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; bg: string; dot: string }
> = {
  scheduled: {
    label: 'Programada',
    bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  confirmed: {
    label: 'Confirmada',
    bg: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
    dot: 'bg-indigo-500',
  },
  in_progress: {
    label: 'En Curso',
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completada',
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  cancelled: {
    label: 'Cancelada',
    bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  no_show: {
    label: 'No Asistió',
    bg: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20',
    dot: 'bg-slate-500',
  },
};

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function CalendarGrid({
  viewMode,
  currentDate,
  appointments,
  employees = [],
  isLoading,
  onSelectAppointment,
  onSelectDateSlot,
  onOpenCreateModal,
}: CalendarGridProps) {
  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-3xl p-16 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Cargando agenda de citas...</p>
        </div>
      </div>
    );
  }

  // Common dates and calculations
  const todayStr = toLocalDateString(new Date());

  const getAppointmentsForDate = (date: Date) => {
    const targetStr = toLocalDateString(date);
    return appointments.filter((a) => {
      if (!a.start_time) return false;
      const apptDateStr = toLocalDateString(new Date(a.start_time));
      return apptDateStr === targetStr;
    });
  };

  // -------------------------
  // RENDER: DAY VIEW (RESOURCE)
  // -------------------------
  const renderDayView = () => {
    // Generar horas desde 08:00 hasta 20:30 (intervalos de 30 min)
    const hours = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) hours.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const activeEmployees = employees.filter(e => e.is_active);
    const dayAppts = getAppointmentsForDate(currentDate);

    return (
      <div className="flex flex-col h-[700px] overflow-y-auto bg-white dark:bg-slate-950 rounded-2xl border border-border hide-scrollbar shadow-sm">
        {/* Cabecera (Barberos) Fija */}
        <div className="flex sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-sm">
          <div className="w-16 shrink-0 border-r border-border p-2 flex items-center justify-center">
             <Clock size={16} className="text-slate-400" />
          </div>
          {activeEmployees.length === 0 ? (
             <div className="flex-1 p-4 text-center text-sm font-bold text-slate-500">Sin empleados activos</div>
          ) : (
            activeEmployees.map(emp => (
              <div key={emp.id} className="flex-1 min-w-[150px] border-r border-border p-3 text-center">
                <span className="text-sm font-black text-foreground">{emp.name}</span>
              </div>
            ))
          )}
        </div>
        
        {/* Cuerpo del Grid */}
        <div className="flex relative bg-slate-50/30 dark:bg-slate-900/10">
           {/* Columna de Horas */}
           <div className="w-16 shrink-0 border-r border-border bg-slate-50/50 dark:bg-slate-900/50">
             {hours.map(time => (
               <div key={time} className="h-16 border-b border-border/50 text-right pr-2 pt-1">
                  <span className="text-[10px] font-bold text-slate-400">{time}</span>
               </div>
             ))}
           </div>
           
           {/* Columnas de Empleados */}
           {activeEmployees.map(emp => {
              const empAppts = dayAppts.filter(a => a.employee_id === emp.id);
              
              return (
                <div key={emp.id} className="flex-1 min-w-[150px] border-r border-border relative">
                  {/* Celdas de Fondo para clics */}
                  {hours.map(time => (
                    <div 
                      key={time} 
                      className="h-16 border-b border-border/30 cursor-pointer hover:bg-primary/5 transition-colors"
                      onClick={() => onSelectDateSlot(currentDate, time)}
                    />
                  ))}
                  
                  {/* Citas Superpuestas */}
                  {empAppts.map(appt => {
                     const startD = new Date(appt.start_time);
                     const endD = appt.end_time ? new Date(appt.end_time) : new Date(startD.getTime() + 45*60000);
                     
                     const startMins = startD.getHours() * 60 + startD.getMinutes();
                     const endMins = endD.getHours() * 60 + endD.getMinutes();
                     
                     const topMins = startMins - (8 * 60);
                     const durationMins = endMins - startMins;
                     
                     // 1 slot = 30 mins = h-16 (64px) -> 1 min = 64/30 px = 2.133px
                     const pixelsPerMin = 64 / 30;
                     const topPx = topMins * pixelsPerMin;
                     // Mínimo visual de 15 mins
                     const heightPx = Math.max(15, durationMins) * pixelsPerMin;

                     // Ignorar citas antes de las 8am o después del cierre visualmente por ahora
                     if (topMins < 0) return null;

                     const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;

                     return (
                       <div 
                         key={appt.id}
                         onClick={(e) => { e.stopPropagation(); onSelectAppointment(appt); }}
                         className={`absolute left-1 right-1 rounded-xl p-2.5 shadow-sm border overflow-hidden flex flex-col gap-0.5 cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] z-10 ${cfg.bg}`}
                         style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                       >
                         <span className="text-xs font-black leading-tight truncate">{appt.client_name || appt.title}</span>
                         {heightPx >= 50 && (
                           <span className="text-[10px] font-medium leading-tight truncate opacity-80">{appt.service_name || appt.title}</span>
                         )}
                         <div className="mt-auto flex items-center justify-between">
                            <span className="text-[10px] font-bold opacity-75">{formatTime(appt.start_time)}</span>
                            <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                         </div>
                       </div>
                     )
                  })}
                </div>
              )
           })}
        </div>
      </div>
    );
  };

  // -------------------------
  // RENDER: WEEK VIEW
  // -------------------------
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        {/* Cabecera de días */}
        <div className="grid grid-cols-7 border-b border-border bg-slate-50/80 dark:bg-slate-900/80">
          {WEEKDAYS.map((day, idx) => {
            const weekDateObj = weekDays[idx];
            const isToday = toLocalDateString(weekDateObj) === todayStr;
            return (
              <div
                key={day}
                className="py-3 px-1 text-center flex flex-col items-center justify-center border-r last:border-r-0 border-border/50"
              >
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{day}</span>
                <span className={`mt-1 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {weekDateObj.getDate()}
                </span>
              </div>
            );
          })}
        </div>
        {/* Cuerpo de semana */}
        <div className="p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-900/10">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {weekDays.map((date) => {
              const dateStr = toLocalDateString(date);
              const isToday = dateStr === todayStr;
              const dayAppts = getAppointmentsForDate(date);

              // Ordenar citas del día cronológicamente
              dayAppts.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDateSlot(date)}
                  className={`min-h-[450px] rounded-2xl border p-2 flex flex-col gap-2 transition-all cursor-pointer ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2 px-1">
                    <span className="text-[11px] font-bold text-slate-400">
                      {date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelectDateSlot(date); }}
                      className="text-xs text-primary font-bold hover:underline flex items-center"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
                    {dayAppts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                        <p className="text-[11px] font-medium text-slate-400">Libre</p>
                      </div>
                    ) : (
                      dayAppts.map((appt) => {
                        const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => { e.stopPropagation(); onSelectAppointment(appt); }}
                            className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all hover:scale-[1.02] ${cfg.bg}`}
                          >
                            <span className="text-[11px] font-black truncate">{appt.client_name || appt.title}</span>
                            <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium">
                              <Clock size={10} />
                              <span>{formatTime(appt.start_time)}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              {appt.employee_name ? (
                                <span className="text-[9px] font-bold bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md truncate max-w-[80%]">
                                  {appt.employee_name}
                                </span>
                              ) : <span />}
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // -------------------------
  // RENDER: MONTH VIEW
  // -------------------------
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const monthDays: (Date | null)[] = Array(firstDayIndex).fill(null);
    for (let i = 1; i <= daysCount; i++) {
      monthDays.push(new Date(year, month, i));
    }

    return (
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-slate-50/80 dark:bg-slate-900/80">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-2 text-center text-[10px] font-bold text-slate-500 uppercase">{day}</div>
          ))}
        </div>
        <div className="p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-900/10">
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {monthDays.map((date, index) => {
              if (!date) return <div key={`empty-${index}`} className="min-h-[100px] rounded-2xl bg-slate-100/30 dark:bg-slate-900/20" />;

              const dateStr = toLocalDateString(date);
              const isToday = dateStr === todayStr;
              const dayAppts = getAppointmentsForDate(date);

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDateSlot(date)}
                  className={`group relative min-h-[100px] rounded-2xl border p-2 flex flex-col transition-all cursor-pointer hover:shadow-md ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-slate-600'}`}>
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 flex-1 overflow-y-auto no-scrollbar">
                    {dayAppts.slice(0, 4).map((appt) => {
                      const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                      return (
                        <div key={appt.id} onClick={(e) => { e.stopPropagation(); onSelectAppointment(appt); }} className={`text-[9px] font-bold p-1 rounded-md truncate ${cfg.bg}`}>
                           {formatTime(appt.start_time)} {appt.client_name || appt.title}
                        </div>
                      );
                    })}
                    {dayAppts.length > 4 && (
                      <div className="text-[9px] font-bold text-slate-400 pl-1">+{dayAppts.length - 4} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
    </div>
  );
}
