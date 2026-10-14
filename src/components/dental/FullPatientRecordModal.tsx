'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  FileText, 
  Activity, 
  Calendar, 
  Clock, 
  ShieldAlert, 
  Heart, 
  Pill, 
  AlertTriangle, 
  CheckCircle2, 
  KanbanSquare, 
  DollarSign, 
  UserCheck, 
  CalendarDays, 
  FolderOpen, 
  ChevronRight,
  Stethoscope,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Entity } from '@/lib/api/entities';
import { DentalChart, DentalEvolutionEntry, PatientDentalWorkOrder } from '@/app/actions/dental';
import { ActionActor } from '@/app/actions/entities';
import { ClientRecordsTab } from '@/components/clients/ClientRecordsTab';

interface FullPatientRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Entity | null;
  chart?: DentalChart;
  evolutions: DentalEvolutionEntry[];
  workOrders: PatientDentalWorkOrder[];
  appointments: any[];
  tenantId: string;
  actor: ActionActor;
  onOpenEditProfile: () => void;
  onOpenSchedule: () => void;
  onRefresh?: () => void;
}

type RecordTab = 'resumen' | 'evoluciones' | 'plan_odontograma' | 'ordenes_trabajo' | 'citas' | 'archivos';

export function FullPatientRecordModal({
  isOpen,
  onClose,
  patient,
  chart,
  evolutions,
  workOrders,
  appointments,
  tenantId,
  actor,
  onOpenEditProfile,
  onOpenSchedule,
  onRefresh,
}: FullPatientRecordModalProps) {
  const [activeTab, setActiveTab] = useState<RecordTab>('resumen');

  const meta = useMemo(() => {
    return (patient?.metadata as Record<string, any>) || {};
  }, [patient]);

  const calculatedAge = useMemo(() => {
    if (!meta.birth_date) return null;
    const diff = Date.now() - new Date(meta.birth_date).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }, [meta.birth_date]);

  const debt = Number(meta.total_debt || meta.pending_debt || 0);

  const treatments = useMemo(() => {
    return chart?.treatmentPlan?.procedures || [];
  }, [chart]);

  const completedTreatments = useMemo(() => {
    return treatments.filter((t) => t.completed);
  }, [treatments]);

  const pendingTreatments = useMemo(() => {
    return treatments.filter((t) => !t.completed);
  }, [treatments]);

  const totalBudgetUSD = useMemo(() => {
    return treatments.reduce((acc, t) => acc + (Number(t.estimatedCost) || 0), 0);
  }, [treatments]);

  const completedBudgetUSD = useMemo(() => {
    return completedTreatments.reduce((acc, t) => acc + (Number(t.estimatedCost) || 0), 0);
  }, [completedTreatments]);

  const patientAppointments = useMemo(() => {
    if (!patient?.id) return [];
    return appointments.filter(
      (a) => a.client_id === patient.id || a.entity_id === patient.id
    );
  }, [appointments, patient?.id]);

  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in" 
        onClick={onClose} 
      />

      {/* Ventana Modal Panorámica */}
      <div className="relative w-full max-w-5xl h-[90vh] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CABECERA PRINCIPAL DEL EXPEDIENTE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-teal-500/20 shrink-0">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-foreground">{patient.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Expediente Clínico Odontológico
                </span>
                {debt > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/10 text-red-600 border border-red-500/20">
                    Saldo Deudor: ${debt.toFixed(2)}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Al día
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                {patient.tax_id && <span>C.I: <strong className="font-mono text-foreground">{patient.tax_id}</strong></span>}
                {calculatedAge !== null && <span>Edad: <strong className="text-foreground">{calculatedAge} años</strong></span>}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} className="text-teal-500" />
                    <strong className="font-mono text-foreground">{patient.phone}</strong>
                  </span>
                )}
                {patient.email && <span>Email: {patient.email}</span>}
              </div>
            </div>
          </div>

          {/* Acciones de la Cabecera */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs btn-haptic"
              title="Imprimir expediente clínico"
            >
              <Printer size={14} className="text-teal-500" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onOpenEditProfile}
              className="px-3 py-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-xs font-bold transition-all border border-teal-500/20 flex items-center gap-1.5 btn-haptic"
            >
              <UserCheck size={14} />
              <span>Editar Ficha</span>
            </button>

            <button
              type="button"
              onClick={onOpenSchedule}
              className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-1.5 btn-haptic shadow-xs"
            >
              <CalendarDays size={14} />
              <span>+ Agendar Cita</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            BARRA DE PESTAÑAS DEL EXPEDIENTE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="px-4 sm:px-6 pt-2 border-b border-border bg-card flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'resumen', label: 'Resumen & Anamnesis', icon: FileText },
            { id: 'evoluciones', label: `Evoluciones (${evolutions.length})`, icon: Activity },
            { id: 'plan_odontograma', label: `Tratamientos (${treatments.length})`, icon: Stethoscope },
            { id: 'ordenes_trabajo', label: `Laboratorio & OTs (${workOrders.length})`, icon: KanbanSquare },
            { id: 'citas', label: `Citas (${patientAppointments.length})`, icon: Calendar },
            { id: 'archivos', label: 'Radiografías & Archivos', icon: FolderOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as RecordTab)}
              className={`px-3.5 py-2.5 text-xs font-black transition-all border-b-2 flex items-center gap-2 whitespace-nowrap btn-haptic ${
                activeTab === tab.id
                  ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-foreground'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CUERPO MODULAR CON SCROLL
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: RESUMEN GENERAL & ANAMNESIS */}
          {activeTab === 'resumen' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Alerta Médica Destacada */}
              <div className={`p-4 rounded-2xl border ${
                meta.allergies 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : 'bg-emerald-500/5 border-emerald-500/20'
              }`}>
                <div className="flex items-center gap-2.5">
                  <ShieldAlert size={18} className={meta.allergies ? 'text-rose-500' : 'text-emerald-500'} />
                  <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                    Alertas Clínicas & Factores de Riesgo
                  </h4>
                </div>
                <div className="mt-2 text-xs font-semibold leading-relaxed">
                  {meta.allergies ? (
                    <p className="text-rose-600 dark:text-rose-400 font-bold">
                      ⚠️ ALERGIAS: {meta.allergies}
                    </p>
                  ) : (
                    <p className="text-slate-500">Sin alergias medicamentosas declaradas.</p>
                  )}
                  {meta.systemic_diseases && (
                    <p className="text-foreground mt-1">
                      <strong>Patologías Sistémicas:</strong> {meta.systemic_diseases}
                    </p>
                  )}
                  {meta.current_medication && (
                    <p className="text-foreground mt-1">
                      <strong>Medicación Habitual:</strong> {meta.current_medication}
                    </p>
                  )}
                  {meta.anticoagulants && (
                    <p className="text-amber-600 font-bold mt-1">
                      ⚠️ Anticoagulantes / Antiagregantes: {meta.anticoagulants}
                    </p>
                  )}
                  {meta.pregnant_or_nursing && (
                    <p className="text-pink-600 font-bold mt-1">
                      🤰 Paciente en estado de Gestación o Lactancia
                    </p>
                  )}
                </div>
              </div>

              {/* Grid 2 Columnas: Antecedentes e Información de Contacto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Antecedentes Médicos Detallados */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-600 flex items-center gap-2">
                    <Heart size={14} />
                    <span>Anamnesis Estomatológica</span>
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-slate-400">Hábitos (Tabaco, Bruxismo):</span>
                      <span className="font-bold text-foreground">{meta.habits || 'Ninguno reportado'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-slate-400">Contacto de Emergencia:</span>
                      <span className="font-bold text-foreground">
                        {meta.emergency_contact || 'No registrado'} {meta.emergency_phone ? `(${meta.emergency_phone})` : ''}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-slate-400">Última Revisión Médica:</span>
                      <span className="font-bold text-foreground font-mono">
                        {meta.last_medical_review ? new Date(meta.last_medical_review).toLocaleDateString() : 'No registrada'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-1">Notas Clínicas Adicionales:</span>
                      <p className="text-foreground font-medium bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-border/50 text-xs">
                        {meta.clinical_notes || meta.notes || 'Sin notas especiales de antecedentes.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resumen Financiero y Métricas del Paciente */}
                <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-teal-600 flex items-center gap-2">
                    <DollarSign size={14} />
                    <span>Resumen de Tratamientos & Balance</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Presupuestado</span>
                      <span className="text-base font-black text-foreground font-mono">
                        ${totalBudgetUSD.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-600 font-bold uppercase block">Tratamientos Listos</span>
                      <span className="text-base font-black text-emerald-600 font-mono">
                        ${completedBudgetUSD.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Evoluciones Realizadas</span>
                      <span className="text-base font-black text-foreground font-mono">
                        {evolutions.length} consultas
                      </span>
                    </div>
                    <div className={`p-3 rounded-xl border ${
                      debt > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <span className={`text-[10px] font-bold uppercase block ${debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        Saldo Pendiente
                      </span>
                      <span className={`text-base font-black font-mono ${debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        ${debt.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 text-[11px] text-slate-400">
                    {completedTreatments.length} de {treatments.length} procedimientos concluidos en el odontograma.
                  </div>
                </div>
              </div>

              {/* Última Evolución Registrada */}
              {evolutions.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-foreground">
                      Último Acto Clínico Registrado ({new Date(evolutions[0].createdAt).toLocaleDateString()})
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('evoluciones')}
                      className="text-xs font-bold text-teal-600 hover:underline"
                    >
                      Ver todas las {evolutions.length} evoluciones →
                    </button>
                  </div>
                  <p className="text-xs text-foreground font-medium leading-relaxed bg-card p-3 rounded-xl border border-border">
                    {evolutions[0].note}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Odontólogo: {evolutions[0].doctorName || 'Especialista tratante'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORIAL CRONOLÓGICO DE EVOLUCIONES */}
          {activeTab === 'evoluciones' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-black text-foreground">
                    Historial Cronológico de Consultas y Procedimientos
                  </h4>
                  <p className="text-xs text-slate-400">
                    Registro de cada cita, técnicas aplicadas, insumos utilizados y recetas emitidas
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black bg-teal-500/10 text-teal-600">
                  {evolutions.length} {evolutions.length === 1 ? 'consulta' : 'consultas'}
                </span>
              </div>

              {evolutions.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                  <Activity size={32} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">No hay evoluciones médicas registradas aún</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Cada vez que guardas una consulta en la Estación 2 ("Consulta de Hoy"), queda archivada cronológicamente aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {evolutions.map((evo, idx) => (
                    <div
                      key={evo.id || idx}
                      className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-teal-600 font-mono">
                            {new Date(evo.createdAt).toLocaleDateString('es-VE', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(evo.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Dr(a): <strong>{evo.doctorName || 'Odontólogo Tratante'}</strong>
                        </span>
                      </div>

                      {/* Nota Clínica */}
                      <p className="text-xs text-foreground font-medium leading-relaxed whitespace-pre-wrap">
                        {evo.note}
                      </p>

                      {/* Piezas Involucradas */}
                      {evo.teethInvolved && evo.teethInvolved.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Piezas:</span>
                          {evo.teethInvolved.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 text-[10px] font-mono font-bold">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Insumos Descontados */}
                      {evo.extraConsumables && evo.extraConsumables.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-border/60 space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Insumos Descartables Consumidos en esta Cita:
                          </span>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {evo.extraConsumables.map((c, cIdx) => (
                              <span key={cIdx} className="font-semibold text-foreground">
                                • {c.name} (x{c.quantity})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prescripción Médica Emitida */}
                      {evo.prescription?.medications && evo.prescription.medications.length > 0 && (
                        <div className="p-3 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-1.5">
                          <span className="text-[10px] font-black text-teal-600 uppercase flex items-center gap-1">
                            <Pill size={12} />
                            <span>Récipe Médico Farmacológico Prescrito:</span>
                          </span>
                          <div className="space-y-1 text-xs">
                            {evo.prescription.medications.map((m, mIdx) => (
                              <div key={mIdx} className="text-foreground">
                                <strong className="font-bold">{m.drug}</strong> {m.dosage ? `(${m.dosage})` : ''} — Cada {m.frequency} por {m.duration}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRATAMIENTOS & ODONTOGRAMA ACTIVO */}
          {activeTab === 'plan_odontograma' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-black text-foreground">
                    Plan de Tratamiento Odontológico Presupuestado
                  </h4>
                  <p className="text-xs text-slate-400">
                    Procedimientos diagnosticados sobre el odontograma FDI activo
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-teal-500/10 text-teal-600 font-mono font-bold text-xs">
                    Total: ${totalBudgetUSD.toFixed(2)}
                  </span>
                </div>
              </div>

              {treatments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                  <Stethoscope size={32} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Sin procedimientos registrados en el plan</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Agrega caries, obturaciones, coronas o brackets en la Estación 1 ("Odontograma") para estructurar el plan de tratamiento.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {treatments.map((t, idx) => (
                    <div
                      key={t.id || idx}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        t.completed
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          t.completed ? 'bg-emerald-500 text-white' : 'bg-teal-500/10 text-teal-600'
                        }`}>
                          #{t.toothNumber}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${t.completed ? 'line-through text-slate-400' : 'text-foreground'}`}>
                            {t.procedure}
                          </p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {t.category || 'Odontología General'} {t.completed ? '· Concluido' : '· Pendiente'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-black text-foreground shrink-0">
                        ${Number(t.estimatedCost).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ÓRDENES DE TRABAJO & LABORATORIO (KANBAN) */}
          {activeTab === 'ordenes_trabajo' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-border pb-3">
                <h4 className="text-sm font-black text-foreground">
                  Órdenes de Trabajo Clínicas & Fases de Laboratorio
                </h4>
                <p className="text-xs text-slate-400">
                  Seguimiento de etapas de prótesis, férulas, coronas y tratamientos multisesión
                </p>
              </div>

              {workOrders.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                  <KanbanSquare size={32} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Sin órdenes de trabajo activas</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Puedes generar una orden de trabajo desde el presupuesto activo en la Estación 4 del sillón dental.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workOrders.map((order) => {
                    const totalSteps = order.steps.length;
                    const completedSteps = order.steps.filter((s) => s.completed).length;
                    const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                    return (
                      <div key={order.id} className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600">
                              {order.documentNumber}
                            </span>
                            <h5 className="text-xs font-black text-foreground">{order.title}</h5>
                          </div>
                          <span className="text-xs font-mono text-slate-500">
                            Total: <strong>${order.totalAmount.toFixed(2)}</strong> | Saldo: <strong className={order.balanceDue > 0 ? 'text-red-500' : 'text-emerald-500'}>${order.balanceDue.toFixed(2)}</strong>
                          </span>
                        </div>

                        {totalSteps > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400">
                              <span>Progreso de etapas</span>
                              <span>{completedSteps}/{totalSteps} ({percent}%)</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {order.steps.map((stg) => (
                            <div key={stg.id} className="flex items-center gap-2 text-xs py-1 text-slate-600 dark:text-slate-300">
                              <CheckCircle2 size={13} className={stg.completed ? 'text-emerald-500' : 'text-slate-300'} />
                              <span className={stg.completed ? 'line-through text-slate-400' : ''}>{stg.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CITAS Y TURNOS DEL PACIENTE */}
          {activeTab === 'citas' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h4 className="text-sm font-black text-foreground">
                    Historial de Citas y Turnos Agendados
                  </h4>
                  <p className="text-xs text-slate-400">
                    Turnos del paciente en la agenda general del consultorio
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenSchedule}
                  className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-2xs btn-haptic"
                >
                  <CalendarDays size={13} />
                  <span>+ Nueva Cita</span>
                </button>
              </div>

              {patientAppointments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-2xl p-6">
                  <Calendar size={32} className="text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Sin citas agendadas</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {patientAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-2xl bg-card border border-border flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div>
                        <p className="text-xs font-black text-foreground">{appt.service_title || 'Consulta Odontológica'}</p>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {appt.start_time ? new Date(appt.start_time).toLocaleString('es-VE') : 'Fecha no especificada'}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-500/10 text-teal-600">
                        {appt.status || 'Confirmada'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DOCUMENTOS, RADIOGRAFÍAS Y ARCHIVOS */}
          {activeTab === 'archivos' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="border-b border-border pb-3">
                <h4 className="text-sm font-black text-foreground">
                  Radiografías, Fotografías Clínicas & Consentimientos
                </h4>
                <p className="text-xs text-slate-400">
                  Archivos digitales, tomografías y documentos legales adjuntos al expediente del paciente
                </p>
              </div>

              <ClientRecordsTab
                entityId={patient.id}
                tenantId={tenantId}
                actor={actor}
                clientName={patient.name}
              />
            </div>
          )}

        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            PIE DE PÁGINA DEL MODAL
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-border flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="text-[11px] font-mono">
            Expediente ID: {patient.id.slice(0, 8)}...
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-card border border-border text-foreground font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-2xs btn-haptic text-xs"
          >
            Cerrar Expediente
          </button>
        </div>

      </div>
    </div>
  );
}
