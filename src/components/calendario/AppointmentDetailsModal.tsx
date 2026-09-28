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
  Users,
  MessageCircle,
  Edit2
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '@/types/calendario';
import { Entity } from '@/lib/api/entities';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { logExternalWhatsAppMessageAction } from '@/app/actions/whatsapp';
import { 
  addAttendeeToAppointmentAction, 
  removeAttendeeFromAppointmentAction,
  updateAppointmentPriceAction 
} from '@/app/actions/appointments';
import { isModuleActive } from '@/lib/core/kernel/moduleRegistry';

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
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState<number>(appointment?.price || 0);
  const [currentPrice, setCurrentPrice] = useState<number>(appointment?.price || 0);

  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const activeModules = currentTenant?.active_modules || (currentTenant?.metadata as any)?.active_modules;
  const isCajaEnabled = isModuleActive(activeModules, 'caja');

  React.useEffect(() => {
    if (appointment) {
      setCurrentPrice(appointment.price || 0);
      setEditedPrice(appointment.price || 0);
      setIsEditingPrice(false);
    }
  }, [appointment]);

  const handleSavePrice = async () => {
    if (!appointment || !currentTenant?.id || !actor) return;
    setIsUpdating(true);
    try {
      const res = await updateAppointmentPriceAction(appointment.id, editedPrice, currentTenant.id, actor);
      if (res.success) {
        const newP = res.price ?? editedPrice;
        setCurrentPrice(newP);
        appointment.price = newP;
        setIsEditingPrice(false);
      }
    } catch (err) {
      console.error('Error al actualizar precio:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen || !appointment) return null;

  const isGroupClass = appointment.metadata?.is_group_class === true;
  const attendees = (appointment.metadata?.attendees as Array<{ id: string; name: string }>) || [];
  const maxCapacity = (appointment.metadata?.max_capacity as number) || 10;

  const handleSendAppointmentWhatsApp = () => {
    if (!appointment) return;
    const clientPhone = appointment.client_phone || (appointment.metadata as any)?.client_phone || '';
    const cleanPhone = clientPhone.replace(/[^0-9]/g, '');
    const clientName = appointment.client_name || (appointment.metadata as any)?.client_name || 'Cliente';
    const dateFormatted = formatDateTime(appointment.start_time);
    const serviceName = appointment.service_name || (appointment.metadata as any)?.service_name || 'Servicio';

    const message = `*RECORDATORIO DE CITA*\n` +
      `Hola ${clientName}, te saludamos de ${currentTenant?.name || 'nuestro centro'}.\n` +
      `Te recordamos tu cita agendada:\n\n` +
      `📌 *Servicio:* ${serviceName}\n` +
      `📅 *Fecha y Hora:* ${dateFormatted}\n` +
      (appointment.employee_name ? `👤 *Especialista:* ${appointment.employee_name}\n` : '') +
      `\nPor favor responde a este mensaje para *confirmar* tu asistencia o reprogramar si lo necesitas. ¡Te esperamos!`;

    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    if (actor && currentTenant?.id) {
      logExternalWhatsAppMessageAction(
        {
          phone: cleanPhone || '580000000000',
          client_name: clientName,
          client_id: appointment.client_id || undefined,
          text: message,
          module_source: 'calendario',
          metadata: {
            appointment_id: appointment.id,
            start_time: appointment.start_time,
          },
        },
        currentTenant.id,
        actor
      ).catch((err) => console.warn('[WhatsApp Calendario Log Warning]:', err));
    }
  };

  const handleAddAttendee = async () => {
    if (!selectedClientToAdd || !currentTenant || !actor) return;
    const client = clients.find(c => c.id === selectedClientToAdd);
    if (!client) return;

    try {
      setIsUpdating(true);
      const res = await addAttendeeToAppointmentAction(appointment.id, { id: client.id, name: client.name }, currentTenant.id, actor);
      if (res.success && res.attendees) {
        if (onUpdateMetadata) {
          await onUpdateMetadata(appointment.id, { ...appointment.metadata, attendees: res.attendees });
        }
        setSelectedClientToAdd('');
      } else {
        alert(res.error || 'No se pudo agregar participante.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al agregar participante');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveAttendee = async (clientId: string) => {
    if (!currentTenant || !actor) return;
    try {
      setIsUpdating(true);
      const res = await removeAttendeeFromAppointmentAction(appointment.id, clientId, currentTenant.id, actor);
      if (res.success && res.attendees) {
        if (onUpdateMetadata) {
          await onUpdateMetadata(appointment.id, { ...appointment.metadata, attendees: res.attendees });
        }
      }
    } catch (err: any) {
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
                  <span>Cliente: <strong className="text-foreground">{appointment.client_name || (appointment.metadata as any)?.client_name || 'General'}</strong></span>
                </div>
              )}

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                <span>Profesional: <strong className="text-foreground">{appointment.employee_name || 'Sin Asignar'}</strong></span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                {isEditingPrice ? (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-500">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={editedPrice === 0 ? '' : editedPrice}
                      placeholder="0.00"
                      onChange={(e) => setEditedPrice(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                      className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-indigo-400 bg-background text-foreground focus:outline-none"
                      autoFocus
                    />
                    <button
                      disabled={isUpdating}
                      onClick={handleSavePrice}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditedPrice(currentPrice);
                        setIsEditingPrice(false);
                      }}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-400 shrink-0" />
                    <span>Precio: <strong className="text-foreground">${currentPrice.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong></span>
                    {appointment.metadata?.payment_status !== 'paid' && (
                      <button
                        type="button"
                        onClick={() => setIsEditingPrice(true)}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        title="Ajustar precio para este tratamiento o trabajo específico"
                      >
                        <Edit2 size={11} /> Ajustar
                      </button>
                    )}
                  </div>
                )}
                <div>
                  {appointment.metadata?.payment_status === 'paid' ? (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      ✅ Pagado
                    </span>
                  ) : appointment.metadata?.payment_status === 'pending' ? (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      ⏳ Pago Pendiente
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                      Sin Cobrar
                    </span>
                  )}
                </div>
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

              {appointment.status !== 'completed' && (
                <button
                  disabled={isUpdating}
                  onClick={() => handleStatusChange('completed')}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> Completar
                </button>
              )}

              {/* Botón de Pase a Caja POS (Solo visible si el módulo de Caja está habilitado) */}
              {isCajaEnabled && (
                <button
                  disabled={isUpdating}
                  onClick={async () => {
                    if (appointment.status !== 'completed') {
                      await handleStatusChange('completed');
                    }
                    const srvId = appointment.service_id || '';
                    const srvTitle = encodeURIComponent(appointment.title || appointment.service_name || 'Servicio de Cita');
                    const clientQuery = appointment.client_id ? `&client_id=${appointment.client_id}` : '';
                    window.location.href = `/caja?appointment_id=${appointment.id}${clientQuery}&service_id=${srvId}&price=${currentPrice}&title=${srvTitle}`;
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1"
                  title="Facturar en Punto de Venta POS y agregar extras"
                >
                  <DollarSign size={14} /> {appointment.status === 'completed' ? 'Cobrar en Caja' : 'Completar y Cobrar'}
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

          {/* Quick Payment Management (Sin necesidad de módulo de Caja) */}
          <div className="space-y-2 pt-3 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gestión de Cobro Directo</h5>
              <span className="text-[11px] text-slate-400">Sin depender de Caja</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={isUpdating || appointment.metadata?.payment_status === 'paid'}
                onClick={async () => {
                  if (!onUpdateMetadata) return;
                  setIsUpdating(true);
                  await onUpdateMetadata(appointment.id, {
                    ...appointment.metadata,
                    payment_status: 'paid',
                    paid_at: new Date().toISOString()
                  });
                  setIsUpdating(false);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  appointment.metadata?.payment_status === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
              >
                <CheckCircle2 size={14} />
                {appointment.metadata?.payment_status === 'paid' ? '¡Cobro Registrado!' : 'Marcar como Pagado'}
              </button>

              <button
                disabled={isUpdating || appointment.metadata?.payment_status === 'pending'}
                onClick={async () => {
                  if (!onUpdateMetadata) return;
                  setIsUpdating(true);
                  await onUpdateMetadata(appointment.id, {
                    ...appointment.metadata,
                    payment_status: 'pending'
                  });
                  setIsUpdating(false);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  appointment.metadata?.payment_status === 'pending'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 cursor-default'
                    : 'border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <AlertCircle size={14} />
                {appointment.metadata?.payment_status === 'pending' ? 'Pendiente Anotado' : 'Dejar Pago Pendiente'}
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={handleSendAppointmentWhatsApp}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Enviar recordatorio de cita vía WhatsApp"
            >
              <MessageCircle size={15} />
              <span>Recordatorio WhatsApp</span>
            </button>

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
