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
  Edit2,
  Lock,
  Unlock,
  Trash2,
  Building,
  ShieldAlert,
  QrCode,
  Share2,
  Copy,
  UserCheck
} from 'lucide-react';
import { Appointment, AppointmentStatus, Employee } from '@/types/calendario';
import { Entity } from '@/lib/api/entities';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { logExternalWhatsAppMessageAction } from '@/app/actions/whatsapp';
import { 
  addAttendeeToAppointmentAction, 
  removeAttendeeFromAppointmentAction,
  reassignAttendeeInAppointmentAction,
  updateAppointmentPriceAction,
  freeAppointmentSlotAction
} from '@/app/actions/appointments';
import { isModuleActive } from '@/lib/core/kernel/moduleRegistry';

export interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdateStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  clients?: Entity[];
  employees?: Employee[];
  onUpdateMetadata?: (id: string, metadata: Record<string, any>) => Promise<void>;
  onDeleteAppointment?: (id: string) => Promise<void>;
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
  employees = [],
  onUpdateMetadata,
  onDeleteAppointment,
}: AppointmentDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedClientToAdd, setSelectedClientToAdd] = useState('');
  const [reassigningAttendeeId, setReassigningAttendeeId] = useState<string | null>(null);
  const [newClientForReassign, setNewClientForReassign] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
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

  const handleDelete = async () => {
    if (!appointment || !onDeleteAppointment) return;
    const isBlock = appointment.metadata?.is_block === true;
    const confirmMsg = isBlock
      ? '¿Estás seguro de que deseas desbloquear y liberar este horario en la agenda?'
      : '¿Estás seguro de que deseas eliminar esta cita y liberar el turno?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDeleting(true);
      await onDeleteAppointment(appointment.id);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar el registro.');
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleReassignAttendee = async (oldAttendeeId: string) => {
    if (!newClientForReassign || !currentTenant || !actor) return;
    const client = clients.find(c => c.id === newClientForReassign);
    if (!client) return;

    try {
      setIsUpdating(true);
      const res = await reassignAttendeeInAppointmentAction(
        appointment.id,
        oldAttendeeId,
        { id: client.id, name: client.name, phone: client.phone || '' },
        currentTenant.id,
        actor
      );
      if (res.success && res.attendees) {
        if (onUpdateMetadata) {
          await onUpdateMetadata(appointment.id, { ...appointment.metadata, attendees: res.attendees });
        }
        setReassigningAttendeeId(null);
        setNewClientForReassign('');
      } else {
        alert(res.error || 'No se pudo reasignar el cupo.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al reasignar participante.');
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

  // ==========================================================
  // RENDER: VISTA DEDICADA DE BLOQUEO / MANTENIMIENTO
  // ==========================================================
  if (appointment.metadata?.is_block) {
    const isAllDay = appointment.metadata?.all_day === true;
    const blockReason = String(appointment.metadata?.block_type || appointment.title || 'Mantenimiento');
    const isEmpScope = !!appointment.employee_name && appointment.employee_name !== 'Sin Asignar';

    return (
      <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-card border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="border-b border-border p-5 bg-rose-50/70 dark:bg-rose-950/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-rose-700 dark:text-rose-400 tracking-tight">
                  Horario Inhabilitado
                </h3>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30 inline-block">
                  {blockReason}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-border p-4 rounded-2xl space-y-3">
              <h4 className="text-base font-black text-foreground">{appointment.title}</h4>

              <div className="space-y-2 text-xs">
                {/* Fechas / Horario */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <CalendarIcon size={14} className="text-rose-500 shrink-0" />
                  <span className="font-semibold">
                    {isAllDay
                      ? `Jornada Completa · ${formatDateTime(appointment.start_time).split(',')[0] || formatDateTime(appointment.start_time)}`
                      : `${formatDateTime(appointment.start_time)} ${appointment.end_time ? `hasta ${formatTimeOnly(appointment.end_time)}` : ''}`}
                  </span>
                </div>

                {/* Alcance */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  {isEmpScope ? (
                    <>
                      <User size={14} className="text-rose-500 shrink-0" />
                      <span>Profesional afectado: <strong className="text-foreground">{appointment.employee_name}</strong></span>
                    </>
                  ) : (
                    <>
                      <Building size={14} className="text-rose-500 shrink-0" />
                      <span>Alcance: <strong className="text-foreground">Toda la Empresa (Todos los especialistas)</strong></span>
                    </>
                  )}
                </div>
              </div>

              {appointment.notes && (
                <div className="pt-2 border-t border-border/60 text-xs">
                  <p className="font-bold text-slate-500 mb-1 flex items-center gap-1">
                    <FileText size={12} /> Notas del Bloqueo:
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-border">
                    {appointment.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
              <ShieldAlert size={16} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>
                Este horario no admite reservas del portal público ni citas internas de ningún canal mientras permanezca bloqueado.
              </span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col gap-2">
              {onDeleteAppointment && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-xs btn-haptic disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Unlock size={16} />
                  )}
                  <span>Desbloquear y Liberar Horario</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                <span className="text-sm">🎾</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Pista: <strong className="text-foreground">{appointment.location || (appointment.metadata as any)?.court_name || 'Sin Pista Asignada'}</strong></span>
                  {Boolean(appointment.metadata?.is_fixed_class) && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                      Clase Fija
                    </span>
                  )}
                  {Boolean(appointment.metadata?.is_slot_freed) && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200">
                      Pista Liberada
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 sm:col-span-2">
                <Briefcase size={14} className="text-slate-400 shrink-0" />
                <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                  <span>
                    Profesional / Encargado:{' '}
                    <strong className="text-foreground">
                      {appointment.employee_name || 'Sin Asignar'}
                    </strong>
                  </span>

                  {(!appointment.employee_name || appointment.employee_name === 'Sin Asignar') && employees.length > 0 && (
                    <select
                      className="text-[11px] font-bold px-2 py-1 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 outline-none"
                      onChange={async (e) => {
                        const empId = e.target.value;
                        if (!empId) return;
                        const emp = employees.find((x) => x.id === empId);
                        if (!emp || !onUpdateMetadata) return;
                        try {
                          setIsUpdating(true);
                          await onUpdateMetadata(appointment.id, {
                            ...appointment.metadata,
                            employee_id: emp.id,
                            employee_name: emp.name,
                            color: (emp.metadata as any)?.color || appointment.metadata?.color,
                          });
                        } finally {
                          setIsUpdating(false);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>
                        + Asignar Especialista / Doctor...
                      </option>
                      {employees.map((emp) => {
                        const spec =
                          (emp.metadata as any)?.doctor_config?.specialty ||
                          (emp.metadata as any)?.specialty ||
                          (emp.metadata as any)?.dentist_config?.specialty ||
                          (emp.metadata as any)?.role_title ||
                          (emp.role !== 'Empleado' ? emp.role : '');
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {spec ? `· ${spec}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsQrModalOpen(true)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all btn-haptic"
                      title="Compartir link por WhatsApp o mostrar código QR"
                    >
                      <QrCode size={13} /> Compartir / QR
                    </button>
                    <span className="text-xs font-semibold px-2 py-1 bg-white dark:bg-slate-900 rounded-md border border-slate-200">
                      {attendees.length} / {maxCapacity}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                  {attendees.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-300">
                      No hay alumnos inscritos en esta clase.
                    </p>
                  ) : (
                    attendees.map(a => {
                      const clientData = clients.find(c => c.id === a.id);
                      const debt = Number(clientData?.metadata?.debt_balance ?? clientData?.metadata?.current_debt ?? 0);
                      const hasDebt = debt > 0;
                      return (
                        <div key={a.id} className="flex flex-col gap-1.5 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">{a.name}</span>
                              {hasDebt ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
                                  Debe ${debt.toFixed(2)}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                                  Al Día
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={isUpdating}
                                onClick={() => setReassigningAttendeeId(reassigningAttendeeId === a.id ? null : a.id)}
                                className={`p-1 rounded-lg transition-colors text-[11px] flex items-center gap-0.5 ${
                                  reassigningAttendeeId === a.id 
                                    ? 'bg-indigo-100 text-indigo-700 font-bold' 
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                }`}
                                title="Reasignar cupo a otro alumno (por si reservó un amigo/familiar)"
                              >
                                <UserCheck size={14} />
                              </button>
                              <button
                                disabled={isUpdating}
                                onClick={() => handleRemoveAttendee(a.id)}
                                className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Remover alumno de la clase"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Selector de Reasignación en línea */}
                          {reassigningAttendeeId === a.id && (
                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs animate-in fade-in">
                              <select
                                value={newClientForReassign}
                                onChange={(e) => setNewClientForReassign(e.target.value)}
                                className="flex-1 px-2 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 dark:bg-slate-800 text-foreground"
                              >
                                <option value="">-- Seleccionar alumno real --</option>
                                {clients.filter(c => c.id !== a.id).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <button
                                disabled={!newClientForReassign || isUpdating}
                                onClick={() => handleReassignAttendee(a.id)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-bold text-xs shadow-xs"
                              >
                                Reasignar
                              </button>
                              <button
                                onClick={() => { setReassigningAttendeeId(null); setNewClientForReassign(''); }}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-lg text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Material y Equipamiento de la Clase */}
                <div className="pt-2 border-t border-fuchsia-200/50">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                    <span>🎾 Material & Equipamiento Asignado:</span>
                  </div>
                  <input
                    type="text"
                    defaultValue={(appointment.metadata?.equipment as string) || 'Carro de 72 pelotas presurizadas · Set de conos y escaleras'}
                    onBlur={(e) => {
                      if (onUpdateMetadata) {
                        onUpdateMetadata(appointment.id, {
                          ...appointment.metadata,
                          equipment: e.target.value
                        });
                      }
                    }}
                    placeholder="Ej. Carro de pelotas, 8 conos, palas de test..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white dark:bg-slate-900 focus:outline-none focus:border-fuchsia-400 font-medium text-slate-700 dark:text-slate-200"
                  />
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

              {/* Botón Liberar Cancha (Ceder Turno para esta fecha) */}
              {appointment.status !== 'cancelled' && (
                <button
                  disabled={isUpdating}
                  onClick={async () => {
                    const ok = window.confirm('¿Deseas liberar esta cancha para esta fecha? El espacio quedará disponible para agendar otra clase particular o alquiler libre.');
                    if (!ok || !currentTenant?.id || !actor) return;
                    try {
                      setIsUpdating(true);
                      await freeAppointmentSlotAction(appointment.id, currentTenant.id, 'Liberada por aviso de inasistencia', actor);
                      await onUpdateStatus(appointment.id, 'cancelled');
                      onClose();
                    } catch (e: any) {
                      alert(e?.message || 'Error al liberar cancha');
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-black border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 shadow-2xs"
                  title="Libera la pista inmediatamente para alquiler o particular"
                >
                  🎾 Liberar Cancha (Ceder Turno)
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
                  try {
                    setIsUpdating(true);
                    await onUpdateMetadata(appointment.id, {
                      ...appointment.metadata,
                      payment_status: 'paid',
                      paid_at: new Date().toISOString()
                    });
                  } catch (err) {
                    console.error('Error al registrar pago:', err);
                  } finally {
                    setIsUpdating(false);
                  }
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
                  try {
                    setIsUpdating(true);
                    await onUpdateMetadata(appointment.id, {
                      ...appointment.metadata,
                      payment_status: 'pending'
                    });
                  } catch (err) {
                    console.error('Error al actualizar estado de pago:', err);
                  } finally {
                    setIsUpdating(false);
                  }
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
          <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendAppointmentWhatsApp}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Enviar recordatorio de cita vía WhatsApp"
              >
                <MessageCircle size={15} />
                <span className="hidden sm:inline">Recordatorio WhatsApp</span>
                <span className="sm:hidden">WhatsApp</span>
              </button>

              {onDeleteAppointment && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Eliminar cita y liberar horario"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Eliminar</span>
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal Emergente de Código QR & Compartir en WhatsApp */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <QrCode size={18} className="text-emerald-600" /> Código QR & Link de la Clase
              </span>
              <button 
                onClick={() => setIsQrModalOpen(false)} 
                className="text-slate-400 hover:text-foreground p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl inline-block border border-slate-200 dark:border-slate-700 mx-auto shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  typeof window !== 'undefined' 
                    ? `${window.location.origin}/reservas/${currentTenant?.id || ''}`
                    : `https://saascore.app/reservas/${currentTenant?.id || ''}`
                )}`}
                alt="QR de Reserva de Clase"
                className="w-48 h-48 mx-auto object-contain rounded-xl"
              />
            </div>

            <div className="space-y-1 text-left bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 p-3 rounded-xl text-xs">
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                🎾 {appointment.location || (appointment.metadata?.court_name as string) || 'Cancha'}
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                {Math.max(0, maxCapacity - attendees.length)} cupo{Math.max(0, maxCapacity - attendees.length) !== 1 ? 's' : ''} libre{Math.max(0, maxCapacity - attendees.length) !== 1 ? 's' : ''} de {maxCapacity} disponibles
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/reservas/${currentTenant?.id || ''}`
                    : `https://saascore.app/reservas/${currentTenant?.id || ''}`;
                  const startD = new Date(appointment.start_time);
                  const fDate = startD.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
                  const fTime = startD.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true });
                  const cName = appointment.location || (appointment.metadata?.court_name as string) || 'Cancha';
                  const rem = Math.max(0, maxCapacity - attendees.length);

                  const msg = `🎾 *¡CLASE GRUPAL DE PÁDEL / TENIS!*
📅 *Día:* ${fDate}
⏰ *Hora:* ${fTime}
📍 *Lugar:* ${cName}
👥 *Cupos Disponibles:* ${rem} de ${maxCapacity}
📲 *Aparta tu cupo aquí:* ${shareUrl}

¡Nos vemos en la cancha! 🏆`;

                  try {
                    await navigator.clipboard.writeText(msg);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2500);
                  } catch {}
                }}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 transition-all btn-haptic"
              >
                {copiedText ? (
                  <>
                    <Check size={16} /> ¡Texto Copiado para WhatsApp!
                  </>
                ) : (
                  <>
                    <Share2 size={16} /> Copiar Mensaje para Grupo de WhatsApp
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  const shareUrl = typeof window !== 'undefined' 
                    ? `${window.location.origin}/reservas/${currentTenant?.id || ''}`
                    : `https://saascore.app/reservas/${currentTenant?.id || ''}`;
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2500);
                  } catch {}
                }}
                className="w-full py-2 px-4 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Copy size={14} /> Copiar Solo el Link Directo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
