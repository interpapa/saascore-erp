'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar as CalendarIcon, Clock, User, Briefcase, DollarSign, 
  FileText, Check, Lock, CalendarRange, Building, Palmtree, Coffee, 
  Wrench, ShieldAlert, Sparkles, CheckCircle2 
} from 'lucide-react';
import { CreateAppointmentInput, BlockInput, Employee, Service, AppointmentStatus, CourtResource, DEFAULT_SPORTS_COURTS } from '@/types/calendario';
import { Entity } from '@/lib/api/entities';
import { AGENDA_20_COLORS, DEFAULT_AGENDA_COLOR } from '@/lib/calendario/calendarColors';
import { matchesEmployeeService } from '@/lib/services/serviceMatching';

export interface AppointmentModalProps {
  isOpen: boolean;
  type?: 'appointment' | 'block';
  onClose: () => void;
  onSave: (input: CreateAppointmentInput) => Promise<void>;
  onSaveBlock?: (input: BlockInput) => Promise<void>;
  employees: Employee[];
  services: Service[];
  clients: Entity[];
  courts?: CourtResource[];
  initialDate?: Date | null;
  initialTime?: string | null;
  initialClientId?: string | null;
  initialLocation?: string | null;
}

export const BLOCK_PRESETS = [
  { label: 'Mantenimiento General', icon: '🔧', color: '#f43f5e' },
  { label: 'Feriado / Festivo', icon: '🎉', color: '#8b5cf6' },
  { label: 'Vacaciones', icon: '🏖️', color: '#0284c7' },
  { label: 'Almuerzo / Pausa', icon: '🍽️', color: '#f59e0b' },
  { label: 'Permiso Médico', icon: '🩺', color: '#10b981' },
  { label: 'Capacitación', icon: '📚', color: '#6366f1' },
  { label: 'Remodelación / Obra', icon: '🏗️', color: '#d946ef' },
  { label: 'Cierre Temporal', icon: '🔒', color: '#ef4444' },
];

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function AppointmentModal({
  isOpen,
  type = 'appointment',
  onClose,
  onSave,
  onSaveBlock,
  employees,
  services,
  clients,
  courts,
  initialDate,
  initialTime,
  initialClientId,
  initialLocation,
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
  const [isGroupClass, setIsGroupClass] = useState(false);
  const [customClientName, setCustomClientName] = useState('');
  const [color, setColor] = useState(DEFAULT_AGENDA_COLOR);
  const [location, setLocation] = useState(initialLocation || '');
  const [customLocation, setCustomLocation] = useState('');
  const [isFixedClass, setIsFixedClass] = useState(false);
  const hasCourts = Boolean(courts && courts.length > 0);

  // Estados dedicados para Bloqueo / Mantenimiento
  const [blockMode, setBlockMode] = useState<'hours' | 'full_day' | 'multi_day'>('full_day');
  const [blockScope, setBlockScope] = useState<'all' | 'employee'>('all');
  const [blockReasonType, setBlockReasonType] = useState('Mantenimiento General');
  const [blockStartDate, setBlockStartDate] = useState(toYYYYMMDD(new Date()));
  const [blockEndDate, setBlockEndDate] = useState(toYYYYMMDD(new Date()));

  useEffect(() => {
    if (isOpen) {
      const d = initialDate || new Date();
      const dateFormatted = toYYYYMMDD(d);
      setDateStr(dateFormatted);
      setTimeStr(initialTime || '09:00');
      setLocation(initialLocation || '');
      setCustomLocation('');
      setIsFixedClass(false);
      
      setServiceId('');
      setClientId(initialClientId || '');
      setCustomClientName('');
      setEmployeeId('');
      setDurationMinutes(60);
      setStatus('scheduled');
      setPrice(0);
      setNotes('');
      setFormError(null);

      // Inicialización para bloqueos
      setBlockMode('full_day');
      setBlockScope('all');
      setBlockReasonType('Mantenimiento General');
      setBlockStartDate(dateFormatted);
      setBlockEndDate(dateFormatted);

      if (type === 'block') {
        setTitle('Mantenimiento General');
        setColor('#f43f5e');
      } else {
        setTitle('');
        setColor(DEFAULT_AGENDA_COLOR);
      }
    }
  }, [isOpen, initialDate, initialTime, initialClientId, type]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Handle service selection change
  const handleServiceChange = (id: string) => {
    setServiceId(id);

    // Si es la rama o consulta general del colaborador
    if (id.startsWith('emp-branch-')) {
      const branchTitle = id.replace('emp-branch-', '');
      const emp = employees.find(e => e.id === employeeId);
      const prc = Number((emp?.metadata as any)?.general_service_price) || 0;
      const dur = Number((emp?.metadata as any)?.default_slot_minutes || (emp?.metadata as any)?.general_slot_minutes) || 60;
      setTitle(branchTitle);
      setDurationMinutes(dur);
      setPrice(prc);
      return;
    }

    // Si es un procedimiento particular configurado en la ficha del colaborador
    if (id.startsWith('emp-svc-')) {
      const svcName = id.replace('emp-svc-', '');
      const emp = employees.find(e => e.id === employeeId);
      const empSvcs = (emp?.metadata as any)?.services as Array<{ name: string; durationMinutes?: number; price?: number }> | undefined;
      const match = empSvcs?.find(s => s.name === svcName);
      if (match) {
        setTitle(match.name);
        setDurationMinutes(Number(match.durationMinutes) || 45);
        setPrice(Number(match.price) || 0);
      }
      return;
    }

    const s = services.find((srv) => srv.id === id);
    if (s) {
      if (!title || title === s.name) setTitle(s.name);
      let dur = s.duration_minutes || 60;
      let prc = s.price !== undefined ? s.price : 0;
      
      // Si no hay empleado seleccionado, intentar vincular automáticamente al especialista de esa rama
      let activeEmpId = employeeId;
      if (!activeEmpId) {
        const matchedEmp = employees.find(emp => matchesEmployeeService(emp, s.name));
        if (matchedEmp) {
          activeEmpId = matchedEmp.id;
          setEmployeeId(matchedEmp.id);
          if (typeof (matchedEmp.metadata as any)?.color === 'string' && (matchedEmp.metadata as any).color) {
            setColor((matchedEmp.metadata as any).color);
          }
        }
      }

      // Si ya hay un empleado seleccionado, ver si tiene tarifa o duración personalizada
      if (activeEmpId) {
        const emp = employees.find(e => e.id === activeEmpId);
        const empSvcs = (emp?.metadata as any)?.services as Array<{ name: string; durationMinutes?: number; price?: number }> | undefined;
        if (empSvcs) {
          const match = empSvcs.find(es => es.name?.trim().toLowerCase() === s.name.trim().toLowerCase());
          if (match) {
            if (match.durationMinutes) dur = match.durationMinutes;
            if (match.price !== undefined && match.price > 0) prc = match.price;
          }
        }
      }
      
      setDurationMinutes(dur);
      setPrice(prc);
      
      const isGroup = !!s.metadata?.is_group_session;
      setIsGroupClass(isGroup);
    }
  };

  const handleEmployeeChange = (empId: string) => {
    setEmployeeId(empId);
    if (!empId) return;
    const emp = employees.find(e => e.id === empId);
    if (typeof emp?.metadata?.color === 'string' && emp.metadata.color) {
      setColor(emp.metadata.color);
    }
    const srv = services.find(s => s.id === serviceId);
    if (emp && srv) {
      const empSvcs = (emp?.metadata as any)?.services as Array<{ name: string; durationMinutes?: number; price?: number }> | undefined;
      if (empSvcs) {
        const match = empSvcs.find(es => es.name?.trim().toLowerCase() === srv.name.trim().toLowerCase());
        if (match) {
          if (match.durationMinutes) setDurationMinutes(match.durationMinutes);
          if (match.price !== undefined && match.price > 0) setPrice(match.price);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (type === 'block') {
      try {
        setIsSubmitting(true);
        if (blockMode === 'multi_day') {
          if (!blockStartDate || !blockEndDate) {
            throw new Error('Debes indicar fecha inicial y fecha final.');
          }
          if (blockStartDate > blockEndDate) {
            throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
          }
        }

        const blockPayload: BlockInput = {
          title: title.trim() || blockReasonType,
          reasonType: blockReasonType,
          scope: blockScope,
          employeeId: blockScope === 'employee' ? (employeeId || null) : null,
          mode: blockMode,
          date: dateStr,
          startTime: timeStr,
          durationMinutes,
          startDate: blockStartDate,
          endDate: blockEndDate,
          notes: notes.trim() || undefined,
          color: color || '#f43f5e',
        };

        if (onSaveBlock) {
          await onSaveBlock(blockPayload);
        } else {
          const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
          await onSave({
            title: blockPayload.title,
            employee_id: blockPayload.employeeId || null,
            start_time: startDateTime.toISOString(),
            end_time: new Date(startDateTime.getTime() + durationMinutes * 60000).toISOString(),
            duration_minutes: durationMinutes,
            status: 'scheduled',
            price: 0,
            notes: notes || null,
            metadata: {
              is_block: true,
              block_type: blockReasonType,
              color: color || '#f43f5e',
            },
          });
        }

        onClose();
      } catch (err: unknown) {
        setFormError((err as Error).message || 'Error al procesar el bloqueo.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const apptTitle = title.trim() || (serviceId ? services.find((s) => s.id === serviceId)?.name || 'Cita de Servicio' : 'Cita de Servicio');

    try {
      setIsSubmitting(true);

      const startDateTime = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Fecha u hora inválida.');
      }

      const now = new Date();
      const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const selectedDateOnly = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate());
      if (selectedDateOnly < todayDateOnly) {
        throw new Error('No es posible agendar en una fecha que ya ha transcurrido.');
      }
      if (selectedDateOnly.getTime() === todayDateOnly.getTime() && startDateTime.getTime() < now.getTime() - 5 * 60000) {
        throw new Error('El horario seleccionado para hoy ya ha transcurrido.');
      }

      const startTimeISO = startDateTime.toISOString();
      const endTimeISO = new Date(startDateTime.getTime() + durationMinutes * 60000).toISOString();

      const courtLocation = location === 'custom' ? customLocation.trim() : location.trim();

      let appointmentMetadata: Record<string, unknown> = {
        color: color || DEFAULT_AGENDA_COLOR,
        location: courtLocation || null,
        court_name: courtLocation || null,
        is_fixed_class: isFixedClass,
      };
      if (isGroupClass || isFixedClass) {
        const s = services.find((srv) => srv.id === serviceId);
        appointmentMetadata.is_group_class = true;
        appointmentMetadata.max_capacity = s?.metadata?.max_capacity || 4;
        appointmentMetadata.attendees = [];
        appointmentMetadata.equipment = 'Carro de 72 pelotas presurizadas · Set de conos y escaleras';
      }
      if (customClientName.trim()) {
        appointmentMetadata.client_name = customClientName.trim();
      }

      await onSave({
        title: apptTitle,
        service_id: serviceId || null,
        client_id: (isGroupClass || clientId === 'manual') ? null : (clientId || null),
        employee_id: employeeId || null,
        location: courtLocation || null,
        start_time: startTimeISO,
        end_time: endTimeISO,
        duration_minutes: durationMinutes,
        status,
        price: Number(price) || 0,
        notes: notes || null,
        metadata: appointmentMetadata
      });

      onClose();
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Error al agendar cita.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cálculo de días para bloqueos multi-día
  const calculateDaysDiff = () => {
    if (!blockStartDate || !blockEndDate) return 1;
    const start = new Date(blockStartDate);
    const end = new Date(blockEndDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 0;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = calculateDaysDiff();

  return (
    <div 
      className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-hidden"
      onClick={() => { if (!isSubmitting) onClose(); }}
    >
      <div
        className="bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`shrink-0 border-b border-border p-4 sm:p-5 flex items-center justify-between ${type === 'block' ? 'bg-rose-50/70 dark:bg-rose-950/30' : 'bg-slate-50/50 dark:bg-slate-900/50'}`}>
          <div className="flex items-center gap-3">
            {type === 'block' && (
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-xs">
                <Lock size={20} />
              </div>
            )}
            <div>
              <h3 className={`text-xl font-black tracking-tight ${type === 'block' ? 'text-rose-700 dark:text-rose-400' : 'text-foreground'}`}>
                {type === 'block' ? 'Bloqueo / Mantenimiento' : 'Agendar Cita / Turno'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {type === 'block' 
                  ? 'Inhabilita horarios, pausas o días completos' 
                  : 'Asigne servicio, profesional y horario'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form con contenedor con scroll y footer sticky */}
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                {formError}
              </div>
            )}

          {/* ======================================================== */}
          {/* VISTA ESPECÍFICA DE BLOQUEO / MANTENIMIENTO               */}
          {/* ======================================================== */}
          {type === 'block' ? (
            <>
              {/* 1. Selector de Modo: Horas vs Día Completo vs Varios Días */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tipo de Bloqueo
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBlockMode('hours')}
                    className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      blockMode === 'hours'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <Clock size={13} /> Por Horas
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockMode('full_day')}
                    className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      blockMode === 'full_day'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <CalendarIcon size={13} /> 1 Día
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockMode('multi_day')}
                    className={`py-2 px-1 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      blockMode === 'multi_day'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-slate-500 hover:text-foreground'
                    }`}
                  >
                    <CalendarRange size={13} /> Varios Días
                  </button>
                </div>
              </div>

              {/* 2. Chips Rápidos de Motivo / Preset */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Motivo Frecuente</span>
                  <span className="text-[10px] text-slate-400">1 clic para preconfigurar</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BLOCK_PRESETS.map((preset) => {
                    const isSelected = blockReasonType === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setBlockReasonType(preset.label);
                          if (!title || BLOCK_PRESETS.some(p => p.label === title)) {
                            setTitle(preset.label);
                          }
                          setColor(preset.color);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-xs ring-1 ring-rose-500/30'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Alcance del Bloqueo (Toda la Empresa vs Profesional Específico) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  ¿A quién afecta este bloqueo?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBlockScope('all');
                      setEmployeeId('');
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      blockScope === 'all'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30'
                        : 'bg-card border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <Building size={14} className="text-rose-500" />
                      Toda la Empresa
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Cierra agenda y reservas online para todos los especialistas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockScope('employee')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      blockScope === 'employee'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30'
                        : 'bg-card border-border text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-black text-xs">
                      <User size={14} className="text-rose-500" />
                      Profesional Específico
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Inhabilita solo al especialista seleccionado.
                    </p>
                  </button>
                </div>

                {/* Selector de empleado condicional */}
                {blockScope === 'employee' && (
                  <div className="pt-1.5 animate-in fade-in duration-150">
                    <select
                      value={employeeId}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-medium"
                    >
                      <option value="">-- Seleccionar Profesional a Bloquear * --</option>
                      {employees.map((emp) => {
                        const spec = 
                          (emp.metadata as any)?.doctor_config?.specialty || 
                          (emp.metadata as any)?.specialty || 
                          (emp.metadata as any)?.role_title || 
                          emp.role;
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {spec ? `· ${spec}` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {/* 4. Fechas y Horarios según Modo */}
              {blockMode === 'multi_day' ? (
                <div className="space-y-2 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <CalendarIcon size={12} className="text-rose-500" /> Desde (Fecha Inicio) *
                      </label>
                      <input
                        type="date"
                        required
                        value={blockStartDate}
                        onChange={(e) => setBlockStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                        <CalendarIcon size={12} className="text-rose-500" /> Hasta (Fecha Fin) *
                      </label>
                      <input
                        type="date"
                        required
                        min={blockStartDate}
                        value={blockEndDate}
                        onChange={(e) => setBlockEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-card border border-border text-xs sm:text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 pt-1">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>
                      {daysCount > 0 
                        ? `Se inhabilitarán ${daysCount} día(s) completo(s) consecutivos en agenda.` 
                        : 'Fecha inválida.'}
                    </span>
                  </div>
                </div>
              ) : blockMode === 'full_day' ? (
                <div className="space-y-2 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarIcon size={13} className="text-rose-500" /> Fecha del Día Completo *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                    ⚡ Se bloqueará toda la jornada de 00:00 a 23:59. Nadie podrá reservar este día.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <CalendarIcon size={13} className="text-slate-400" /> Fecha *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Clock size={13} className="text-slate-400" /> Hora Inicio *
                    </label>
                    <input
                      type="time"
                      required
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Duración
                    </label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value={30}>30 min</option>
                      <option value={45}>45 min</option>
                      <option value={60}>1 hora (60 min)</option>
                      <option value={90}>1.5 horas</option>
                      <option value={120}>2 horas</option>
                      <option value={180}>3 horas</option>
                      <option value={240}>4 horas (Medio día)</option>
                      <option value={480}>8 horas (Jornada)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 5. Título o Detalle del Bloqueo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Título Visible en la Agenda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mantenimiento Técnico, Feriado Nacional, Almuerzo"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 font-semibold"
                />
              </div>
            </>
          ) : (
            /* ======================================================== */
            /* VISTA NORMAL DE AGENDAR CITA / TURNO                     */
            /* ======================================================== */
            <>
              {/* Service Selector */}
              {(() => {
                const selectedEmp = employees.find(e => e.id === employeeId);
                const employeeParticularServices = ((selectedEmp?.metadata as any)?.services || []) as Array<{ id?: string; name: string; durationMinutes?: number; price?: number }>;
                const empRoleTitle = ((selectedEmp?.metadata as any)?.role_title || selectedEmp?.role || '').trim();
                const empGeneralName = ((selectedEmp?.metadata as any)?.general_service_name || '').trim();
                const branchName = empGeneralName || (empRoleTitle && empRoleTitle !== 'Espacio / Recurso' && empRoleTitle !== 'Especialista' ? empRoleTitle : '');

                return (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Briefcase size={14} className="text-slate-400" /> Procedimiento / Servicio
                    </label>
                    <select
                      value={serviceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
                    >
                      <option value="">
                        {employeeParticularServices.length > 0 || branchName || services.length > 0
                          ? '-- Seleccionar Procedimiento (O escribe el título abajo) --'
                          : '-- Personalizado (Escribe el título y duración abajo) --'}
                      </option>
                      {(employeeParticularServices.length > 0 || branchName) && (
                        <optgroup label={`Procedimientos y Rama de ${selectedEmp?.name || 'Profesional'}`}>
                          {branchName && !employeeParticularServices.some(ps => ps.name.toLowerCase() === branchName.toLowerCase()) && (
                            <option value={`emp-branch-${branchName}`}>
                              {branchName} {Number((selectedEmp?.metadata as any)?.general_service_price) > 0 ? `($${(selectedEmp?.metadata as any)?.general_service_price})` : ''} ({Number((selectedEmp?.metadata as any)?.default_slot_minutes || 60)} min)
                            </option>
                          )}
                          {employeeParticularServices.map((ps, idx) => (
                            <option key={`emp-svc-${idx}`} value={`emp-svc-${ps.name}`}>
                              {ps.name} {ps.price !== undefined && ps.price > 0 ? `($${ps.price})` : ''} ({ps.durationMinutes || 45} min)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {services.length > 0 && (
                        <optgroup label="Servicios del Catálogo">
                          {services.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              {srv.name} (${srv.price} • {srv.duration_minutes || 60} min)
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                );
              })()}

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

              {/* Academy / Group Class Toggle */}
              <div className="flex items-center gap-3 p-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800">
                <input 
                  type="checkbox" 
                  checked={isGroupClass} 
                  onChange={(e) => setIsGroupClass(e.target.checked)} 
                  id="isGroupClass"
                  className="w-4 h-4 text-fuchsia-600 rounded border-fuchsia-300 focus:ring-fuchsia-500 cursor-pointer"
                />
                <div className="flex-1">
                  <label htmlFor="isGroupClass" className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-300 cursor-pointer">
                    Habilitar Modo Academia (Clase Grupal)
                  </label>
                  <p className="text-[10px] text-fuchsia-700 dark:text-fuchsia-400">
                    Al activar esto, no seleccionarás un cliente ahora. Podrás inscribir a múltiples alumnos desde los detalles de la clase.
                  </p>
                </div>
              </div>

              {/* Client & Employee Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client */}
                <div className={isGroupClass ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={14} className="text-slate-400" /> Cliente
                    </span>
                    {clients.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (clientId === 'manual') {
                            setClientId('');
                            setCustomClientName('');
                          } else {
                            setClientId('manual');
                          }
                        }}
                        className="text-[11px] text-primary hover:underline font-bold"
                      >
                        {clientId === 'manual' ? 'Elegir del directorio' : 'Escribir manual'}
                      </button>
                    )}
                  </label>
                  {clients.length > 0 && clientId !== 'manual' ? (
                    <select
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      disabled={isGroupClass}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">{isGroupClass ? 'Múltiples alumnos (Modo Academia)' : '-- Seleccionar Cliente del Directorio --'}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Escribe el nombre del cliente o teléfono..."
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    />
                  )}
                </div>

                {/* Employee */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" /> Profesional / Empleado
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  >
                    <option value="">-- Sin Asignar --</option>
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
                </div>
              </div>

              {/* Cancha / Pista (Recurso Físico) o Ubicación General */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    {hasCourts ? '🎾 Pista / Cancha Asignada' : '📍 Ubicación / Espacio (Opcional)'}
                  </label>
                  {isFixedClass && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                      {hasCourts ? 'Clase Fija Semanal' : 'Turno Fijo'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium"
                  >
                    <option value="">{hasCourts ? '-- Sin Cancha Específica --' : '-- Sin Ubicación Específica --'}</option>
                    {hasCourts && (courts || []).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name} {c.type ? `(${c.type})` : ''}
                      </option>
                    ))}
                    <option value="custom">
                      {hasCourts ? '✏️ Escribir otra pista o espacio...' : '✏️ Escribir consultorio, sillón, cabina o sala...'}
                    </option>
                  </select>

                  {location === 'custom' ? (
                    <input
                      type="text"
                      placeholder={hasCourts ? 'Ej: Pista Central Exterior...' : 'Ej: Consultorio 2, Sillón 1...'}
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  ) : (
                    <div className="text-[11px] text-slate-400 flex items-center px-1">
                      {location ? `Asignada a ${location}` : (hasCourts ? 'Selecciona una pista para evitar choques.' : 'Opcional')}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={isFixedClass}
                    onChange={(e) => setIsFixedClass(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {hasCourts
                      ? 'Marcar como Clase Fija Recurrente (Bloquea la pista para los mismos alumnos semanalmente)'
                      : 'Marcar como Turno Fijo Recurrente (Bloquea este horario semanalmente)'}
                  </span>
                </label>
              </div>

              {/* Date & Time Row (Duración automática según procedimiento/especialista) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <CalendarIcon size={14} className="text-slate-400" /> Fecha
                  </label>
                  <input
                    type="date"
                    required
                    min={toYYYYMMDD(new Date())}
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

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
              </div>

              {/* Status & Price Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-slate-400" /> Precio / Monto ($)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Editable / Libre</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price === 0 ? '' : price}
                    onChange={(e) => setPrice(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))}
                    placeholder="0.00 (Precio libre)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Puedes ajustarlo para tratamientos específicos o dejarlo en $0 para valorarlo en caja.</p>
                </div>
              </div>
            </>
          )}

          {/* Paleta Protegida de 20 Colores para la Agenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Color de Identificación en Agenda
              </label>
              <span className="text-[10px] text-slate-400">
                20 tonos protegidos (no chocan con estados)
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-10 gap-1.5 justify-items-center">
                {AGENDA_20_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-125 flex items-center justify-center shadow-xs cursor-pointer ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {color === c.hex && <Check size={12} className="text-white drop-shadow-sm" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <FileText size={14} className="text-slate-400" /> Observaciones / Notas
            </label>
            <textarea
              rows={2}
              placeholder={type === 'block' ? 'Detalles del motivo del bloqueo...' : 'Detalles adicionales o solicitudes del cliente...'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>

        {/* Actions Sticky Footer (Siempre visible sin depender de scroll o rueda de ratón) */}
        <div className="shrink-0 p-4 sm:px-6 bg-slate-50/90 dark:bg-slate-900/90 border-t border-border flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 shadow-sm btn-haptic disabled:opacity-50 ${
                type === 'block'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : type === 'block' ? (
                <Lock size={15} />
              ) : (
                <Check size={16} />
              )}
              {type === 'block' 
                ? (blockMode === 'multi_day' ? `Bloquear ${daysCount} Día(s)` : 'Confirmar Bloqueo')
                : 'Guardar Cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
