'use client';

import React from 'react';
import { CalendarDays, Clock, User, Plus } from 'lucide-react';
import { Appointment, AppointmentStatus } from '@/types/calendario';
import { EmptyState } from '@/components/core/EmptyState';

export interface CalendarGridProps {
  viewMode: 'month' | 'week';
  currentDate: Date;
  appointments: Appointment[];
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

  // Month grid calculations
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Week grid calculations
  const getDaysInWeek = (date: Date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const getAppointmentsForDate = (date: Date) => {
    const targetStr = toLocalDateString(date);
    return appointments.filter((a) => {
      if (!a.start_time) return false;
      const apptDateStr = toLocalDateString(new Date(a.start_time));
      return apptDateStr === targetStr;
    });
  };

  const monthDays = getDaysInMonth(currentDate);
  const weekDays = getDaysInWeek(currentDate);
  const todayStr = toLocalDateString(new Date());

  // Check if current view has 0 appointments
  const currentViewAppointments =
    viewMode === 'month'
      ? appointments.filter((a) => {
          if (!a.start_time) return false;
          const d = new Date(a.start_time);
          return d.getFullYear() === currentDate.getFullYear() && d.getMonth() === currentDate.getMonth();
        })
      : appointments.filter((a) => {
          if (!a.start_time) return false;
          const d = new Date(a.start_time);
          const weekStart = weekDays[0];
          const weekEnd = weekDays[6];
          return d >= new Date(weekStart.setHours(0,0,0,0)) && d <= new Date(weekEnd.setHours(23,59,59,999));
        });

  if (currentViewAppointments.length === 0 && appointments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm p-4">
        <EmptyState
          icon={<CalendarDays size={48} />}
          title="No hay citas programadas"
          description="No se encontraron citas ni turnos en este período con los filtros seleccionados."
          action={{
            label: "Agendar Cita",
            onClick: onOpenCreateModal,
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border bg-slate-50/80 dark:bg-slate-900/80">
        {WEEKDAYS.map((day, idx) => {
          const weekDateObj = viewMode === 'week' ? weekDays[idx] : null;
          const isTodayWeek = weekDateObj && toLocalDateString(weekDateObj) === todayStr;
          return (
            <div
              key={day}
              className="py-3 px-1 text-center flex flex-col items-center justify-center border-r last:border-r-0 border-border/50"
            >
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {day}
              </span>
              {viewMode === 'week' && weekDateObj && (
                <span
                  className={`mt-1 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                    isTodayWeek
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {weekDateObj.getDate()}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid Content */}
      <div className="p-3 sm:p-4 bg-slate-50/30 dark:bg-slate-900/10">
        {viewMode === 'month' ? (
          /* MONTH VIEW GRID */
          <div className="grid grid-cols-7 gap-2 sm:gap-3">
            {monthDays.map((date, index) => {
              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[110px] sm:min-h-[130px] rounded-2xl bg-slate-100/30 dark:bg-slate-900/20 border border-transparent"
                  />
                );
              }

              const dateStr = toLocalDateString(date);
              const isToday = dateStr === todayStr;
              const dayAppts = getAppointmentsForDate(date);

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDateSlot(date)}
                  className={`group relative min-h-[110px] sm:min-h-[130px] rounded-2xl border p-2 flex flex-col transition-all cursor-pointer hover:shadow-md ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
                  }`}
                >
                  {/* Date Header */}
                  <div className="flex justify-between items-center mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-primary text-primary-foreground'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDateSlot(date);
                      }}
                      title="Agendar para esta fecha"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-primary transition-opacity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Day Appointments List */}
                  <div className="flex flex-col gap-1 flex-1 overflow-y-auto max-h-[100px] no-scrollbar">
                    {dayAppts.map((appt) => {
                      const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAppointment(appt);
                          }}
                          className={`text-[10px] sm:text-xs font-semibold p-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] ${cfg.bg}`}
                          title={`${appt.title} (${cfg.label}) - ${formatTime(appt.start_time)}`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className="truncate flex-1 font-bold">{appt.title}</span>
                          <span className="text-[9px] opacity-75 shrink-0 hidden sm:inline">
                            {formatTime(appt.start_time)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* WEEK VIEW GRID */
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
            {weekDays.map((date) => {
              const dateStr = toLocalDateString(date);
              const isToday = dateStr === todayStr;
              const dayAppts = getAppointmentsForDate(date);

              return (
                <div
                  key={dateStr}
                  onClick={() => onSelectDateSlot(date)}
                  className={`min-h-[360px] rounded-2xl border p-3 flex flex-col gap-2 transition-all cursor-pointer ${
                    isToday
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {date.toLocaleDateString('es-ES', { month: 'short' })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDateSlot(date);
                      }}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
                    {dayAppts.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
                        <p className="text-[11px] font-medium text-slate-400">Sin citas</p>
                      </div>
                    ) : (
                      dayAppts.map((appt) => {
                        const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.scheduled;
                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAppointment(appt);
                            }}
                            className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all hover:scale-[1.02] ${cfg.bg}`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-bold truncate">{appt.title}</span>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                            </div>

                            <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium">
                              <Clock size={10} />
                              <span>
                                {formatTime(appt.start_time)}
                                {appt.end_time ? ` - ${formatTime(appt.end_time)}` : ''}
                              </span>
                            </div>

                            {appt.client_name && (
                              <div className="flex items-center gap-1 text-[10px] opacity-80 font-medium">
                                <User size={10} />
                                <span className="truncate">{appt.client_name}</span>
                              </div>
                            )}

                            {appt.employee_name && (
                              <span className="text-[9px] font-semibold bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md self-start mt-1">
                                {appt.employee_name}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
