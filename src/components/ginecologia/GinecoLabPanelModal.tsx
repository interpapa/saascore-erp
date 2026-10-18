'use client';

import React, { useState } from 'react';
import { X, Printer, Save, FlaskConical, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface GinecoLabRecord {
  date: string;
  patientId: string;
  patientName: string;
  doctorName: string;

  // Hematología
  hemoglobin: number | '';
  hematocrit: number | '';
  platelets: number | '';

  // Química & Renal
  glycemia: number | '';
  creatinine: number | '';
  urea: number | '';
  uricAcid: number | '';

  // Lípidos
  cholesterolTotal: number | '';
  cholesterolHdl: number | '';
  cholesterolLdl: number | '';
  cholesterolVldl: number | '';
  triglycerides: number | '';

  // Hepático & Tiroideo
  tgo: number | '';
  tgp: number | '';
  tsh: number | '';
  t4Free: number | '';

  // Coagulación
  tpSeconds: number | '';
  tptSeconds: number | '';

  // Serología
  vdrl: 'No Reactivo' | 'Reactivo (1 dils)' | 'Reactivo (2 dils)' | 'Reactivo (4+ dils)';
  hiv: 'No Reactivo' | 'Reactivo';
  toxoIgg: 'Negativo' | 'Positivo';
  toxoIgm: 'Negativo' | 'Positivo (Riesgo Agudo)';

  // Orina & Heces
  urineNotes: string;
  fecesNotes: string;
  otherNotes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorName: string;
  onSaveLab?: (record: GinecoLabRecord) => void;
}

export function GinecoLabPanelModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorName,
  onSaveLab,
}: Props) {
  const [lab, setLab] = useState<GinecoLabRecord>({
    date: new Date().toISOString().split('T')[0],
    patientId,
    patientName,
    doctorName,
    hemoglobin: 12.4,
    hematocrit: 37.2,
    platelets: 245000,
    glycemia: 88,
    creatinine: 0.75,
    urea: 24,
    uricAcid: 3.8,
    cholesterolTotal: 185,
    cholesterolHdl: 52,
    cholesterolLdl: 110,
    cholesterolVldl: 23,
    triglycerides: 115,
    tgo: 22,
    tgp: 20,
    tsh: 1.85,
    t4Free: 1.15,
    tpSeconds: 12.2,
    tptSeconds: 28.5,
    vdrl: 'No Reactivo',
    hiv: 'No Reactivo',
    toxoIgg: 'Positivo',
    toxoIgm: 'Negativo',
    urineNotes: 'Aspecto límpido, densidad 1015, pH 6.0, leucocitos 0-2 x campo, bacterias escasas, proteínas negativo.',
    fecesNotes: 'Color pardo, consistencia blanda, sin parásitos observados.',
    otherNotes: 'Perfil serológico obstétrico sin signos de infección aguda.',
  });

  if (!isOpen) return null;

  // Alerta de Toxoplasmosis Aguda
  const hasToxoAgudaAlert = lab.toxoIgm === 'Positivo (Riesgo Agudo)';
  // Alerta de Anemia
  const hasAnemiaAlert = typeof lab.hemoglobin === 'number' && lab.hemoglobin < 11.0;
  // Alerta de Preeclampsia / Ácido Úrico
  const hasUricAcidAlert = typeof lab.uricAcid === 'number' && lab.uricAcid > 5.5;

  const handleSave = () => {
    if (onSaveLab) {
      onSaveLab(lab);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
              <FlaskConical size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Laboratorio Clínico Paramétrico</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                  Himego Lab Panel
                </span>
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

        {/* Alertas Médicas Automáticas */}
        {(hasToxoAgudaAlert || hasAnemiaAlert || hasUricAcidAlert) && (
          <div className="px-6 pt-3 flex flex-wrap gap-2">
            {hasToxoAgudaAlert && (
              <div className="p-2 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-black flex items-center gap-1.5 animate-pulse">
                <ShieldAlert size={15} /> ALERTA: Toxoplasmosis IgM Positiva (Posible Infección Gestacional Aguda - Solicitar Test de Avidez)
              </div>
            )}
            {hasAnemiaAlert && (
              <div className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black flex items-center gap-1.5">
                <AlertTriangle size={15} /> Hb &lt; 11.0 g% (Anemia Gestacional - Indicar Suplementación de Hierro)
              </div>
            )}
            {hasUricAcidAlert && (
              <div className="p-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black flex items-center gap-1.5">
                <AlertTriangle size={15} /> Ácido Úrico &gt; 5.5 mg/dl (Criterio de Alerta para Preeclampsia)
              </div>
            )}
          </div>
        )}

        {/* Formulario de Parámetros */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* BLOQUE 1: HEMATOLOGÍA & QUÍMICA SANGUÍNEA */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
            <h3 className="text-xs font-black uppercase text-foreground">1. Hematología & Función Renal/Metabólica</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Hemoglobina (g%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lab.hemoglobin}
                  onChange={(e) => setLab({ ...lab, hemoglobin: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Hematocrito (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lab.hematocrit}
                  onChange={(e) => setLab({ ...lab, hematocrit: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Plaquetas (/mm³)</label>
                <input
                  type="number"
                  value={lab.platelets}
                  onChange={(e) => setLab({ ...lab, platelets: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Glicemia (mg/dl)</label>
                <input
                  type="number"
                  value={lab.glycemia}
                  onChange={(e) => setLab({ ...lab, glycemia: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Creatinina (mg/dl)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lab.creatinine}
                  onChange={(e) => setLab({ ...lab, creatinine: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Urea (mg/dl)</label>
                <input
                  type="number"
                  value={lab.urea}
                  onChange={(e) => setLab({ ...lab, urea: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Ácido Úrico (mg/dl)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lab.uricAcid}
                  onChange={(e) => setLab({ ...lab, uricAcid: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 2: SEROLOGÍA OBSTÉTRICA & COAGULACIÓN */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
            <h3 className="text-xs font-black uppercase text-foreground">2. Serología Obstétrica & Coagulación</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">VDRL / Sífilis</label>
                <select
                  value={lab.vdrl}
                  onChange={(e) => setLab({ ...lab, vdrl: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo (1 dils)">Reactivo (1 dils)</option>
                  <option value="Reactivo (2 dils)">Reactivo (2 dils)</option>
                  <option value="Reactivo (4+ dils)">Reactivo (4+ dils)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">VIH (ELISA / Rápida)</label>
                <select
                  value={lab.hiv}
                  onChange={(e) => setLab({ ...lab, hiv: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="No Reactivo">No Reactivo</option>
                  <option value="Reactivo">Reactivo (Confirmar)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Toxoplasmosis IgG</label>
                <select
                  value={lab.toxoIgg}
                  onChange={(e) => setLab({ ...lab, toxoIgg: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="Positivo">Positivo (Inmunidad previa)</option>
                  <option value="Negativo">Negativo (Susceptible)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Toxoplasmosis IgM</label>
                <select
                  value={lab.toxoIgm}
                  onChange={(e) => setLab({ ...lab, toxoIgm: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="Negativo">Negativo (Sin infección aguda)</option>
                  <option value="Positivo (Riesgo Agudo)">Positivo (Riesgo Agudo)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">TP (segundos)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lab.tpSeconds}
                  onChange={(e) => setLab({ ...lab, tpSeconds: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">TPT (segundos)</label>
                <input
                  type="number"
                  step="0.1"
                  value={lab.tptSeconds}
                  onChange={(e) => setLab({ ...lab, tptSeconds: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">TSH (mcU/ml)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lab.tsh}
                  onChange={(e) => setLab({ ...lab, tsh: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">T4 Libre (mcg/dl)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lab.t4Free}
                  onChange={(e) => setLab({ ...lab, t4Free: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 3: UROANÁLISIS Y COPROANÁLISIS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Examen General de Orina</label>
              <textarea
                rows={2}
                value={lab.urineNotes}
                onChange={(e) => setLab({ ...lab, urineNotes: e.target.value })}
                className="w-full text-xs font-medium p-2.5 rounded-xl bg-card border border-border outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Examen de Heces / Otros</label>
              <textarea
                rows={2}
                value={lab.fecesNotes}
                onChange={(e) => setLab({ ...lab, fecesNotes: e.target.value })}
                className="w-full text-xs font-medium p-2.5 rounded-xl bg-card border border-border outline-none focus:border-emerald-500"
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
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all btn-haptic"
          >
            <Save size={16} /> Guardar Parámetros de Laboratorio
          </button>
        </div>
      </div>
    </div>
  );
}
