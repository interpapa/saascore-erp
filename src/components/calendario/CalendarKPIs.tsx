'use client';

import React from 'react';
import { CalendarDays, Clock, CheckCircle2, Calendar } from 'lucide-react';
import { Appointment } from '@/types/calendario';

export interface CalendarKPIsProps {
  appointments: Appointment[];
}

export function CalendarKPIs({ appointments }: CalendarKPIsProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const currentMonthName = monthNames[currentMonth];

  // Helper para citas de hoy
  const isToday = (isoString?: string) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    return (
      d.getFullYear() === currentYear &&
      d.getMonth() === currentMonth &&
      d.getDate() === currentDay
    );
  };

  // Helper para citas de este mes
  const isCurrentMonth = (isoString?: string) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  };

  // Citas de Hoy (activas hoy)
  const citasHoy = appointments.filter((a) => isToday(a.start_time));
  const citasHoyTotal = citasHoy.length;

  // Reservas del Mes en curso
  const reservasMes = appointments.filter((a) => isCurrentMonth(a.start_time) && a.status !== 'cancelled');
  const reservasMesTotal = reservasMes.length;

  // Pendientes / Por Atender (scheduled, confirmed, in_progress)
  const pendientes = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress'
  ).length;

  // Completadas / Atendidas
  const completadas = appointments.filter((a) => a.status === 'completed').length;
  const totalActivasMes = reservasMes.length;
  const tasaCumplimiento = totalActivasMes > 0 
    ? Math.round((reservasMes.filter(a => a.status === 'completed').length / totalActivasMes) * 100) 
    : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {/* 1. Citas Hoy */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Citas Hoy</h3>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shadow-xs">
            <CalendarDays size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{citasHoyTotal}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          {citasHoyTotal === 1 ? '1 consulta programada hoy' : `${citasHoyTotal} consultas para hoy`}
        </p>
      </div>

      {/* 2. Reservas del Mes (Reemplazo limpio de Valor Estimado) */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reservas del Mes</h3>
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shadow-xs">
            <Calendar size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{reservasMesTotal}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Total agendado en {currentMonthName}
        </p>
      </div>

      {/* 3. Por Atender / Pendientes */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Por Atender</h3>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shadow-xs">
            <Clock size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{pendientes}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Programadas y en sala de espera
        </p>
      </div>

      {/* 4. Atendidas / Completadas */}
      <div className="bg-card border border-border p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completadas</h3>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-black text-foreground">{completadas}</p>
          {totalActivasMes > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {tasaCumplimiento}% asist.
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Consultas finalizadas con éxito
        </p>
      </div>
    </div>
  );
}
