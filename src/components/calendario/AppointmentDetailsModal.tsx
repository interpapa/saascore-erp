'use client';

import React, { useState } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Briefcase,
  DollarSign,
  FileText,
  CheckCircle2,
  Play,
  XCircle,
  AlertCircle,
  Check,
  Users
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '@/types/calendario';
import { Entity } from '@/lib/api/entities';

export interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  clients?: Entity[];
  onUpdateMetadata?: (id: string, metadata: Record<string, any>) => Promise<void>;
}

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

function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeOnly(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onUpdateStatus,
  clients = [],
  onUpdateMetadata,
}: AppointmentDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedClientToAdd, setSelectedClientToAdd] = useState('');

  if (!isOpen || !appointment) return null;

  const isGroupClass = appointment.metadata?.is_group_class === true;
  const attendees = (appointment.metadata?.attendees as Array<{ id: string; name: string }>) || [];
  const maxCapacity = (appointment.metadata?.max_capacity as number) || 10;

  const handleAddAttendee = async () => {
    if (!selectedClientToAdd || !onUpdateMetadata) return;
    const client = clients.find(c => c.id === selectedClientToAdd);
    if (!client) return;

    if (attendees.some(a => a.id === client.id)) return;

    const newAttendees = [...attendees, { id: client.id, name: client.name }];
    try {
      setIsUpdating(true);
      await onUpdateMetadata(appointment.id, { ...appointment.metadata, attendees: newAttendees });
      setSelectedClientToAdd('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAttendee = async (clientId: string) => {
    if (!onUpdateMetadata) return;
    const newAttendees = attendees.filter(a => a.id !== clientId);
    try {
      setIsUpdating(true);
      await onUpdateMetadata(appointment.id, { ...appointment.metadata, attendees: newAttendees });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const cfg = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.scheduled;

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      setIsUpdating(true);
      await onUpdateStatus(appointment.id, newStatus);
      onClose();
    } catch (err) {
      console.error('Error al actualizar estado:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-border p-5 sm:p-6 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-foreground tracking-tight">Detalles de la Cita</h3>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${cfg.bg}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Main Info */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-3">
            <h4 className="text-lg font-black text-foreground">{appointment.title}</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <CalendarIcon size={14} className="text-slate-400 shrink-0" />
                <span className="font-semibold">{formatDateTime(appointment.start_time)}</span>
              </div>

              {appointment.end_time && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Clock size={14} className="text-slate-400 shrink-0" />
                  <span className="font-semibold">Hasta: {formatTimeOnly(appointment.end_time)}</span>
                </div>
              )}

              {!isGroupClass && (
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span>Cliente: <strong className="text-foreground">{appointment.client_name || 'General'}</strong></span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                <span>Profesional: <strong className="text-foreground">{appointment.employee_name || 'Sin Asignar'}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <DollarSign size={14} className="text-slate-400 shrink-0" />
                <span>Precio: <strong className="text-foreground">${(appointment.price || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></span>
              </div>
            </div>

            {appointment.notes && (
              <div className="pt-2 border-t border-border/60 text-xs">
                <p className="font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <FileText size={12} /> Observaciones:
                </p>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-border">
                  {appointment.notes}
                </p>
              </div>
            )}
            </div>

            {/* Attendees Section for Group Classes */}
            {isGroupClass && (
              <div className="bg-fuchsia-50/50 dark:bg-fuchsia-900/10 border border-fuchsia-100 dark:border-fuchsia-800/30 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-300 flex items-center gap-2">
                    <Users size={16} /> Alumnos Inscritos
                  </h4>
                  <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 rounded-md border border-slate-200">
                    {attendees.length} / {maxCapacity}
                  </span>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                  {attendees.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-300">
                      No hay alumnos inscritos en esta clase.
                    </p>
                  ) : (
                    attendees.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-sm font-semibold text-foreground">{a.name}</span>
                        <button
                          disabled={isUpdating}
                          onClick={() => handleRemoveAttendee(a.id)}
                          className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remover alumno"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {attendees.length < maxCapacity ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-fuchsia-200/50">
                    <select
                      value={selectedClientToAdd}
                      onChange={(e) => setSelectedClientToAdd(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:border-fuchsia-300"
                    >
                      <option value="">-- Seleccionar Alumno --</option>
                      {clients.filter(c => !attendees.some(a => a.id === c.id)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      disabled={isUpdating || !selectedClientToAdd}
                      onClick={handleAddAttendee}
                      className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Añadir
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-fuchsia-200/50">
                    <p className="text-xs text-rose-500 font-bold text-center">
                      La clase ha alcanzado su capacidad máxima ({maxCapacity}).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions (Status Transitions) */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cambiar Estado</h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {appointment.status !== 'confirmed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('confirmed')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Check size={14} /> Confirmar
                </button>
              )}

              {appointment.status !== 'in_progress' && appointment.status !== 'completed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('in_progress')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <Play size={14} /> En Curso
                </button>
              )}

              {appointment.status !== 'completed' ? (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('completed')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Completar
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (appointment.client_id) {
                      window.location.href = `/caja?client=${appointment.client_id}&amount=${appointment.price || 0}&desc=Cobro Cita: ${appointment.title}`;
                    } else {
                      window.location.href = `/caja?amount=${appointment.price || 0}&desc=Cobro Cita: ${appointment.title}`;
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                >
                  <DollarSign size={14} /> Cobrar en Caja
                </button>
              )}

              {appointment.status !== 'cancelled' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('cancelled')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <XCircle size={14} /> Cancelar
                </button>
              )}

              {appointment.status !== 'no_show' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('no_show')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-500/30 text-slate-700 dark:text-slate-300 hover:bg-slate-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <AlertCircle size={14} /> No Asistió
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
