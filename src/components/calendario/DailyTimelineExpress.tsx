'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  CalendarDays, 
  Clock, 
  MessageSquare, 
  DollarSign, 
  Stethoscope, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Play
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '@/types/calendario';

interface DailyTimelineExpressProps {
  appointments: Appointment[];
  onSelectAppointment: (appt: Appointment) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  onOpenCreateModal: () => void;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function DailyTimelineExpress({
  appointments,
  onSelectAppointment,
  onUpdateStatus,
  onOpenCreateModal,
  currentDate,
  onDateChange,
}: DailyTimelineExpressProps) {
  const router = useRouter();

  // Cambiar día
  const handlePrevDay = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  };

  const handleNextDay = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Filtrar citas del día seleccionado
  const dateStr = currentDate.toISOString().split('T')[0];
  const dayAppointments = appointments
    .filter((a) => a.start_time.startsWith(dateStr))
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Estados visuales
  const statusStyles: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
    confirmed: { label: 'Confirmada', color: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
    in_progress: { label: 'En Consulta', color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40 animate-pulse' },
    completed: { label: 'Completada', color: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
    cancelled: { label: 'Cancelada', color: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' },
    no_show: { label: 'No Asistió', color: 'bg-slate-400/20 text-slate-500 border-slate-400/30' },
  };

  return (
    <div className="space-y-4">
      {/* 1. SELECTOR DE FECHA RÁPIDO */}
      <div className="bg-card border border-border rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevDay}
          className="p-2 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic"
          aria-label="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="text-center">
          <span className="text-sm font-black text-foreground capitalize block">
            {currentDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <button
            type="button"
            onClick={handleToday}
            className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
          >
            Ir a Hoy
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic"
            aria-label="Día siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="p-2 rounded-xl bg-primary text-primary-foreground font-black hover:bg-primary/90 transition-all btn-haptic shadow-xs"
            title="Nueva Cita"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* 2. LISTA CRONOLÓGICA DE CITAS */}
      <div className="space-y-3">
        {dayAppointments.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-foreground">Sin citas para este día</p>
              <p className="text-xs text-slate-400 mt-0.5">Toca el botón (+) para agendar un turno.</p>
            </div>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-xs btn-haptic"
            >
              + Agendar Cita
            </button>
          </div>
        ) : (
          dayAppointments.map((appt) => {
            const timeFormatted = appt.start_time.slice(11, 16);
            const endTimeFormatted = appt.end_time?.slice(11, 16);
            const statusConfig = statusStyles[appt.status] || { label: appt.status, color: 'bg-slate-100 text-slate-600' };
            const clientPhone = (appt as any).client_phone || (appt as any).client?.phone;

            return (
              <div
                key={appt.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3 transition-all hover:border-teal-500/40"
              >
                {/* Cabecera de la Cita */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-center shrink-0">
                      <Clock size={16} className="mx-auto mb-0.5" />
                      <span className="text-xs font-black font-mono block">{timeFormatted}</span>
                      {endTimeFormatted && (
                        <span className="text-[10px] text-slate-400 font-mono block">{endTimeFormatted}</span>
                      )}
                    </div>

                    <div>
                      <h4 
                        onClick={() => onSelectAppointment(appt)}
                        className="text-sm font-black text-foreground hover:text-teal-600 cursor-pointer transition-colors"
                      >
                        {appt.client_name || 'Paciente sin nombre'}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {appt.service_name || appt.title || 'Consulta General'}
                        {appt.price ? ` · $${appt.price.toFixed(2)}` : ''}
                      </p>
                      {appt.employee_name && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Atiende: <strong className="text-slate-600 dark:text-slate-300">{appt.employee_name}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Acciones Rápidas de 1-Toque */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                  {/* Botón WhatsApp Recordatorio */}
                  {clientPhone ? (
                    <a
                      href={`https://wa.me/${clientPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `Hola ${appt.client_name}, te recordamos tu cita hoy a las ${timeFormatted} para ${appt.service_name || appt.title || 'tu consulta'}. ¡Te esperamos!`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-all btn-haptic"
                    >
                      <MessageSquare size={13} />
                      <span className="truncate">WhatsApp</span>
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-[11px] font-bold text-center opacity-50 cursor-not-allowed"
                    >
                      Sin Teléfono
                    </button>
                  )}

                  {/* Botón Iniciar Consulta / Sillón */}
                  <button
                    type="button"
                    onClick={() => {
                      if (appt.client_id) {
                        router.push(`/odontologia?client_id=${appt.client_id}`);
                      } else {
                        onSelectAppointment(appt);
                      }
                    }}
                    className="py-2 px-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-teal-600 dark:text-teal-400 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-all btn-haptic"
                  >
                    <Stethoscope size={13} />
                    <span className="truncate">Sillón</span>
                  </button>

                  {/* Botón Cobrar en Caja */}
                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (appt.client_id) params.set('client_id', appt.client_id);
                      params.set('appointment_id', appt.id);
                      if (appt.price) params.set('price', appt.price.toString());
                      const sName = appt.service_name || appt.title;
                      if (sName) params.set('title', sName);
                      router.push(`/caja?${params.toString()}`);
                    }}
                    className="py-2 px-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold text-center flex items-center justify-center gap-1.5 transition-all btn-haptic"
                  >
                    <DollarSign size={13} />
                    <span className="truncate">Cobrar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
