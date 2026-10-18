'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, Save, Baby, Heart, Layers, Activity, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  calculateEllipsoidVolume,
  calculateGAFromCRL,
  calculateGAFromBPD,
  calculateGAFromHC,
  calculateGAFromAC,
  calculateGAFromFL,
  calculateEFW,
  calculateAverageGA,
  evaluateAmnioticFluid,
  evaluateNuchalTranslucency,
} from '@/lib/ginecologia/biometryCalculators';
import { GRANNUM_PLACENTA_GRADES } from '@/lib/ginecologia/clinicalConstants';

export interface ObstetricUltrasoundReport {
  id?: string;
  date: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  trimestre: 'I' | 'II-III';

  // I TRIMESTRE
  gestationalSacLengthMm: number;
  gestationalSacApMm: number;
  gestationalSacTransverseMm: number;
  gestationalSacVolumeCm3: number;
  crlMm: number; // LCR en mm
  gaByCrl: string;
  nuchalTranslucencyMm: number; // TN en mm
  nasalBonePresent: boolean;
  uterineDopplerNotch: 'Ausente bilateral' | 'Presente unilateral' | 'Presente bilateral (Riesgo Preeclampsia)';
  fetalHeartRateBpm: number;

  // II y III TRIMESTRE
  presentation: 'Cefálico' | 'Podálico' | 'Transversa' | 'Pelviano';
  situation: 'Longitudinal' | 'Transversa' | 'Oblicua';
  position: 'Dorso Derecho' | 'Dorso Izquierdo' | 'Dorso Anterior' | 'Dorso Posterior';
  placentaLocation: 'Anterior' | 'Posterior' | 'Fúndica' | 'Previa Marginal' | 'Previa Oclusiva Total';
  placentaGrannum: '0' | 'I' | 'II' | 'III';
  placentaThicknessMm: number;
  amnioticFluidIlaMm: number; // Phelan
  // Checklist Anatómico 10 puntos
  anatomyChecklist: {
    bodyMovements: boolean;
    breathingMovements: boolean;
    brainStructures: boolean;
    symmetricThorax: boolean;
    heartFourChambers: boolean;
    kidneysBilateral: boolean;
    digestiveTract: boolean;
    umbilicalCordThreeVessels: boolean;
    bladderVisible: boolean;
    stomachVisible: boolean;
  };
  // Biometría Hadlock
  bpdMm: number; // DBP
  hcMm: number;  // CC
  acMm: number;  // CA
  flMm: number;  // Fémur
  humerusMm: number;
  cerebellumMm: number;
  // Conclusiones
  estimatedFetalWeightGrams: number;
  averageGestationalAge: string;
  diagnosticImpression: string;
  suggestions: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorName: string;
  onSaveReport?: (report: ObstetricUltrasoundReport) => void;
}

export function UltrasoundObstetricModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorName,
  onSaveReport,
}: Props) {
  const [report, setReport] = useState<ObstetricUltrasoundReport>({
    date: new Date().toISOString().split('T')[0],
    patientId,
    patientName,
    doctorName,
    trimestre: 'II-III',
    // I Trimestre
    gestationalSacLengthMm: 35,
    gestationalSacApMm: 25,
    gestationalSacTransverseMm: 28,
    gestationalSacVolumeCm3: 12.8,
    crlMm: 55,
    gaByCrl: '12+1 sem',
    nuchalTranslucencyMm: 1.4,
    nasalBonePresent: true,
    uterineDopplerNotch: 'Ausente bilateral',
    fetalHeartRateBpm: 142,
    // II-III Trimestre
    presentation: 'Cefálico',
    situation: 'Longitudinal',
    position: 'Dorso Izquierdo',
    placentaLocation: 'Anterior',
    placentaGrannum: 'II',
    placentaThicknessMm: 32,
    amnioticFluidIlaMm: 130, // 13 cm
    anatomyChecklist: {
      bodyMovements: true,
      breathingMovements: true,
      brainStructures: true,
      symmetricThorax: true,
      heartFourChambers: true,
      kidneysBilateral: true,
      digestiveTract: true,
      umbilicalCordThreeVessels: true,
      bladderVisible: true,
      stomachVisible: true,
    },
    bpdMm: 78,
    hcMm: 285,
    acMm: 260,
    flMm: 58,
    humerusMm: 52,
    cerebellumMm: 32,
    estimatedFetalWeightGrams: 1650,
    averageGestationalAge: '30+2 sem',
    diagnosticImpression: 'Gestación intrauterina simple, feto en presentación cefálica, crecimiento acorde para la edad gestacional.',
    suggestions: 'Continuar control prenatal habitual y suplementación vitamínica.',
  });

  // Cálculos I Trimestre
  const computedSacVolume = useMemo(() => {
    return calculateEllipsoidVolume(
      report.gestationalSacLengthMm,
      report.gestationalSacApMm,
      report.gestationalSacTransverseMm
    );
  }, [report.gestationalSacLengthMm, report.gestationalSacApMm, report.gestationalSacTransverseMm]);

  const gaFromCrl = useMemo(() => {
    return calculateGAFromCRL(report.crlMm);
  }, [report.crlMm]);

  const ntEvaluation = useMemo(() => {
    return evaluateNuchalTranslucency(report.nuchalTranslucencyMm);
  }, [report.nuchalTranslucencyMm]);

  // Cálculos II-III Trimestre Hadlock
  const gaBpd = useMemo(() => calculateGAFromBPD(report.bpdMm), [report.bpdMm]);
  const gaHc = useMemo(() => calculateGAFromHC(report.hcMm), [report.hcMm]);
  const gaAc = useMemo(() => calculateGAFromAC(report.acMm), [report.acMm]);
  const gaFl = useMemo(() => calculateGAFromFL(report.flMm), [report.flMm]);

  const efw = useMemo(() => {
    return calculateEFW(report.bpdMm, report.hcMm, report.acMm, report.flMm);
  }, [report.bpdMm, report.hcMm, report.acMm, report.flMm]);

  const averageGA = useMemo(() => {
    return calculateAverageGA([gaBpd, gaHc, gaAc, gaFl]);
  }, [gaBpd, gaHc, gaAc, gaFl]);

  const afiEvaluation = useMemo(() => {
    return evaluateAmnioticFluid(report.amnioticFluidIlaMm);
  }, [report.amnioticFluidIlaMm]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalReport: ObstetricUltrasoundReport = {
      ...report,
      gestationalSacVolumeCm3: computedSacVolume,
      gaByCrl: gaFromCrl.formatted,
      estimatedFetalWeightGrams: efw.weightGrams,
      averageGestationalAge: report.trimestre === 'I' ? gaFromCrl.formatted : averageGA.formatted,
    };
    if (onSaveReport) {
      onSaveReport(finalReport);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera con selector de Trimestre estilo Himego */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-blue-500/10 via-pink-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Baby size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Ecografía Obstétrica Especializada</h2>
                {/* Selector de Trimestre */}
                <div className="flex bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-black">
                  <button
                    onClick={() => setReport({ ...report, trimestre: 'I' })}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      report.trimestre === 'I' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    I Trimestre
                  </button>
                  <button
                    onClick={() => setReport({ ...report, trimestre: 'II-III' })}
                    className={`px-2.5 py-0.5 rounded-md transition-all ${
                      report.trimestre === 'II-III' ? 'bg-white dark:bg-slate-900 text-pink-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    II y III Trimestre
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Paciente: <strong className="text-foreground">{patientName}</strong> | Médico: {doctorName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo del Formulario */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* VISTA 1: I TRIMESTRE (LCR / CRL & CRIBADO) */}
          {report.trimestre === 'I' && (
            <div className="space-y-5">
              {/* Saco Gestacional & LCR */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Activity size={14} /> Biometría Temprana I Trimestre
                  </h3>
                  <div className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-black font-mono">
                    EG por LCR: {gaFromCrl.formatted}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">LCR / CRL (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={report.crlMm}
                      onChange={(e) => setReport({ ...report, crlMm: Number(e.target.value) })}
                      className="w-full text-xs font-black p-2.5 rounded-xl bg-card border border-border outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">Saco Gestacional (L mm)</label>
                    <input
                      type="number"
                      value={report.gestationalSacLengthMm}
                      onChange={(e) => setReport({ ...report, gestationalSacLengthMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">Saco AP (mm)</label>
                    <input
                      type="number"
                      value={report.gestationalSacApMm}
                      onChange={(e) => setReport({ ...report, gestationalSacApMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">Saco Transverso (mm)</label>
                    <input
                      type="number"
                      value={report.gestationalSacTransverseMm}
                      onChange={(e) => setReport({ ...report, gestationalSacTransverseMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Marcadores de Aneuploidía */}
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-4">
                <h3 className="text-xs font-black uppercase text-foreground flex items-center gap-2">
                  <Sparkles size={14} /> Marcadores Cromosómicos & Doppler
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-slate-500">Translucencia Nucal (TN mm)</label>
                      <span className="text-[10px] font-bold" style={{ color: ntEvaluation.color }}>
                        {ntEvaluation.alert ? 'Alerta' : 'Normal'}
                      </span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={report.nuchalTranslucencyMm}
                      onChange={(e) => setReport({ ...report, nuchalTranslucencyMm: Number(e.target.value) })}
                      className="w-full text-xs font-black p-2.5 rounded-xl bg-card border border-border outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">Hueso Nasal</label>
                    <select
                      value={report.nasalBonePresent ? 'present' : 'absent'}
                      onChange={(e) => setReport({ ...report, nasalBonePresent: e.target.value === 'present' })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                    >
                      <option value="present">Presente (Signo de normalidad)</option>
                      <option value="absent">Ausente / Hipoplásico (Alerta)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-slate-500 block mb-1">FCF Fetal (lpm)</label>
                    <input
                      type="number"
                      value={report.fetalHeartRateBpm}
                      onChange={(e) => setReport({ ...report, fetalHeartRateBpm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Doppler Arterias Uterinas (Notch)</label>
                  <select
                    value={report.uterineDopplerNotch}
                    onChange={(e) => setReport({ ...report, uterineDopplerNotch: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  >
                    <option value="Ausente bilateral">Ausente bilateral (Bajo riesgo de Preeclampsia)</option>
                    <option value="Presente unilateral">Presente unilateral</option>
                    <option value="Presente bilateral (Riesgo Preeclampsia)">Presente bilateral (Alerta de Riesgo)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: II Y III TRIMESTRE (HADLOCK, ANATOMÍA & PLACENTA) */}
          {report.trimestre === 'II-III' && (
            <div className="space-y-5">
              {/* Cintillo de Resultados Hadlock Reactivo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-pink-500/20">
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Edad Gestacional Prom.</span>
                  <p className="text-base font-black text-pink-600 dark:text-pink-400 font-mono mt-0.5">
                    {averageGA.formatted}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Peso Fetal Estimado</span>
                  <p className="text-base font-black text-foreground font-mono mt-0.5">
                    {efw.weightGrams > 0 ? `${efw.weightGrams} g` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Líquido Amniótico</span>
                  <p className="text-xs font-black block mt-1" style={{ color: afiEvaluation.color }}>
                    {afiEvaluation.label}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Presentación / Dorso</span>
                  <p className="text-xs font-black text-foreground truncate mt-1">
                    {report.presentation} / {report.position}
                  </p>
                </div>
              </div>

              {/* Estática Fetal & Placenta */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-foreground">Estática Fetal & Placenta</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Presentación</label>
                    <select
                      value={report.presentation}
                      onChange={(e) => setReport({ ...report, presentation: e.target.value as any })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                    >
                      <option value="Cefálico">Cefálico</option>
                      <option value="Podálico">Podálico</option>
                      <option value="Pelviano">Pelviano</option>
                      <option value="Transversa">Transversa</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Situación</label>
                    <select
                      value={report.situation}
                      onChange={(e) => setReport({ ...report, situation: e.target.value as any })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                    >
                      <option value="Longitudinal">Longitudinal</option>
                      <option value="Transversa">Transversa</option>
                      <option value="Oblicua">Oblicua</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Posición / Dorso</label>
                    <select
                      value={report.position}
                      onChange={(e) => setReport({ ...report, position: e.target.value as any })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                    >
                      <option value="Dorso Izquierdo">Dorso Izquierdo</option>
                      <option value="Dorso Derecho">Dorso Derecho</option>
                      <option value="Dorso Anterior">Dorso Anterior</option>
                      <option value="Dorso Posterior">Dorso Posterior</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Placenta (Grannum)</label>
                    <select
                      value={report.placentaGrannum}
                      onChange={(e) => setReport({ ...report, placentaGrannum: e.target.value as any })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                    >
                      {GRANNUM_PLACENTA_GRADES.map((g) => (
                        <option key={g.grade} value={g.grade}>
                          Grado {g.grade}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Ubicación Placenta</label>
                    <select
                      value={report.placentaLocation}
                      onChange={(e) => setReport({ ...report, placentaLocation: e.target.value as any })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                    >
                      <option value="Anterior">Anterior</option>
                      <option value="Posterior">Posterior</option>
                      <option value="Fúndica">Fúndica</option>
                      <option value="Previa Marginal">Previa Marginal</option>
                      <option value="Previa Oclusiva Total">Previa Oclusiva Total</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Espesor Placenta (mm)</label>
                    <input
                      type="number"
                      value={report.placentaThicknessMm}
                      onChange={(e) => setReport({ ...report, placentaThicknessMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">ILA Phelan (mm)</label>
                    <input
                      type="number"
                      value={report.amnioticFluidIlaMm}
                      onChange={(e) => setReport({ ...report, amnioticFluidIlaMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Biometría Hadlock */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-foreground">Biometría Fetal Hadlock (mm)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                      <span>DBP (mm)</span>
                      <span className="text-pink-600 font-mono">{gaBpd.formatted}</span>
                    </div>
                    <input
                      type="number"
                      value={report.bpdMm}
                      onChange={(e) => setReport({ ...report, bpdMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                      <span>CC (mm)</span>
                      <span className="text-pink-600 font-mono">{gaHc.formatted}</span>
                    </div>
                    <input
                      type="number"
                      value={report.hcMm}
                      onChange={(e) => setReport({ ...report, hcMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                      <span>CA (mm)</span>
                      <span className="text-pink-600 font-mono">{gaAc.formatted}</span>
                    </div>
                    <input
                      type="number"
                      value={report.acMm}
                      onChange={(e) => setReport({ ...report, acMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 mb-1">
                      <span>LF / Fémur (mm)</span>
                      <span className="text-pink-600 font-mono">{gaFl.formatted}</span>
                    </div>
                    <input
                      type="number"
                      value={report.flMm}
                      onChange={(e) => setReport({ ...report, flMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Húmero (mm)</label>
                    <input
                      type="number"
                      value={report.humerusMm}
                      onChange={(e) => setReport({ ...report, humerusMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Diám. Cerebeloso (mm)</label>
                    <input
                      type="number"
                      value={report.cerebellumMm}
                      onChange={(e) => setReport({ ...report, cerebellumMm: Number(e.target.value) })}
                      className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Checklist de Anatomía Fetal 10 Estructuras Himego */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
                <h4 className="text-xs font-black uppercase text-foreground">
                  Checklist Anatómico Sistemático (10 Órganos)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: 'bodyMovements', label: 'Mov. Corporales' },
                    { key: 'breathingMovements', label: 'Mov. Respiratorios' },
                    { key: 'brainStructures', label: 'Cerebro / Ventrículos' },
                    { key: 'symmetricThorax', label: 'Tórax Simétrico' },
                    { key: 'heartFourChambers', label: 'Corazón 4 Cámaras' },
                    { key: 'kidneysBilateral', label: 'Riñones Bilaterales' },
                    { key: 'digestiveTract', label: 'Tracto Intestinal' },
                    { key: 'umbilicalCordThreeVessels', label: 'Cordón 3 Vasos' },
                    { key: 'bladderVisible', label: 'Vejiga Llena' },
                    { key: 'stomachVisible', label: 'Estómago Visible' },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border text-[11px] font-bold cursor-pointer hover:border-pink-500/50"
                    >
                      <input
                        type="checkbox"
                        checked={(report.anatomyChecklist as any)[item.key]}
                        onChange={(e) =>
                          setReport({
                            ...report,
                            anatomyChecklist: {
                              ...report.anatomyChecklist,
                              [item.key]: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-pink-600 focus:ring-0"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Diagnóstico y Sugerencias Comunes */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Impresión Diagnóstica</label>
              <textarea
                rows={2}
                value={report.diagnosticImpression}
                onChange={(e) => setReport({ ...report, diagnosticImpression: e.target.value })}
                className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Sugerencias y Conducta</label>
              <input
                type="text"
                value={report.suggestions}
                onChange={(e) => setReport({ ...report, suggestions: e.target.value })}
                className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="px-6 py-4 border-t border-border bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-foreground transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all btn-haptic"
          >
            <Save size={16} /> Guardar Informe Obstétrico
          </button>
        </div>
      </div>
    </div>
  );
}
