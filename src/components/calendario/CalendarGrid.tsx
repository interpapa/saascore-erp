'use client';

import React from 'react';
import { CalendarDays, Clock, User, Plus } from 'lucide-react';
import { Appointment, AppointmentStatus, Employee } from '@/types/calendario';
import { EmptyState } from '@/components/core/EmptyState';
import { getAppointmentVisualStatus } from '@/lib/calendario/calendarColors';

export interface CalendarGridProps {
  viewMode: 'day' | 'week' | 'month' | 'agenda';
  currentDate: Date;
  appointments: Appointment[];
  employees?: Employee[];
  isLoading: boolean;
  onSelectAppointment: (appt: Appointment) => void;
  onSelectDateSlot: (date: Date, timeStr?: string) => void;
  onOpenCreateModal: (type?: 'appointment' | 'block') => void;
  onDrillDown?: (date: Date, mode: 'day' | 'week' | 'month') => void;
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
  onDrillDown,
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
    const hours: string[] = [];
    for (let h = 8; h <= 20; h++) {
      hours.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 20) hours.push(`${h.toString().padStart(2, '0')}:30`);
    }

    const activeEmployees = employees.filter(e => e.is_active);
    const dayAppts = getAppointmentsForDate(currentDate);

    // Calculamos un ancho mínimo dependiendo de los empleados para forzar el scroll horizontal en móviles
    const minWidthClass = activeEmployees.length > 2 ? 'min-w-[800px]' : 'min-w-[600px]';

    return (
      <div className="flex flex-col h-[700px] overflow-auto bg-white dark:bg-slate-950 rounded-2xl border border-border hide-scrollbar shadow-sm relative">
        <div className={`flex flex-col ${minWidthClass} sm:min-w-full relative h-full`}>
          {/* Cabecera (Barberos) Fija */}
          <div className="flex sticky top-0 z-30 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border shadow-sm">
            <div className="w-16 shrink-0 border-r border-border p-2 flex items-center justify-center sticky left-0 z-40 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md">
               <Clock size={16} className="text-slate-400" />
            </div>
            {activeEmployees.length === 0 ? (
               <div className="flex-1 p-4 text-center text-sm font-bold text-slate-500">Sin empleados activos</div>
            ) : (
                activeEmployees.map(emp => {
                  const empColor = (emp.metadata?.color as string) || '#3b82f6';
                  return (
                    <div key={emp.id} className="flex-1 min-w-[150px] border-r border-border p-3 text-center border-t-4" style={{ borderTopColor: empColor }}>
                      <span className="text-sm font-black text-foreground">{emp.name}</span>
                    </div>
                  );
                })
            )}
          </div>
          
          {/* Cuerpo del Grid */}
          <div className="flex relative bg-slate-50/30 dark:bg-slate-900/10 flex-1">
             {/* Columna de Horas */}
             <div className="w-16 shrink-0 border-r border-border bg-slate-50/90 dark:bg-slate-900/90 sticky left-0 z-20 backdrop-blur-md shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
               {hours.map(time => (
                 <div key={time} className="h-16 border-b border-border/50 text-right pr-2 pt-1">
                    <span className="text-[10px] font-bold text-slate-400">{time}</span>
                 </div>
               ))}
             </div>
             
             {/* Columnas de Empleados */}
             <div className="flex flex-1">
               {activeEmployees.map(emp => {
                  const empAppts = dayAppts.filter(a => a.employee_id === emp.id || (!a.employee_id && a.metadata?.is_block));
                  
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
                         const isBlock = !!appt.metadata?.is_block;
                         const isAllDay = !!appt.metadata?.all_day;

                         // 1 slot = 30 mins = h-16 (64px) -> 1 min = 64/30 px = 2.133px
                         const pixelsPerMin = 64 / 30;
                         let topPx: number;
                         let heightPx: number;

                         if (isAllDay) {
                           topPx = 0;
                           // 13 horas (8:00 a 21:00) = 780 mins
                           heightPx = 780 * pixelsPerMin;
                         } else {
                           const startD = new Date(appt.start_time);
                           const endD = appt.end_time ? new Date(appt.end_time) : new Date(startD.getTime() + 45*60000);
                           
                           const startMins = startD.getHours() * 60 + startD.getMinutes();
                           const endMins = endD.getHours() * 60 + endD.getMinutes();
                           
                           const topMins = startMins - (8 * 60);
                           const durationMins = endMins - startMins;
                           
                           topPx = topMins * pixelsPerMin;
                           heightPx = Math.max(15, durationMins) * pixelsPerMin;

                           if (topMins < 0) return null;
                         }

                         const visual = getAppointmentVisualStatus(appt.status, appt.metadata);
                         const apptColor = (appt.metadata?.color as string) || (employees.find(e => e.id === appt.employee_id)?.metadata?.color as string) || visual.color || '#6366f1';
                         const cardBorderColor = isBlock ? '#f43f5e' : (visual.isPendingPayment ? '#f59e0b' : (visual.isPaid ? '#10b981' : apptColor));

                         return (
                           <div 
                             key={appt.id}
                             onClick={(e) => { e.stopPropagation(); onSelectAppointment(appt); }}
                             className={`absolute left-1 right-1 rounded-xl p-2.5 shadow-sm border border-l-4 overflow-hidden flex flex-col gap-0.5 cursor-pointer hover:shadow-md transition-all hover:scale-[1.01] z-10 ${visual.bg}`}
                             style={{ top: `${topPx}px`, height: `${heightPx}px`, borderLeftColor: cardBorderColor }}
                           >
                             <div className="flex items-center justify-between gap-1">
                               <span className="text-xs font-black leading-tight truncate">
                                 {isBlock ? `🔒 ${appt.title}` : (appt.client_name || appt.title)}
                               </span>
                               {visual.isPendingPayment && (
                                 <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/25 text-amber-900 dark:text-amber-200 shrink-0">
                                   Pago Pend.
                                 </span>
                               )}
                               {isBlock && isAllDay && (
                                 <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-rose-500/25 text-rose-900 dark:text-rose-200 shrink-0">
                                   Día Completo
                                 </span>
                               )}
                             </div>
                             {heightPx >= 50 && (
                               <span className="text-[10px] font-medium leading-tight truncate opacity-80">
                                 {isBlock ? String(appt.metadata?.block_type || 'Mantenimiento') : (appt.service_name || appt.title)}
                               </span>
                             )}
                             <div className="mt-auto flex items-center justify-between">
                                <span className="text-[10px] font-bold opacity-75">
                                  {isAllDay ? 'Jornada Completa' : formatTime(appt.start_time)}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${visual.dot}`} />
                             </div>
                           </div>
                         );
                      })}
                    </div>
                  )
               })}
             </div>
          </div>
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
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-auto hide-scrollbar">
        <div className="min-w-[800px] sm:min-w-full">
          {/* Cabecera de días */}
          <div className="grid grid-cols-7 border-b border-border bg-slate-50/80 dark:bg-slate-900/80">
            {WEEKDAYS.map((day, idx) => {
              const weekDateObj = weekDays[idx];
              const isToday = toLocalDateString(weekDateObj) === todayStr;
              return (
                <div
                  key={day}
                  onClick={() => onDrillDown && onDrillDown(weekDateObj, 'day')}
                  className="py-3 px-1 text-center flex flex-col items-center justify-center border-r last:border-r-0 border-border/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition group"
                  title={`Ver día ${weekDateObj.getDate()} en detalle`}
                >
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-primary transition-colors">{day}</span>
                  <span className={`mt-1 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                    {weekDateObj.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Cuerpo de semana */}
          <div className="p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-900/10">
            <div className="grid grid-cols-7 gap-2 sm:gap-3">
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
                          const visual = getAppointmentVisualStatus(appt.status, appt.metadata);
                          const apptColor = (appt.metadata?.color as string) || (employees.find(e => e.id === appt.employee_id)?.metadata?.color as string) || visual.color || '#6366f1';
                          const cardBorderColor = visual.isPendingPayment ? '#f59e0b' : (visual.isPaid ? '#10b981' : apptColor);
                          return (
                            <div
                              key={appt.id}
                              onClick={(e) => { e.stopPropagation(); onSelectAppointment(appt); }}
                              className={`p-2.5 rounded-xl border-l-4 flex flex-col gap-1 transition-all hover:scale-[1.02] ${visual.bg}`}
                              style={{ borderLeftColor: cardBorderColor }}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[11px] font-black leading-tight line-clamp-2">{appt.metadata?.is_block ? `🔒 ${appt.title}` : (appt.client_name || appt.title)}</span>
                                {visual.isPendingPayment && (
                                  <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/25 text-amber-900 dark:text-amber-200 shrink-0">
                                    Pend.
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium">
                                <Clock size={10} />
                                <span>{formatTime(appt.start_time)}</span>
                              </div>
                              <div className="flex items-center justify-between mt-1">
                                {appt.employee_name ? (
                                  <span className="text-[9px] font-bold bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md truncate max-w-[80%]">
                                    {appt.employee_name}
                                  </span>
                                ) : appt.metadata?.is_block ? (
                                  <span className="text-[9px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded-md truncate max-w-[80%]">
                                    Toda la Empresa
                                  </span>
                                ) : <span />}
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${visual.dot}`} />
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
    while (monthDays.length % 7 !== 0) {
      monthDays.push(null);
    }

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7));
    }

    return (
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
        {/* Cabecera de días de la semana */}
        <div className="flex items-center border-b border-border bg-slate-50/80 dark:bg-slate-900/80">
          <div className="hidden sm:block w-8 shrink-0 text-center text-[9px] font-bold text-slate-400">
            SEM
          </div>
          <div className="grid grid-cols-7 flex-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2.5 text-center text-[10px] font-bold text-slate-500 uppercase">
                {day}
              </div>
            ))}
          </div>
        </div>

        {/* Semanas del Mes */}
        <div className="p-2 sm:p-4 bg-slate-50/30 dark:bg-slate-900/10 space-y-2">
          {weeks.map((week, weekIdx) => {
            const firstValidDate = week.find((d): d is Date => d !== null);

            return (
              <div key={`week-row-${weekIdx}`} className="flex items-stretch gap-1 sm:gap-2">
                {/* Botón rápido para saltar a esta semana */}
                {firstValidDate ? (
                  <button
                    type="button"
                    onClick={() => onDrillDown && onDrillDown(firstValidDate, 'week')}
                    className="hidden sm:flex flex-col items-center justify-center w-8 py-2 rounded-xl bg-slate-100 hover:bg-primary/10 dark:bg-slate-800/40 dark:hover:bg-primary/20 text-slate-400 hover:text-primary transition group shrink-0"
                    title={`Ver Semana ${weekIdx + 1} en detalle`}
                  >
                    <span className="text-[9px] font-black uppercase [writing-mode:vertical-lr] rotate-180 tracking-tighter">
                      Sem {weekIdx + 1}
                    </span>
                  </button>
                ) : (
                  <div className="hidden sm:block w-8 shrink-0" />
                )}

                {/* Grilla de los 7 días de esta semana */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1">
                  {week.map((date, dayIdx) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${weekIdx}-${dayIdx}`}
                          className="min-h-[60px] sm:min-h-[100px] rounded-xl sm:rounded-2xl bg-slate-100/30 dark:bg-slate-900/20"
                        />
                      );
                    }

                    const dateStr = toLocalDateString(date);
                    const isToday = dateStr === todayStr;
                    const dayAppts = getAppointmentsForDate(date);

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          if (onDrillDown) {
                            onDrillDown(date, 'week');
                          } else {
                            onSelectDateSlot(date);
                          }
                        }}
                        title={dayAppts.length > 0 ? `Clic para ver la semana (${dayAppts.length} citas)` : 'Clic para ver la semana'}
                        className={`group relative min-h-[60px] sm:min-h-[100px] rounded-xl sm:rounded-2xl border p-1 sm:p-2 flex flex-col transition-all cursor-pointer hover:shadow-md ${
                          isToday
                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                              isToday
                                ? 'bg-primary text-primary-foreground'
                                : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          <div className="flex items-center gap-1">
                            {dayAppts.length > 0 && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                                {dayAppts.length}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDateSlot(date);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition"
                              title={`Agendar cita el ${date.getDate()}`}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 overflow-hidden">
                          {/* Desktop View: Text List */}
                          <div className="hidden sm:flex flex-col gap-0.5">
                            {dayAppts.slice(0, 4).map((appt) => {
                              const visual = getAppointmentVisualStatus(appt.status, appt.metadata);
                              const apptColor =
                                (appt.metadata?.color as string) ||
                                (employees.find((e) => e.id === appt.employee_id)?.metadata?.color as string) ||
                                visual.color ||
                                '#6366f1';
                              const cardBorderColor = visual.isPendingPayment
                                ? '#f59e0b'
                                : visual.isPaid
                                ? '#10b981'
                                : apptColor;
                              return (
                                <div
                                  key={appt.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectAppointment(appt);
                                  }}
                                  className={`text-[9px] font-bold p-1 rounded-md border-l-4 truncate ${visual.bg}`}
                                  style={{ borderLeftColor: cardBorderColor }}
                                >
                                  {appt.metadata?.is_block ? '🔒 ' : ''}
                                  {visual.isPendingPayment ? '🟡 ' : ''}
                                  {formatTime(appt.start_time)} {appt.client_name || appt.title}
                                </div>
                              );
                            })}
                            {dayAppts.length > 4 && (
                              <div className="text-[9px] font-bold text-slate-400 pl-1">
                                +{dayAppts.length - 4} más
                              </div>
                            )}
                          </div>

                          {/* Mobile View: Dots */}
                          <div className="flex sm:hidden flex-wrap gap-0.5 justify-center mt-1">
                            {dayAppts.slice(0, 5).map((appt) => {
                              const visual = getAppointmentVisualStatus(appt.status, appt.metadata);
                              return <div key={appt.id} className={`w-1.5 h-1.5 rounded-full ${visual.dot}`} />;
                            })}
                            {dayAppts.length > 5 && (
                              <span className="text-[8px] font-black text-slate-400 leading-none inline-flex items-center">
                                +
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // -------------------------
  // RENDER: AGENDA VIEW (CRONOLÓGICA)
  // -------------------------
  const renderAgendaView = () => {
    const sortedAppts = [...appointments].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );

    const grouped = new Map<string, Appointment[]>();
    sortedAppts.forEach((appt) => {
      if (!appt.start_time) return;
      const d = toLocalDateString(new Date(appt.start_time));
      if (!grouped.has(d)) grouped.set(d, []);
      grouped.get(d)!.push(appt);
    });

    if (sortedAppts.length === 0) {
      return (
        <div className="bg-card border border-border rounded-3xl p-12 text-center">
          <EmptyState
            icon={<CalendarDays size={36} />}
            title="No hay citas en este período"
            description="No se encontraron citas agendadas con los filtros seleccionados."
            action={{
              label: 'Agendar Cita',
              onClick: () => onOpenCreateModal('appointment')
            }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {Array.from(grouped.entries()).map(([dateStr, apptsList]) => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d);
          const isToday = dateStr === todayStr;

          return (
            <div key={dateStr} className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              {/* Day Header Banner */}
              <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-sm ${
                      isToday
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {d}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground capitalize">
                      {dateObj.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {apptsList.length} {apptsList.length === 1 ? 'cita agendada' : 'citas agendadas'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isToday && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                      Hoy
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onDrillDown && onDrillDown(dateObj, 'day')}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    Ver en Grilla ➔
                  </button>
                </div>
              </div>

              {/* List of appointments */}
              <div className="divide-y divide-border">
                {apptsList.map((appt) => {
                  const isBlock = !!appt.metadata?.is_block;
                  const visual = getAppointmentVisualStatus(appt.status, appt.metadata);
                  const apptColor =
                    (appt.metadata?.color as string) ||
                    (employees.find((e) => e.id === appt.employee_id)?.metadata?.color as string) ||
                    visual.color ||
                    '#6366f1';

                  return (
                    <div
                      key={appt.id}
                      onClick={() => onSelectAppointment(appt)}
                      className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-1.5 self-stretch rounded-full shrink-0"
                          style={{ backgroundColor: isBlock ? '#f43f5e' : apptColor }}
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm text-foreground group-hover:text-primary transition-colors">
                              {isBlock ? `🔒 ${appt.title}` : appt.client_name || appt.title}
                            </span>
                            {appt.metadata?.is_block ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Bloqueo / Mantenimiento
                              </span>
                            ) : (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                  STATUS_CONFIG[appt.status]?.bg || 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {STATUS_CONFIG[appt.status]?.label || appt.status}
                              </span>
                            )}
                            {visual.isPendingPayment && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                Pago Pendiente
                              </span>
                            )}
                            {visual.isPaid && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                Pagado
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                              <Clock size={13} className="text-primary" />
                              {formatTime(appt.start_time)} -{' '}
                              {appt.end_time ? formatTime(appt.end_time) : 'Fin estimado'}
                            </span>
                            {appt.service_name && (
                              <span>
                                • {appt.service_name} {appt.price ? `($${appt.price})` : ''}
                              </span>
                            )}
                            {appt.employee_name && (
                              <span className="flex items-center gap-1">
                                • Doctor/Espec:{' '}
                                <strong className="text-foreground">{appt.employee_name}</strong>
                              </span>
                            )}
                            {appt.client_phone && <span>• Tel: {appt.client_phone}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAppointment(appt);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-xs font-bold text-slate-600 dark:text-slate-300 transition shadow-sm"
                        >
                          Ver Detalle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Drill-down Breadcrumb Navigation */}
      {(viewMode === 'day' || viewMode === 'week') && (
        <div className="flex items-center justify-between bg-primary/5 dark:bg-primary/10 border border-primary/20 px-4 py-2.5 rounded-2xl">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300 flex-wrap">
            <button
              type="button"
              onClick={() => onDrillDown && onDrillDown(currentDate, 'month')}
              className="text-primary hover:underline flex items-center gap-1"
            >
              📅 Vista de Mes ({currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})
            </button>
            <span>➔</span>
            {viewMode === 'day' ? (
              <>
                <button
                  type="button"
                  onClick={() => onDrillDown && onDrillDown(currentDate, 'week')}
                  className="text-primary hover:underline"
                >
                  🗓️ Vista de Semana
                </button>
                <span>➔</span>
                <span className="text-foreground font-black">
                  📍 Día: {currentDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </>
            ) : (
              <span className="text-foreground font-black">
                🗓️ Vista de Semana
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDrillDown && onDrillDown(currentDate, 'month')}
            className="text-[11px] font-black text-primary hover:underline shrink-0"
          >
            Subir al Mes Completo ⬆️
          </button>
        </div>
      )}

      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'agenda' && renderAgendaView()}
    </div>
  );
}
