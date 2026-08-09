'use client';

import React from 'react';
import { CalendarDays, Clock, CheckCircle2, DollarSign } from 'lucide-react';
import { Appointment } from '@/types/calendario';

export interface CalendarKPIsProps {
  appointments: Appointment[];
}

export function CalendarKPIs({ appointments }: CalendarKPIsProps) {
  // Check if ISO date string matches today's date
  const isToday = (isoString?: string) => {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  };

  const citasHoy = appointments.filter((a) => isToday(a.start_time)).length;
  const pendientes = appointments.filter(
    (a) => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress'
  ).length;
  const completadas = appointments.filter((a) => a.status === 'completed').length;
  const ingresosEstimados = appointments
    .filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
    .reduce((sum, a) => sum + (a.price || 0), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Citas Hoy */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Citas Hoy</h3>
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center">
            <CalendarDays size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{citasHoy}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Programadas para hoy</p>
      </div>

      {/* Pendientes */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pendientes</h3>
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{pendientes}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Por realizar o en curso</p>
      </div>

      {/* Completadas */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Completadas</h3>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">{completadas}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Servicios finalizados</p>
      </div>

      {/* Ingresos Estimados */}
      <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Valor Estimado</h3>
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>
        <p className="text-3xl font-black text-foreground">
          ${ingresosEstimados.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Monto total de agenda</p>
      </div>
    </div>
  );
}
