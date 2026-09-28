'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { createAppointmentAction } from '@/app/actions/appointments';
import { getEntitiesAction } from '@/app/actions/entities';
import { ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

interface DentalScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    name: string;
    phone?: string | null;
  };
  tenantId: string;
  actor: ActionActor;
  procedureHint?: string;
  onSuccess: () => void;
}

export function DentalScheduleModal({
  isOpen,
  onClose,
  patient,
  tenantId,
  actor,
  procedureHint = 'Continuación de Tratamiento Dental',
  onSuccess,
}: DentalScheduleModalProps) {
  const { toast } = useToast();

  // Fecha predeterminada: 7 días en el futuro (típico tiempo de cicatrización o laboratorio)
  const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('09:00');
  const [durationMin, setDurationMin] = useState(45);
  const [title, setTitle] = useState(procedureHint);
  const [notes, setNotes] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTitle(procedureHint);
  }, [procedureHint]);

  // Cargar lista de odontólogos / especialistas
  useEffect(() => {
    async function loadSpecialists() {
      if (!isOpen || !tenantId || !actor) return;
      try {
        const res = await getEntitiesAction(tenantId, 'employee', 50, actor);
        if (res.success && res.entities) {
          setEmployees(res.entities.map(e => ({ id: e.id, name: e.name })));
          if (res.entities.length > 0 && !employeeId) {
            setEmployeeId(res.entities[0].id);
          }
        }
      } catch (err) {
        console.error('[DentalScheduleModal loadSpecialists]:', err);
      }
    }
    loadSpecialists();
  }, [isOpen, tenantId, actor]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time) {
      toast({ variant: 'warning', title: 'Fecha requerida', description: 'Por favor selecciona la fecha y hora de la cita.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const startTime = new Date(`${date}T${time}:00`).toISOString();

      const res = await createAppointmentAction(
        {
          title: title.trim() || 'Consulta Odontológica',
          start_time: startTime,
          duration_minutes: durationMin,
          client_id: patient.id,
          employee_id: employeeId || undefined,
          notes: notes.trim() || `Cita de seguimiento odontológico para ${patient.name}.`,
          status: 'confirmed',
          metadata: { channel: 'presencial' },
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Próxima Cita Agendada',
          description: `Se agendó la cita para ${patient.name} el ${date} a las ${time}.`,
        });
        onSuccess();
        onClose();
      } else {
        toast({
          variant: 'error',
          title: 'Error al agendar',
          description: res.error || 'No se pudo reservar el turno en la agenda.',
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error',
        description: (err as Error).message || 'Error de conexión al agendar cita.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-border bg-linear-to-r from-teal-500/10 via-cyan-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Agendar Próxima Consulta Odontológica
              </h3>
              <p className="text-xs text-slate-500">
                Paciente: <strong className="text-foreground">{patient.name}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Procedimiento o Motivo de la Cita
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Sesión 2 - Obturación definitiva de conductos"
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={13} /> Fecha
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock size={13} /> Hora
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Duración Estimada
              </label>
              <select
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              >
                <option value={20}>20 minutos (Control rápido)</option>
                <option value={30}>30 minutos (Ajuste / Retiro de puntos)</option>
                <option value={45}>45 minutos (Consulta estándar)</option>
                <option value={60}>60 minutos (1 Hora - Endodoncia / Corona)</option>
                <option value={90}>90 minutos (Cirugía compleja / Cirugía Implante)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={13} /> Odontólogo / Especialista
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs font-medium text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Cualquier especialista disponible</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    Dr(a). {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Instrucciones Previas o Indicaciones para el Paciente
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Tomar amoxicilina 1h antes, traer radiografía panorámica de control..."
              className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/3 py-2.5 border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-bold text-xs rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-2/3 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 btn-haptic disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Reservando turno...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirmar y Agendar Cita</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
