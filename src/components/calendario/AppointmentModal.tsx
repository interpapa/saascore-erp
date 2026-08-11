'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Briefcase, DollarSign, FileText, Check } from 'lucide-react';
import { CreateAppointmentInput, Employee, Service, AppointmentStatus } from '@/types/calendario';
import { Entity } from '@/lib/api/entities';

export interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateAppointmentInput) => Promise<void>;
  employees: Employee[];
  services: Service[];
  clients: Entity[];
  initialDate?: Date | null;
  initialTime?: string | null;
  initialClientId?: string | null;
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AppointmentModal({
  isOpen,
  onClose,
  onSave,
  employees,
  services,
  clients,
  initialDate,
  initialTime,
  initialClientId,
}: AppointmentModalProps) {
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [dateStr, setDateStr] = useState(toYYYYMMDD(new Date()));
  const [timeStr, setTimeStr] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [price, setPrice] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date();
      setDateStr(toYYYYMMDD(d));
      setTimeStr(initialTime || '09:00');
      setTitle('');
      setServiceId('');
      setClientId(initialClientId || '');
      setEmployeeId('');
      setDurationMinutes(60);
      setStatus('scheduled');
      setPrice(0);
      setNotes('');
      setFormError(null);
    }
  }, [isOpen, initialDate, initialTime, initialClientId]);

  if (!isOpen) return null;

  // Handle service selection change
  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const s = services.find((srv) => srv.id === id);
    if (s) {
      if (!title || title === s.name) setTitle(s.name);
      if (s.duration_minutes) setDurationMinutes(s.duration_minutes);
      if (s.price !== undefined) setPrice(s.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const apptTitle = title.trim() || (serviceId ? services.find((s) => s.id === serviceId)?.name || 'Cita de Servicio' : 'Cita de Servicio');

    try {
      setIsSubmitting(true);

      const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Fecha u hora inválida.');
      }
      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = new Date(startDateTime.getTime() + durationMinutes * 60000).toISOString();

      await onSave({
        title: apptTitle,
        service_id: serviceId || null,
        client_id: clientId || null,
        employee_id: employeeId || null,
        start_time: startTimeISO,
        end_time: endTimeISO,
        duration_minutes: durationMinutes,
        status,
        price: Number(price) || 0,
        notes: notes || null,
      });

      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Error al agendar cita.');
    } finally {
      setIsSubmitting(false);
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
          <div>
            <h3 className="text-xl font-black text-foreground tracking-tight">Agendar Cita / Turno</h3>
            <p className="text-xs text-slate-500 font-medium">Asigne servicio, profesional y horario</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {formError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          {/* Service Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Briefcase size={14} className="text-slate-400" /> Servicio
            </label>
            <select
              value={serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">-- Seleccionar Servicio (Opcional) --</option>
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} (${srv.price} • {srv.duration_minutes || 60} min)
                </option>
              ))}
            </select>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Título de la Cita *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Corte de Cabello + Barba"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          {/* Client & Employee Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Cliente
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">-- Seleccionar Cliente --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Employee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User size={14} className="text-slate-400" /> Profesional / Empleado
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">-- Sin Asignar --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date, Time & Duration Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <CalendarIcon size={14} className="text-slate-400" /> Fecha
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Time */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Clock size={14} className="text-slate-400" /> Hora
              </label>
              <input
                type="time"
                required
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Duración (min)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora (60 min)</option>
                <option value={90}>1.5 horas (90 min)</option>
                <option value={120}>2 horas (120 min)</option>
              </select>
            </div>
          </div>

          {/* Status & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Estado Inicial
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="scheduled">Programada</option>
                <option value="confirmed">Confirmada</option>
                <option value="in_progress">En Curso</option>
                <option value="completed">Completada</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign size={14} className="text-slate-400" /> Precio / Valor ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" /> Observaciones / Notas
            </label>
            <textarea
              rows={3}
              placeholder="Detalles adicionales o solicitudes del cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 shadow-sm btn-haptic disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Guardar Cita
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
