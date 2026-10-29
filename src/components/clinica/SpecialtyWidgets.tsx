'use client';

import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  Baby,
  HeartPulse,
  Heart,
  Sparkles,
  Bone,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Syringe,
  Calculator,
  Calendar,
  Plus,
  Activity,
  ShieldCheck,
  Flame,
  Info,
  Trash2,
} from 'lucide-react';
import { MedicalSpecialtyId } from '@/lib/medical/specialtyRegistry';
import {
  calculateBMI,
  calculateMAP,
  calculateExactPediatricAge,
  PEDIATRIC_DRUGS_CATALOG,
  calculatePediatricDosage,
  calculateObstetricWheel,
  calculateSphericalEquivalent,
  evaluateIOP,
} from '@/lib/medical/clinicalCalculators';

export interface ClinicalVitalsInput {
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  spo2: number;
  weightKg: number;
  heightCm: number;
}

export interface SpecialtyWidgetsProps {
  specialtyId: MedicalSpecialtyId;
  specialtyState: Record<string, any>;
  onChangeSpecialtyState: (nextState: Record<string, any>) => void;
  vitals: ClinicalVitalsInput;
  patientBirthDate?: string;
  onAppendPrescription?: (medLine: string, instructionLine: string) => void;
}

const GENERAL_SYSTEMS = [
  { key: 'neurologico', label: 'Neurológico & Pares Craneales', defaultNote: 'Consciente, orientado en 3 planos, Glasgow 15/15, sin focalización.' },
  { key: 'cardiopulmonar', label: 'Cardiopulmonar', defaultNote: 'Ruidos cardíacos rítmicos normofonéticos sin soplos. Murmullo vesicular conservado.' },
  { key: 'abdominal', label: 'Abdominal & Gastrointestinal', defaultNote: 'Blando, depresible, no doloroso a la palpación, ruidos hidroaéreos presentes.' },
  { key: 'orl', label: 'ORL (Oídos, Nariz y Garganta)', defaultNote: 'Conductos auditivos permeables, membranas timpánicas íntegras, orofaringe no congestiva.' },
  { key: 'extremidades', label: 'Extremidades & Vascular Periférico', defaultNote: 'Simétricas, eutróficas, sin edemas ni signos de TVP, pulsos distales presentes.' },
];

const VACCINES_PAI = [
  { id: 'bcg', name: 'BCG (Tuberculosis)', doses: ['Única RN'] },
  { id: 'pentavalente', name: 'Pentavalente / Hexavalente', doses: ['1ª (2m)', '2ª (4m)', '3ª (6m)', 'Ref (18m)'] },
  { id: 'polio', name: 'Polio (IPV / bOPV)', doses: ['1ª (2m)', '2ª (4m)', '3ª (6m)', 'Ref (18m)'] },
  { id: 'rotavirus', name: 'Rotavirus', doses: ['1ª (2m)', '2ª (4m)'] },
  { id: 'neumococo', name: 'Neumococo 13V', doses: ['1ª (2m)', '2ª (4m)', 'Ref (12m)'] },
  { id: 'srp', name: 'SRP (Triple Viral)', doses: ['1ª (12m)', 'Ref (18m-4a)'] },
  { id: 'varicela', name: 'Varicela', doses: ['1ª (12m)', '2ª (4a)'] },
  { id: 'hepatitis_ab', name: 'Hepatitis A / B', doses: ['HepB RN', 'HepA 1ª', 'HepA 2ª'] },
  { id: 'influenza', name: 'Influenza Estacional', doses: ['1ª Dosis', 'Anual'] },
];

const DERMA_ZONES = [
  'Frente',
  'Entrecejo/Glabela',
  'Periocular',
  'Pómulos',
  'Surco Nasogeniano',
  'Labios',
  'Mentón/Mandíbula',
  'Cuello',
  'Corporal',
];

const TRAUMA_ZONES = [
  'Columna Cervical/Lumbar',
  'Hombro',
  'Codo',
  'Mano',
  'Cadera',
  'Rodilla',
  'Tobillo',
];

const REHAB_MODALITIES = [
  'Ultrasonido',
  'TENS',
  'Termoterapia',
  'Magnetoterapia',
  'Cinesiterapia',
];

const SNELLEN_OPTIONS = [
  '20/20',
  '20/25',
  '20/30',
  '20/40',
  '20/50',
  '20/70',
  '20/100',
  '20/200',
  '20/400',
  'CD (Cuenta Dedos)',
  'MM (Mov. Manos)',
  'PL (Percepción Luz)',
];

export function SpecialtyWidgets({
  specialtyId,
  specialtyState,
  onChangeSpecialtyState,
  vitals,
  patientBirthDate,
  onAppendPrescription,
}: SpecialtyWidgetsProps) {
  // Helper para actualizar una clave dentro de specialtyState
  const updateField = (key: string, value: any) => {
    onChangeSpecialtyState({
      ...specialtyState,
      [key]: value,
    });
  };

  // Cálculos transversales desde signos vitales
  const bmiInfo = useMemo(
    () => calculateBMI(vitals.weightKg, vitals.heightCm),
    [vitals.weightKg, vitals.heightCm]
  );
  const mapInfo = useMemo(
    () => calculateMAP(vitals.systolic, vitals.diastolic),
    [vitals.systolic, vitals.diastolic]
  );

  // Estado local para la calculadora pediátrica y el mapa dermatológico
  const [selectedPedDrugId, setSelectedPedDrugId] = useState<string>(PEDIATRIC_DRUGS_CATALOG[0]?.id || 'drug-acetaminofen');
  const [customDoseMgKgDay, setCustomDoseMgKgDay] = useState<number | null>(null);

  const [dermaZone, setDermaZone] = useState<string>(DERMA_ZONES[0]);
  const [dermaProcedureType, setDermaProcedureType] = useState<string>('Toxina Botulínica');
  const [dermaUnitsOrMl, setDermaUnitsOrMl] = useState<string>('10 U');
  const [dermaLot, setDermaLot] = useState<string>('');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. MEDICINA GENERAL E INTERNA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_general') {
    const systemsExam: Record<string, { status: 'Normal' | 'Hallazgo'; notes: string }> =
      specialtyState.systemsExam || {};
    const capillaryGlucose = Number(specialtyState.capillaryGlucose ?? 92);
    const fastingState = specialtyState.fastingState || 'Ayunas';

    const handleSystemToggle = (sysKey: string, defaultNote: string, nextStatus: 'Normal' | 'Hallazgo') => {
      const existing = systemsExam[sysKey] || { status: 'Normal', notes: defaultNote };
      updateField('systemsExam', {
        ...systemsExam,
        [sysKey]: {
          status: nextStatus,
          notes: existing.notes || defaultNote,
        },
      });
    };

    const handleSystemNoteChange = (sysKey: string, defaultNote: string, notes: string) => {
      const existing = systemsExam[sysKey] || { status: 'Normal', notes: defaultNote };
      updateField('systemsExam', {
        ...systemsExam,
        [sysKey]: {
          ...existing,
          notes,
        },
      });
    };

    const glucoseStatus =
      capillaryGlucose >= 126
        ? { label: 'Hiperglucemia / Rango Diabético', color: 'text-rose-600 bg-rose-500/10 border-rose-500/30' }
        : capillaryGlucose >= 100
        ? { label: 'Prediabetes / Glucemia Alterada', color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' }
        : capillaryGlucose > 0 && capillaryGlucose < 70
        ? { label: 'Hipoglucemia (<70 mg/dL)', color: 'text-rose-600 bg-rose-500/10 border-rose-500/30' }
        : { label: 'Normoglucemia', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' };

    return (
      <div className="space-y-5">
        {/* Semáforo Cardiovascular y Metabólico */}
        <div className="rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/5 via-transparent to-indigo-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-sky-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Semáforo Cardiovascular y Metabólico (AHA / OMS)
              </h4>
            </div>
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/20">
              Cálculo Automático en Vivo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* PAM */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                Presión Arterial Media (PAM)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-[var(--text-primary)]">
                  {mapInfo.map > 0 ? `${mapInfo.map} mmHg` : '--'}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">
                  ({vitals.systolic || 0}/{vitals.diastolic || 0})
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Perfusión tisular normal: 70–100 mmHg
              </div>
            </div>

            {/* Estadiaje AHA */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                Estadiaje Hipertensión AHA
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                {mapInfo.alert ? (
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
                <span
                  className={`text-sm font-bold ${
                    mapInfo.alert ? 'text-rose-500' : 'text-emerald-500'
                  }`}
                >
                  {mapInfo.ahaStage}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {mapInfo.alert ? 'Requiere ajuste antihipertensivo' : 'Tensión arterial en meta'}
              </div>
            </div>

            {/* IMC */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)] font-medium">
                Índice de Masa Corporal (IMC)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-black text-[var(--text-primary)]">
                  {bmiInfo.bmi > 0 ? `${bmiInfo.bmi}` : '--'}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${bmiInfo.color}20`,
                    color: bmiInfo.color,
                  }}
                >
                  {bmiInfo.category}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Peso: {vitals.weightKg || 0} kg · Talla: {vitals.heightCm || 0} cm
              </div>
            </div>

            {/* Glucemia Capilar */}
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Glucemia Capilar (mg/dL)
                </span>
                <select
                  value={fastingState}
                  onChange={(e) => updateField('fastingState', e.target.value)}
                  className="text-[10px] bg-transparent border border-[var(--border-color)] rounded px-1.5 py-0.5 text-[var(--text-primary)]"
                >
                  <option value="Ayunas">Ayunas</option>
                  <option value="Postprandial">Postprandial</option>
                </select>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={20}
                  max={600}
                  value={capillaryGlucose}
                  onChange={(e) => updateField('capillaryGlucose', Number(e.target.value))}
                  className="w-20 text-base font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[var(--text-primary)]"
                />
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${glucoseStatus.color}`}>
                  {glucoseStatus.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Checklist Interactivo de Examen Físico por Sistemas */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-sky-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Checklist de Examen Físico por Sistemas
              </h4>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              Marca Normal o Hallazgo Patológico por segmento
            </span>
          </div>

          <div className="space-y-3">
            {GENERAL_SYSTEMS.map((sys) => {
              const current = systemsExam[sys.key] || {
                status: 'Normal',
                notes: sys.defaultNote,
              };
              const isAbnormal = current.status === 'Hallazgo';
              return (
                <div
                  key={sys.key}
                  className={`rounded-lg border p-3 transition-all ${
                    isAbnormal
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : 'border-[var(--border-color)] bg-[var(--bg-secondary)]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {sys.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSystemToggle(sys.key, sys.defaultNote, 'Normal')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          !isAbnormal
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        ✓ Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSystemToggle(sys.key, sys.defaultNote, 'Hallazgo')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          isAbnormal
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                        }`}
                      >
                        ⚠ Hallazgo
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={current.notes}
                    onChange={(e) => handleSystemNoteChange(sys.key, sys.defaultNote, e.target.value)}
                    placeholder={`Descripción de ${sys.label}...`}
                    className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-sky-500"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1.B CARDIOLOGÍA & CARDIOVASCULAR
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_cardiologia' || (specialtyId as string) === 'cardiologia') {
    const cardState = specialtyState.cardiology || specialtyState || {};
    const ecg = cardState.ecg || {
      ritmo: 'Sinusal',
      hr: vitals.heartRate || 75,
      prMs: 160,
      qrsMs: 85,
      qtcMs: 410,
      ejeQrs: 'Normal (0° a +90°)',
      stSegment: 'Normal / Isoeléctrico',
      conclusiones: 'Trazado electrocardiográfico sin alteraciones del ritmo ni signos agudos de isquemia.',
    };

    const echo = cardState.echo || {
      fevi: 60,
      dstdVi: 48,
      sivMm: 10,
      ppviMm: 10,
      patronDiastolico: 'Normal',
      valvulas: 'Válvula mitral y aórtica normoinsertas, móviles, sin gradientes ni insuficiencias patológicas.',
      conclusiones: 'Función sistólica y diastólica biventricular conservada en reposo. Espesores parietales normales.',
    };

    const monitoreo = cardState.monitoreo || {
      tipoEstudio: 'Holter de Arritmia',
      duracionHoras: 24,
      fcMin: 54,
      fcMax: 130,
      fcPromedio: 76,
      ectopiasSVE: 'Aisladas (< 50 en 24h)',
      ectopiasVE: 'Ausentes o monomórficas aisladas',
      pausas: 'No se detectaron pausas significativas > 2.0s',
      conclusionEstudio: 'Ritmo sinusal sostenido con variabilidad circadiana normal. Sin eventos de taquiarritmia ventricular ni bloqueos AV avanzados.',
      // Campos MAPA
      paPromedio24h: '124/78 mmHg',
      cargaDiurna: '15%',
      cargaNocturna: '10%',
      patronCircadiano: 'Dipper (caída nocturna normal 10–20%)',
      conclusionMapa: 'Perfil hemodinámico dentro de límites normales, conservando patrón dipper circadiano.',
    };

    const nyhaClass = cardState.nyhaClass || 'Clase I (Sin limitación física habitual)';
    const cvRisk = cardState.cvRisk || 'Bajo (< 5% Framingham)';

    const updateEcg = (field: string, val: any) => {
      onChangeSpecialtyState({
        ...specialtyState,
        cardiology: {
          ...cardState,
          ecg: { ...ecg, [field]: val },
        },
      });
    };

    const updateEcho = (field: string, val: any) => {
      onChangeSpecialtyState({
        ...specialtyState,
        cardiology: {
          ...cardState,
          echo: { ...echo, [field]: val },
        },
      });
    };

    const updateMonitoreo = (field: string, val: any) => {
      onChangeSpecialtyState({
        ...specialtyState,
        cardiology: {
          ...cardState,
          monitoreo: { ...monitoreo, [field]: val },
        },
      });
    };

    const updateCardField = (field: string, val: any) => {
      onChangeSpecialtyState({
        ...specialtyState,
        cardiology: {
          ...cardState,
          [field]: val,
        },
      });
    };

    const feviNum = Number(echo.fevi) || 60;
    const feviClassification =
      feviNum >= 52
        ? { label: 'FEVI Normal (≥52%)', color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' }
        : feviNum >= 41
        ? { label: 'FEVI Ligeramente Deprimida (41-51%)', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' }
        : feviNum >= 30
        ? { label: 'FEVI Moderadamente Deprimida (30-40%)', color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' }
        : { label: 'FEVI Severamente Deprimida (<30%)', color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' };

    const qtcNum = Number(ecg.qtcMs) || 410;
    const qtcAlert = qtcNum > 460;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Banner Hemodinámico & PAM */}
        <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-transparent to-red-600/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-500 flex items-center justify-center border border-rose-500/30">
              <Heart className="w-5 h-5 fill-rose-500/30" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)] flex items-center gap-2">
                Estación Cardiológica & Hemodinámica
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400">
                  Dra. María Teresa Vera
                </span>
              </h4>
              <p className="text-xs text-[var(--text-secondary)]">
                Registro de ECG de 12 derivaciones, Ecocardiograma Doppler, MAPA y Holter de arritmia.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="px-3 py-1.5 rounded-xl border border-border bg-[var(--bg-primary)] text-xs font-bold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-rose-500" />
              <span>PAM: <strong className="text-rose-600 dark:text-rose-400">{mapInfo.map} mmHg</strong></span>
              <span className="text-[10px] text-[var(--text-secondary)] font-normal">({mapInfo.ahaStage})</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-border bg-[var(--bg-primary)] text-xs font-bold flex items-center gap-2">
              <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
              <span>FC: <strong className="text-foreground">{vitals.heartRate || 75} lpm</strong></span>
            </div>
            <div className="px-3 py-1.5 rounded-xl border border-border bg-[var(--bg-primary)] text-xs font-bold">
              <span>PA: <strong className="text-foreground">{vitals.systolic}/{vitals.diastolic} mmHg</strong></span>
            </div>
          </div>
        </div>

        {/* 1. ELECTROCARDIOGRAMA DE 12 DERIVACIONES */}
        <div className="rounded-2xl border border-border bg-[var(--bg-primary)] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Electrocardiograma de 12 Derivaciones (ECG)
              </h5>
            </div>
            {qtcAlert && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/30 flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Alerta: QTc Prolongado ({qtcNum} ms)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Ritmo de Base</label>
              <select
                value={ecg.ritmo}
                onChange={(e) => updateEcg('ritmo', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              >
                <option value="Sinusal">Sinusal Regular</option>
                <option value="Fibrilación Auricular">Fibrilación Auricular (FA)</option>
                <option value="Flutter Auricular">Flutter Auricular</option>
                <option value="Taquicardia Sinusal">Taquicardia Sinusal</option>
                <option value="Bradicardia Sinusal">Bradicardia Sinusal</option>
                <option value="Bloqueo AV 1er Grado">Bloqueo AV 1er Grado</option>
                <option value="Bloqueo Rama Izquierda (BRI)">Bloqueo Rama Izquierda (BRI)</option>
                <option value="Bloqueo Rama Derecha (BRD)">Bloqueo Rama Derecha (BRD)</option>
                <option value="Extrasístoles Ventriculares">Extrasístoles Ventriculares Frecuentes</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Intervalo PR (ms)</label>
              <input
                type="number"
                min={80}
                max={350}
                value={ecg.prMs}
                onChange={(e) => updateEcg('prMs', Number(e.target.value))}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Complejo QRS (ms)</label>
              <input
                type="number"
                min={60}
                max={200}
                value={ecg.qrsMs}
                onChange={(e) => updateEcg('qrsMs', Number(e.target.value))}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">QTc Corregido (ms)</label>
              <input
                type="number"
                min={300}
                max={600}
                value={ecg.qtcMs}
                onChange={(e) => updateEcg('qtcMs', Number(e.target.value))}
                className={`w-full text-xs font-semibold bg-[var(--bg-secondary)] border rounded-xl px-2.5 py-2 text-[var(--text-primary)] ${
                  qtcAlert ? 'border-rose-500 bg-rose-500/10 text-rose-600' : 'border-border'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Eje Eléctrico QRS</label>
              <select
                value={ecg.ejeQrs}
                onChange={(e) => updateEcg('ejeQrs', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              >
                <option value="Normal (0° a +90°)">Normal (0° a +90°)</option>
                <option value="Desviación Izquierda (-30° a -90°)">Desviación Izquierda (-30° a -90°)</option>
                <option value="Desviación Derecha (+90° a +180°)">Desviación Derecha (+90° a +180°)</option>
                <option value="Indeterminado / Extremo">Indeterminado / Extremo</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Segmento ST / Repolarización Ventricular</label>
              <select
                value={ecg.stSegment}
                onChange={(e) => updateEcg('stSegment', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              >
                <option value="Normal / Isoeléctrico">Normal / Isoeléctrico</option>
                <option value="Supradesnivel ST (Lesión Subepicárdica)">Supradesnivel ST (Lesión Subepicárdica)</option>
                <option value="Infradesnivel ST (Isquemia Subendocárdica)">Infradesnivel ST (Isquemia Subendocárdica)</option>
                <option value="Inversión simétrica de onda T">Inversión simétrica de onda T (Isquemia transmural)</option>
                <option value="Repolarización precoz / Variante normal">Repolarización precoz / Variante normal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
              Conclusión e Interpretación del Electrocardiograma
            </label>
            <textarea
              rows={2}
              value={ecg.conclusiones}
              onChange={(e) => updateEcg('conclusiones', e.target.value)}
              placeholder="Ej: Ritmo sinusal regular, PR y QTc normales, sin signos agudos de isquemia ni arritmias..."
              className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl p-2.5 text-[var(--text-primary)]"
            />
          </div>
        </div>

        {/* 2. ECOCARDIOGRAMA TRANSTORÁCICO & DOPPLER */}
        <div className="rounded-2xl border border-border bg-[var(--bg-primary)] p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Ecocardiograma Transtorácico Doppler Color
              </h5>
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-xl border ${feviClassification.color}`}>
              FEVI: {echo.fevi}% — {feviClassification.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                FEVI Teichholz / Simpson (%)
              </label>
              <input
                type="number"
                min={15}
                max={85}
                value={echo.fevi}
                onChange={(e) => updateEcho('fevi', Number(e.target.value))}
                className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-rose-600 dark:text-rose-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                Diámetro Diastólico VI (DTDVI mm)
              </label>
              <input
                type="number"
                min={30}
                max={80}
                value={echo.dstdVi}
                onChange={(e) => updateEcho('dstdVi', Number(e.target.value))}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                Septum Interventricular (SIV mm)
              </label>
              <input
                type="number"
                min={6}
                max={25}
                value={echo.sivMm}
                onChange={(e) => updateEcho('sivMm', Number(e.target.value))}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                Pared Posterior VI (PPVI mm)
              </label>
              <input
                type="number"
                min={6}
                max={25}
                value={echo.ppviMm}
                onChange={(e) => updateEcho('ppviMm', Number(e.target.value))}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                Aparato Valvular y Flujos Doppler
              </label>
              <textarea
                rows={2}
                value={echo.valvulas}
                onChange={(e) => updateEcho('valvulas', e.target.value)}
                className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl p-2.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
                Conclusión del Ecocardiograma
              </label>
              <textarea
                rows={2}
                value={echo.conclusiones}
                onChange={(e) => updateEcho('conclusiones', e.target.value)}
                className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl p-2.5 text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* 3. MONITOREO AMBULATORIO: HOLTER DE ARRITMIA 24H & MAPA */}
        <div className="rounded-2xl border border-border bg-[var(--bg-primary)] p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-500" />
              <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                Monitoreo Ambulatorio: Holter 24h & MAPA
              </h5>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateMonitoreo('tipoEstudio', 'Holter de Arritmia')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  monitoreo.tipoEstudio === 'Holter de Arritmia'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-[var(--bg-secondary)] border border-border text-[var(--text-secondary)]'
                }`}
              >
                Holter de Arritmia
              </button>
              <button
                type="button"
                onClick={() => updateMonitoreo('tipoEstudio', 'MAPA')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  monitoreo.tipoEstudio === 'MAPA'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'bg-[var(--bg-secondary)] border border-border text-[var(--text-secondary)]'
                }`}
              >
                MAPA (Presión Arterial)
              </button>
            </div>
          </div>

          {monitoreo.tipoEstudio === 'Holter de Arritmia' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">FC Mínima (lpm)</label>
                  <input
                    type="number"
                    value={monitoreo.fcMin}
                    onChange={(e) => updateMonitoreo('fcMin', Number(e.target.value))}
                    className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">FC Promedio (lpm)</label>
                  <input
                    type="number"
                    value={monitoreo.fcPromedio}
                    onChange={(e) => updateMonitoreo('fcPromedio', Number(e.target.value))}
                    className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">FC Máxima (lpm)</label>
                  <input
                    type="number"
                    value={monitoreo.fcMax}
                    onChange={(e) => updateMonitoreo('fcMax', Number(e.target.value))}
                    className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Ectopias Supraventriculares (SVE)</label>
                  <input
                    type="text"
                    value={monitoreo.ectopiasSVE}
                    onChange={(e) => updateMonitoreo('ectopiasSVE', e.target.value)}
                    className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Ectopias Ventriculares (VE)</label>
                  <input
                    type="text"
                    value={monitoreo.ectopiasVE}
                    onChange={(e) => updateMonitoreo('ectopiasVE', e.target.value)}
                    className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Conclusión del Holter de Arritmia</label>
                <textarea
                  rows={2}
                  value={monitoreo.conclusionEstudio}
                  onChange={(e) => updateMonitoreo('conclusionEstudio', e.target.value)}
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">PA Promedio 24h</label>
                  <input
                    type="text"
                    value={monitoreo.paPromedio24h}
                    onChange={(e) => updateMonitoreo('paPromedio24h', e.target.value)}
                    className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Carga Tensional Diurna (%)</label>
                  <input
                    type="text"
                    value={monitoreo.cargaDiurna}
                    onChange={(e) => updateMonitoreo('cargaDiurna', e.target.value)}
                    className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Patrón Circadiano</label>
                  <select
                    value={monitoreo.patronCircadiano}
                    onChange={(e) => updateMonitoreo('patronCircadiano', e.target.value)}
                    className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
                  >
                    <option value="Dipper (caída nocturna normal 10–20%)">Dipper (Normal 10–20%)</option>
                    <option value="Non-Dipper (caída nocturna <10%)">Non-Dipper (Riesgo CV elevado)</option>
                    <option value="Ríser / Invertido (hipertensión nocturna)">Ríser / Invertido</option>
                    <option value="Extreme Dipper (caída nocturna >20%)">{'Extreme Dipper (>20%)'}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Conclusión del MAPA</label>
                <textarea
                  rows={2}
                  value={monitoreo.conclusionMapa}
                  onChange={(e) => updateMonitoreo('conclusionMapa', e.target.value)}
                  className="w-full text-xs bg-[var(--bg-secondary)] border border-border rounded-xl p-2.5 text-[var(--text-primary)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. RIESGO CARDIOVASCULAR & CLASE NYHA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border bg-[var(--bg-primary)] p-4 space-y-3 shadow-xs">
            <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-rose-500" />
              Clase Funcional NYHA & Riesgo Cardiovascular
            </h5>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Clase NYHA (Insuficiencia Cardíaca)</label>
              <select
                value={nyhaClass}
                onChange={(e) => updateCardField('nyhaClass', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              >
                <option value="Clase I (Sin limitación de actividad física ordinaria)">Clase I: Sin limitación en actividad física habitual</option>
                <option value="Clase II (Limitación leve de actividad ordinaria)">Clase II: Limitación leve, fatiga o disnea en esfuerzo moderado</option>
                <option value="Clase III (Limitación marcada de actividad habitual)">Clase III: Limitación marcada, confortable solo en reposo</option>
                <option value="Clase IV (Incapacidad total, síntomas en reposo)">Clase IV: Síntomas y disnea incluso en reposo</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">Estratificación de Riesgo CV Global</label>
              <select
                value={cvRisk}
                onChange={(e) => updateCardField('cvRisk', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-border rounded-xl px-2.5 py-2 text-[var(--text-primary)]"
              >
                <option value="Bajo (< 5% Framingham / SCORE)">Bajo (&lt; 5% a 10 años)</option>
                <option value="Moderado (5-10% Framingham / SCORE)">Moderado (5–10% a 10 años)</option>
                <option value="Alto (10-20% Framingham / SCORE)">Alto (10–20% a 10 años)</option>
                <option value="Muy Alto (> 20% Framingham / SCORE)">Muy Alto (&gt; 20% / Enfermedad CV establecida)</option>
              </select>
            </div>
          </div>

          {/* Atajos Rápidos de Prescripción */}
          <div className="rounded-2xl border border-border bg-[var(--bg-primary)] p-4 space-y-3 shadow-xs">
            <h5 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <Syringe className="w-4 h-4 text-rose-500" />
              Atajos Rápidos de Prescripción Cardiológica
            </h5>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Clic para añadir automáticamente el fármaco con su posología al récipe médico de la consulta:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Losartán 50 mg', ind: '1 tableta vía oral cada 12 horas (control HTA).' },
                { name: 'Amlodipino 5 mg', ind: '1 tableta vía oral cada mañana.' },
                { name: 'Bisoprolol 2.5 mg', ind: '1 tableta vía oral en la mañana con desayuno.' },
                { name: 'Atorvastatina 20 mg', ind: '1 tableta vía oral cada noche.' },
                { name: 'Aspirina Protect 81 mg', ind: '1 tableta vía oral diaria con el almuerzo.' },
              ].map((drug) => (
                <button
                  key={drug.name}
                  type="button"
                  onClick={() => onAppendPrescription?.(drug.name, drug.ind)}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {drug.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. PEDIATRÍA Y PUERICULTURA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_pediatria') {
    const birthDateToUse = specialtyState.pediatricBirthDate || patientBirthDate || '';
    const exactAge = calculateExactPediatricAge(birthDateToUse);
    const cephalicCm = Number(specialtyState.cephalicPerimeterCm ?? 47);
    const nutritionStatus = specialtyState.nutritionClassification || (
      bmiInfo.bmi <= 0
        ? 'Eutrófico (Percentil P15–P85 OMS)'
        : bmiInfo.category === 'Normal'
        ? 'Eutrófico (Percentil P15–P85 OMS)'
        : bmiInfo.category === 'Bajo Peso'
        ? 'Riesgo de Déficit Ponderal (<P15 OMS)'
        : 'Sobrepeso / Riesgo Metabólico Infantil (>P85 OMS)'
    );

    const selectedDrug =
      PEDIATRIC_DRUGS_CATALOG.find((d) => d.id === selectedPedDrugId) ||
      PEDIATRIC_DRUGS_CATALOG[0];

    const effectiveDoseMgKgDay =
      customDoseMgKgDay !== null ? customDoseMgKgDay : selectedDrug.doseMgPerKgDay;

    const dosageCalc = calculatePediatricDosage(
      vitals.weightKg || 12,
      effectiveDoseMgKgDay,
      selectedDrug.frequencyHours,
      selectedDrug.concentrationMgPer5Ml
    );

    const appliedVaccines: Record<string, boolean> = specialtyState.appliedVaccines || {};

    const toggleVaccineDose = (vaccineKey: string) => {
      updateField('appliedVaccines', {
        ...appliedVaccines,
        [vaccineKey]: !appliedVaccines[vaccineKey],
      });
    };

    const handleAddPediatricDoseToRx = () => {
      if (!onAppendPrescription) return;
      const weightUsed = vitals.weightKg || 12;
      const medLine = `${selectedDrug.name} (${selectedDrug.presentationLabel}) — 1 Frasco`;
      const instructionLine = `• Administrar ${dosageCalc.mlPerDose} mL (${dosageCalc.mgPerDose} mg) vía oral cada ${selectedDrug.frequencyHours} horas (Calculado para ${weightUsed} kg a ${effectiveDoseMgKgDay} mg/kg/día). ${selectedDrug.notes}`;
      onAppendPrescription(medLine, instructionLine);
    };

    return (
      <div className="space-y-5">
        {/* Panel de Edad Pediátrica Exacta y Antropometría OMS */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Baby className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Edad Pediátrica Exacta & Antropometría OMS
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-[var(--text-secondary)]">F. Nacimiento:</label>
              <input
                type="date"
                value={birthDateToUse}
                onChange={(e) => updateField('pediatricBirthDate', e.target.value)}
                className="text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Edad Cronológica Exacta</div>
              <div className="mt-1 text-base font-black text-emerald-600">
                {exactAge.formatted}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                Total: {exactAge.totalMonths} meses cumplidos
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Peso / Talla / IMC</div>
              <div className="mt-1 text-sm font-bold text-[var(--text-primary)]">
                {vitals.weightKg || 0} kg · {vitals.heightCm || 0} cm
              </div>
              <div className="mt-0.5 text-xs font-semibold text-emerald-600">
                IMC: {bmiInfo.bmi > 0 ? `${bmiInfo.bmi} kg/m²` : '--'}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Perímetro Cefálico (cm)</div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  value={cephalicCm}
                  onChange={(e) => updateField('cephalicPerimeterCm', Number(e.target.value))}
                  className="w-20 text-sm font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[var(--text-primary)]"
                />
                <span className="text-xs text-[var(--text-secondary)]">cm</span>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Clasificación Nutricional OMS</div>
              <select
                value={nutritionStatus}
                onChange={(e) => updateField('nutritionClassification', e.target.value)}
                className="mt-1 w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-[var(--text-primary)]"
              >
                <option value="Eutrófico (Percentil P15–P85 OMS)">Eutrófico (P15–P85 OMS)</option>
                <option value="Riesgo de Déficit Ponderal (<P15 OMS)">Riesgo Déficit (&lt;P15 OMS)</option>
                <option value="Desnutrición Moderada (<P3 OMS)">Desnutrición (&lt;P3 OMS)</option>
                <option value="Sobrepeso Infantil (P85–P97 OMS)">Sobrepeso (P85–P97 OMS)</option>
                <option value="Obesidad Infantil (>P97 OMS)">Obesidad (&gt;P97 OMS)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Calculadora Interactiva de Dosis Pediátrica (mg/kg) */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Calculadora Interactiva de Dosis Pediátrica (mg/kg → mL exactos)
              </h4>
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
              Peso activo: {vitals.weightKg || 12} kg
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Medicamento Pediátrico
              </label>
              <select
                value={selectedPedDrugId}
                onChange={(e) => {
                  setSelectedPedDrugId(e.target.value);
                  setCustomDoseMgKgDay(null);
                }}
                className="w-full text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              >
                {PEDIATRIC_DRUGS_CATALOG.map((drug) => (
                  <option key={drug.id} value={drug.id}>
                    {drug.name} — {drug.presentationLabel}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Dosis Ponderal (mg/kg/día) · Cada {selectedDrug.frequencyHours}h
              </label>
              <input
                type="number"
                step="0.5"
                value={effectiveDoseMgKgDay}
                onChange={(e) => setCustomDoseMgKgDay(Number(e.target.value))}
                className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              />
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                  Volumen Exacto por Toma
                </div>
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {dosageCalc.mlPerDose} mL{' '}
                  <span className="text-xs font-semibold">
                    ({dosageCalc.mgPerDose} mg c/{selectedDrug.frequencyHours}h)
                  </span>
                </div>
              </div>
              {onAppendPrescription && (
                <button
                  type="button"
                  onClick={handleAddPediatricDoseToRx}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar al Récipe
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
            <Info className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
            {selectedDrug.notes}
          </p>
        </div>

        {/* Carnet Digital de Vacunación PAI */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-emerald-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Carnet Digital de Vacunación (Esquema PAI / Sociedad de Pediatría)
              </h4>
            </div>
            <span className="text-xs text-[var(--text-secondary)]">
              Haz clic en cada dosis para marcarla como aplicada
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {VACCINES_PAI.map((vac) => (
              <div
                key={vac.id}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-2.5"
              >
                <div className="text-xs font-bold text-[var(--text-primary)] mb-1.5">
                  {vac.name}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vac.doses.map((doseLabel) => {
                    const key = `${vac.id}_${doseLabel}`;
                    const isApplied = Boolean(appliedVaccines[key]);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleVaccineDose(key)}
                        className={`px-2 py-1 rounded text-[11px] font-semibold transition-all border ${
                          isApplied
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                            : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-emerald-500/40'
                        }`}
                      >
                        {isApplied ? '✓ ' : ''}
                        {doseLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. GINECOLOGÍA Y OBSTETRICIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_ginecologia') {
    const gestas = Number(specialtyState.gestas ?? 1);
    const partos = Number(specialtyState.partos ?? 0);
    const cesareas = Number(specialtyState.cesareas ?? 0);
    const abortos = Number(specialtyState.abortos ?? 0);
    const menarquia = specialtyState.menarquia || '12 años';
    const ritmoMenstrual = specialtyState.ritmoMenstrual || '28 x 4 días (Eumenorreica)';
    const anticoncepcion = specialtyState.anticoncepcion || 'Ninguno / Control Prenatal';
    const ultimoPap = specialtyState.ultimoPap || 'Negativo para lesión intraepitelial (Hace <1 año)';
    const furDate = specialtyState.furDate || '';
    const fcfLpm = Number(specialtyState.fcfLpm ?? 144);
    const uterineHeightCm = Number(specialtyState.uterineHeightCm ?? 24);
    const fetalMovements = specialtyState.fetalMovements || 'Presentes y vigorosos (++/+++)';

    const wheel = calculateObstetricWheel(furDate);

    return (
      <div className="space-y-5">
        {/* Fórmula Obstétrica G - P - C - A y Antecedentes Ginecológicos */}
        <div className="rounded-xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 via-transparent to-rose-500/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-pink-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Fórmula Obstétrica (G - P - C - A) y Antecedentes Ginecológicos
              </h4>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pink-500/10 text-pink-600 border border-pink-500/20">
              G{gestas} P{partos} C{cesareas} A{abortos}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            {[
              { key: 'gestas', label: 'G (Gestas)', value: gestas },
              { key: 'partos', label: 'P (Partos Vaginales)', value: partos },
              { key: 'cesareas', label: 'C (Cesáreas)', value: cesareas },
              { key: 'abortos', label: 'A (Abortos/Ectópicos)', value: abortos },
            ].map((item) => (
              <div
                key={item.key}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5"
              >
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)]">
                  {item.label}
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={item.value}
                  onChange={(e) => updateField(item.key, Number(e.target.value))}
                  className="mt-1 w-full text-base font-black bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-primary)]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Menarquia
              </label>
              <input
                type="text"
                value={menarquia}
                onChange={(e) => updateField('menarquia', e.target.value)}
                className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Ritmo Menstrual
              </label>
              <input
                type="text"
                value={ritmoMenstrual}
                onChange={(e) => updateField('ritmoMenstrual', e.target.value)}
                className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Método Anticonceptivo (MAC)
              </label>
              <input
                type="text"
                value={anticoncepcion}
                onChange={(e) => updateField('anticoncepcion', e.target.value)}
                className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Última Citología (PAP / Bethesda)
              </label>
              <input
                type="text"
                value={ultimoPap}
                onChange={(e) => updateField('ultimoPap', e.target.value)}
                className="w-full text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Gestograma / Calculadora Obstétrica en Vivo */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Gestograma / Calculadora Obstétrica en Vivo (Regla de Naegele)
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)]">
                FUM / FUR (Fecha Última Regla):
              </label>
              <input
                type="date"
                value={furDate}
                onChange={(e) => updateField('furDate', e.target.value)}
                className="text-xs font-bold bg-[var(--bg-secondary)] border border-pink-500/40 rounded-lg px-2.5 py-1 text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Edad Gestacional Actual</div>
              <div className="mt-1 text-lg font-black text-pink-600">
                {furDate ? wheel.formattedGA : 'Ingrese FUM'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                Restan {wheel.daysRemaining} días para término (40 sem)
              </div>
            </div>

            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">
                Fecha Probable de Parto (FPP)
              </div>
              <div className="mt-1 text-lg font-black text-[var(--text-primary)]">
                {wheel.fppDateStr || '-- / -- / ----'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                FUR + 280 días (40 semanas)
              </div>
            </div>

            <div className="rounded-lg border border-pink-500/20 bg-pink-500/5 p-3">
              <div className="text-[11px] text-[var(--text-secondary)]">Trimestre Actual</div>
              <div className="mt-1 text-lg font-black text-pink-600">
                {furDate ? `${wheel.trimester}º Trimestre` : '--'}
              </div>
              <div className="mt-1.5 w-full bg-[var(--bg-secondary)] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-pink-500 h-full transition-all"
                  style={{ width: `${wheel.progressPercent}%` }}
                />
              </div>
              <div className="mt-0.5 text-[10px] text-right text-[var(--text-secondary)]">
                {wheel.progressPercent}% completado
              </div>
            </div>
          </div>

          {/* Parámetros de Bienestar Fetal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Frecuencia Cardíaca Fetal (FCF lpm · Normal 110–160)
              </label>
              <input
                type="number"
                value={fcfLpm}
                onChange={(e) => updateField('fcfLpm', Number(e.target.value))}
                className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Altura Uterina (cm)
              </label>
              <input
                type="number"
                value={uterineHeightCm}
                onChange={(e) => updateField('uterineHeightCm', Number(e.target.value))}
                className="w-full text-xs font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Movimientos Fetales Percibidos
              </label>
              <input
                type="text"
                value={fetalMovements}
                onChange={(e) => updateField('fetalMovements', e.target.value)}
                className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. DERMATOLOGÍA Y MEDICINA ESTÉTICA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_dermatologia') {
    const fitzpatrick = specialtyState.fitzpatrick || 'III';
    const biotype = specialtyState.biotype || 'Mixta';
    const glogau = specialtyState.glogau || 'Tipo II (Arrugas en movimiento)';
    const abcde = specialtyState.abcde || {
      A: false,
      B: false,
      C: false,
      D: false,
      E: false,
    };
    const bodyMapEntries: Array<{
      id: string;
      zone: string;
      type: string;
      amount: string;
      lot: string;
    }> = specialtyState.bodyMapEntries || [];

    const handleAddDermaPoint = () => {
      const nextEntry = {
        id: `derm-${Date.now()}`,
        zone: dermaZone,
        type: dermaProcedureType,
        amount: dermaUnitsOrMl,
        lot: dermaLot || 'Lote Estándar',
      };
      updateField('bodyMapEntries', [...bodyMapEntries, nextEntry]);
      setDermaLot('');
    };

    const handleRemoveDermaPoint = (id: string) => {
      updateField(
        'bodyMapEntries',
        bodyMapEntries.filter((item) => item.id !== id)
      );
    };

    const toggleAbcde = (letter: 'A' | 'B' | 'C' | 'D' | 'E') => {
      updateField('abcde', {
        ...abcde,
        [letter]: !abcde[letter],
      });
    };

    return (
      <div className="space-y-5">
        {/* Fototipo de Fitzpatrick, Biotipo y Escala de Glogau */}
        <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-fuchsia-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-500" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Tipificación Cutánea (Fototipo de Fitzpatrick I–VI, Biotipo y Escala de Glogau)
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Fototipo de Fitzpatrick (I–VI)
              </label>
              <div className="flex gap-1">
                {['I', 'II', 'III', 'IV', 'V', 'VI'].map((roman) => (
                  <button
                    key={roman}
                    type="button"
                    onClick={() => updateField('fitzpatrick', roman)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      fitzpatrick === roman
                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {roman}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Biotipo Cutáneo
              </label>
              <select
                value={biotype}
                onChange={(e) => updateField('biotype', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="Eudérmica (Normal)">Eudérmica (Normal)</option>
                <option value="Seca / Alípica">Seca / Alípica</option>
                <option value="Mixta">Mixta</option>
                <option value="Grasa / Seborreica">Grasa / Seborreica</option>
                <option value="Sensible / Rosácea">Sensible / Rosácea</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Fotoenvejecimiento (Escala de Glogau)
              </label>
              <select
                value={glogau}
                onChange={(e) => updateField('glogau', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="Tipo I (Sin arrugas / Leve)">Tipo I (Sin arrugas / Leve)</option>
                <option value="Tipo II (Arrugas en movimiento)">Tipo II (Arrugas en movimiento)</option>
                <option value="Tipo III (Arrugas en reposo)">Tipo III (Arrugas en reposo)</option>
                <option value="Tipo IV (Severo / Actínico)">Tipo IV (Severo / Actínico)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mapa Anatómico Facial y Corporal Interactivo + Regla ABCDE */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Mapa Anatómico Facial y Corporal Interactivo (Dermoestética & Lesiones)
            </h4>
            <span className="text-xs text-[var(--text-secondary)]">
              {bodyMapEntries.length} punto(s) registrado(s) en sesión
            </span>
          </div>

          {/* Selector rápido de zonas */}
          <div className="flex flex-wrap gap-1.5">
            {DERMA_ZONES.map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setDermaZone(z)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  dermaZone === z
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                Tipo de Aplicación / Hallazgo
              </label>
              <select
                value={dermaProcedureType}
                onChange={(e) => setDermaProcedureType(e.target.value)}
                className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              >
                <option value="Toxina Botulínica">Toxina Botulínica</option>
                <option value="Ácido Hialurónico">Ácido Hialurónico</option>
                <option value="Bioestimulador">Bioestimulador</option>
                <option value="Lesión/Biopsia">Lesión / Biopsia</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                Unidades (U) / Volumen (mL)
              </label>
              <input
                type="text"
                value={dermaUnitsOrMl}
                onChange={(e) => setDermaUnitsOrMl(e.target.value)}
                placeholder="Ej: 12 U o 1.0 mL"
                className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[var(--text-secondary)] mb-1">
                Lote del Producto / Nota
              </label>
              <input
                type="text"
                value={dermaLot}
                onChange={(e) => setDermaLot(e.target.value)}
                placeholder="Ej: Lote BTX-4092"
                className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-[var(--text-primary)]"
              />
            </div>
            <button
              type="button"
              onClick={handleAddDermaPoint}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar en {dermaZone}
            </button>
          </div>

          {bodyMapEntries.length > 0 && (
            <div className="space-y-1.5">
              {bodyMapEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-3 py-1.5 text-xs"
                >
                  <div>
                    <span className="font-bold text-violet-500">{entry.zone}</span> ·{' '}
                    <span className="font-semibold text-[var(--text-primary)]">{entry.type}</span> —{' '}
                    <span className="text-[var(--text-secondary)]">
                      {entry.amount} ({entry.lot})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDermaPoint(entry.id)}
                    className="text-rose-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Regla Dermatoscópica ABCDE de Lunares */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <div className="text-xs font-bold text-[var(--text-primary)] mb-2">
              Evaluación Dermatoscópica — Regla ABCDE de Lesiones Pigmentadas
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { key: 'A' as const, label: 'A · Asimetría' },
                { key: 'B' as const, label: 'B · Bordes irregulares' },
                { key: 'C' as const, label: 'C · Color heterogéneo' },
                { key: 'D' as const, label: 'D · Diámetro > 6 mm' },
                { key: 'E' as const, label: 'E · Evolución / Cambio' },
              ].map((crit) => {
                const active = Boolean(abcde[crit.key]);
                return (
                  <button
                    key={crit.key}
                    type="button"
                    onClick={() => toggleAbcde(crit.key)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-rose-500/15 text-rose-500 border-rose-500/40'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {active ? '⚠ ' : ''}
                    {crit.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. TRAUMATOLOGÍA, ORTOPEDIA Y FISIOTERAPIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (specialtyId === 'med_traumatologia') {
    const jointZone = specialtyState.jointZone || TRAUMA_ZONES[5]; // Rodilla por defecto
    const laterality = specialtyState.laterality || 'Derecho';
    const evaPain = Number(specialtyState.evaPain ?? 4);
    const flexionDeg = Number(specialtyState.flexionDeg ?? 110);
    const extensionDeg = Number(specialtyState.extensionDeg ?? 0);
    const danielsStrength = specialtyState.danielsStrength || '4/5';
    const rehabCompleted = Number(specialtyState.rehabCompleted ?? 1);
    const rehabContracted = Number(specialtyState.rehabContracted ?? 5);
    const activeModalities: string[] = specialtyState.rehabModalities || ['Ultrasonido', 'TENS'];

    const toggleModality = (mod: string) => {
      const exists = activeModalities.includes(mod);
      updateField(
        'rehabModalities',
        exists ? activeModalities.filter((m) => m !== mod) : [...activeModalities, mod]
      );
    };

    const evaColor =
      evaPain >= 7 ? 'text-rose-500' : evaPain >= 4 ? 'text-amber-500' : 'text-emerald-500';

    return (
      <div className="space-y-5">
        {/* Evaluación Biomecánica, EVA, Goniometría y Fuerza de Daniels */}
        <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bone className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Evaluación Articular, Goniometría (ROM) y Fuerza Muscular de Daniels
              </h4>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
              {jointZone} ({laterality})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Zona Anatómica / Articulación
              </label>
              <select
                value={jointZone}
                onChange={(e) => updateField('jointZone', e.target.value)}
                className="w-full text-xs font-semibold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              >
                {TRAUMA_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Lateralidad
              </label>
              <div className="flex gap-1.5">
                {['Derecho', 'Izquierdo', 'Bilateral'].map((lat) => (
                  <button
                    key={lat}
                    type="button"
                    onClick={() => updateField('laterality', lat)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      laterality === lat
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                    }`}
                  >
                    {lat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Fuerza Muscular (Escala de Daniels 0/5 a 5/5)
              </label>
              <select
                value={danielsStrength}
                onChange={(e) => updateField('danielsStrength', e.target.value)}
                className="w-full text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-[var(--text-primary)]"
              >
                <option value="0/5">0/5 — Ausencia de contracción</option>
                <option value="1/5">1/5 — Contracción sin movimiento</option>
                <option value="2/5">2/5 — Movimiento sin gravedad</option>
                <option value="3/5">3/5 — Vence gravedad sin resistencia</option>
                <option value="4/5">4/5 — Vence resistencia moderada</option>
                <option value="5/5">5/5 — Fuerza muscular normal completa</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Escala Visual del Dolor (EVA 0–10)
                </span>
                <span className={`text-sm font-black ${evaColor}`}>{evaPain} / 10</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={evaPain}
                onChange={(e) => updateField('evaPain', Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Goniometría — Flexión (°)
              </label>
              <input
                type="number"
                min={0}
                max={180}
                value={flexionDeg}
                onChange={(e) => updateField('flexionDeg', Number(e.target.value))}
                className="w-full text-sm font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-primary)]"
              />
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3">
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Goniometría — Extensión (°)
              </label>
              <input
                type="number"
                min={-30}
                max={180}
                value={extensionDeg}
                onChange={(e) => updateField('extensionDeg', Number(e.target.value))}
                className="w-full text-sm font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-primary)]"
              />
            </div>
          </div>
        </div>

        {/* Contador de Paquete de Rehabilitación */}
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Control de Paquete de Rehabilitación Física & Fisioterapia
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-secondary)]">Sesiones:</span>
              <input
                type="number"
                min={0}
                max={50}
                value={rehabCompleted}
                onChange={(e) => updateField('rehabCompleted', Number(e.target.value))}
                className="w-14 text-center font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-secondary)]">de</span>
              <input
                type="number"
                min={1}
                max={50}
                value={rehabContracted}
                onChange={(e) => updateField('rehabContracted', Number(e.target.value))}
                className="w-14 text-center font-bold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded px-1.5 py-0.5 text-[var(--text-primary)]"
              />
              <span className="text-[var(--text-secondary)]">contratadas</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {REHAB_MODALITIES.map((mod) => {
              const isSelected = activeModalities.includes(mod);
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModality(mod)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                  }`}
                >
                  {isSelected ? '✓ ' : ''}
                  {mod}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. OFTALMOLOGÍA Y OPTOMETRÍA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const od = specialtyState.od || {
    avSc: '20/40',
    avCc: '20/20',
    sphere: -1.25,
    cylinder: -0.5,
    axis: 90,
    add: 0,
    iop: 15,
  };
  const oi = specialtyState.oi || {
    avSc: '20/30',
    avCc: '20/20',
    sphere: -1.0,
    cylinder: -0.25,
    axis: 85,
    add: 0,
    iop: 16,
  };
  const dpMm = Number(specialtyState.dpMm ?? 62);
  const biomicroscopy =
    specialtyState.biomicroscopy ||
    'Córnea transparente, cámara anterior formada y amplia (Van Herick IV), cristalino claro.';
  const fundusExam =
    specialtyState.fundusExam ||
    'Papila de bordes netos, excavación 0.3, mácula con brillo foveal conservado, retina aplicada.';

  const updateEye = (eyeKey: 'od' | 'oi', field: string, value: any) => {
    const targetEye = eyeKey === 'od' ? od : oi;
    updateField(eyeKey, {
      ...targetEye,
      [field]: value,
    });
  };

  const seOd = calculateSphericalEquivalent(Number(od.sphere), Number(od.cylinder));
  const seOi = calculateSphericalEquivalent(Number(oi.sphere), Number(oi.cylinder));
  const iopEval = evaluateIOP(Number(od.iop), Number(oi.iop));

  return (
    <div className="space-y-5">
      {/* Matriz de Refracción y Agudeza Visual OD / OI */}
      <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-transparent to-sky-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-cyan-500" />
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Matriz de Refracción Óptica y Agudeza Visual Snellen (OD / OI)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)]">
              Distancia Pupilar (DP mm):
            </label>
            <input
              type="number"
              min={45}
              max={80}
              value={dpMm}
              onChange={(e) => updateField('dpMm', Number(e.target.value))}
              className="w-16 text-xs font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-[var(--text-primary)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
                <th className="py-2 px-2 text-left">Ojo</th>
                <th className="py-2 px-2 text-left">AV s/c</th>
                <th className="py-2 px-2 text-left">AV c/c</th>
                <th className="py-2 px-2 text-left">Esfera (D)</th>
                <th className="py-2 px-2 text-left">Cilindro (D)</th>
                <th className="py-2 px-2 text-left">Eje (0°–180°)</th>
                <th className="py-2 px-2 text-left">Adición (ADD)</th>
                <th className="py-2 px-2 text-left">Eq. Esférico</th>
                <th className="py-2 px-2 text-left">PIO (mmHg)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {[
                { key: 'od' as const, label: 'OD (Derecho)', data: od, se: seOd },
                { key: 'oi' as const, label: 'OI (Izquierdo)', data: oi, se: seOi },
              ].map((row) => (
                <tr key={row.key}>
                  <td className="py-2.5 px-2 font-bold text-cyan-600">{row.label}</td>
                  <td className="py-2 px-2">
                    <select
                      value={row.data.avSc}
                      onChange={(e) => updateEye(row.key, 'avSc', e.target.value)}
                      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-primary)]"
                    >
                      {SNELLEN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={row.data.avCc}
                      onChange={(e) => updateEye(row.key, 'avCc', e.target.value)}
                      className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-1.5 py-1 text-[var(--text-primary)]"
                    >
                      {SNELLEN_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.25"
                      value={row.data.sphere}
                      onChange={(e) => updateEye(row.key, 'sphere', Number(e.target.value))}
                      className="w-20 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 font-bold text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.25"
                      value={row.data.cylinder}
                      onChange={(e) => updateEye(row.key, 'cylinder', Number(e.target.value))}
                      className="w-20 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 font-bold text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={0}
                      max={180}
                      value={row.data.axis}
                      onChange={(e) => updateEye(row.key, 'axis', Number(e.target.value))}
                      className="w-16 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 font-bold text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.25"
                      min={0}
                      max={4}
                      value={row.data.add}
                      onChange={(e) => updateEye(row.key, 'add', Number(e.target.value))}
                      className="w-16 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 font-bold text-[var(--text-primary)]"
                    />
                  </td>
                  <td className="py-2 px-2 font-black text-cyan-600">
                    {row.se >= 0 ? `+${row.se.toFixed(2)}` : row.se.toFixed(2)} D
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min={5}
                      max={60}
                      value={row.data.iop}
                      onChange={(e) => updateEye(row.key, 'iop', Number(e.target.value))}
                      className={`w-16 rounded px-2 py-1 font-bold border ${
                        Number(row.data.iop) > 21
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600'
                          : 'bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-primary)]'
                      }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerta de Tonometría PIO */}
        <div
          className={`mt-3 rounded-lg border px-3 py-2 flex items-center gap-2 text-xs font-semibold ${
            iopEval.hasAlert
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-600'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'
          }`}
        >
          {iopEval.hasAlert ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          )}
          <span>{iopEval.message}</span>
        </div>
      </div>

      {/* Biomicroscopía y Fondo de Ojo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Biomicroscopía en Lámpara de Hendidura (Segmento Anterior)
          </label>
          <textarea
            rows={2}
            value={biomicroscopy}
            onChange={(e) => updateField('biomicroscopy', e.target.value)}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)]"
          />
        </div>
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
          <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
            Oftalmoscopia / Fondo de Ojo (Polo Posterior y Retina)
          </label>
          <textarea
            rows={2}
            value={fundusExam}
            onChange={(e) => updateField('fundusExam', e.target.value)}
            className="w-full text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-2.5 text-[var(--text-primary)]"
          />
        </div>
      </div>
    </div>
  );
}
