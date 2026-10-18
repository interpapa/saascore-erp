'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, Save, Activity, Layers, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { calculateEllipsoidVolume } from '@/lib/ginecologia/biometryCalculators';

export interface GinecoUltrasoundReport {
  id?: string;
  date: string;
  patientId: string;
  patientName: string;
  // Útero
  uterusPosition: 'AVF' | 'RVF' | 'Indiferente';
  uterusLengthMm: number;
  uterusApMm: number;
  uterusTransverseMm: number;
  uterusVolumeCm3: number;
  myometriumPattern: 'Homogéneo' | 'Heterogéneo' | 'Miomatoso' | 'Adenomiótico';
  myomasDescription: string;
  // Endometrio
  endometriumThicknessMm: number;
  endometriumPattern: 'Trilaminar (Proliferativo)' | 'Secretor (Hiperecogénico)' | 'Atrófico' | 'Engrosado / Pólipo sospechoso';
  // Ovario Derecho
  ovaryRightLengthMm: number;
  ovaryRightApMm: number;
  ovaryRightTransverseMm: number;
  ovaryRightVolumeCm3: number;
  ovaryRightDescription: string;
  // Ovario Izquierdo
  ovaryLeftLengthMm: number;
  ovaryLeftApMm: number;
  ovaryLeftTransverseMm: number;
  ovaryLeftVolumeCm3: number;
  ovaryLeftDescription: string;
  // Fondo de saco y Vejiga
  douglasFluid: 'Libre / Sin líquido patológico' | 'Presencia de escaso líquido libre' | 'Líquido libre moderado a abundante' | 'Tabiques / Hemoperitoneo';
  bladderState: string;
  // Diagnóstico
  diagnosticImpression: string;
  suggestions: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorName: string;
  onSaveReport?: (report: GinecoUltrasoundReport) => void;
}

export function UltrasoundGinecoModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorName,
  onSaveReport,
}: Props) {
  const [report, setReport] = useState<GinecoUltrasoundReport>({
    date: new Date().toISOString().split('T')[0],
    patientId,
    patientName,
    uterusPosition: 'AVF',
    uterusLengthMm: 72,
    uterusApMm: 38,
    uterusTransverseMm: 45,
    uterusVolumeCm3: 64.2,
    myometriumPattern: 'Homogéneo',
    myomasDescription: 'Sin nódulos miomatosos evidentes.',
    endometriumThicknessMm: 7.2,
    endometriumPattern: 'Trilaminar (Proliferativo)',
    ovaryRightLengthMm: 30,
    ovaryRightApMm: 20,
    ovaryRightTransverseMm: 22,
    ovaryRightVolumeCm3: 6.9,
    ovaryRightDescription: 'Estroma normal con folículos periféricos de reserva habitual.',
    ovaryLeftLengthMm: 28,
    ovaryLeftApMm: 18,
    ovaryLeftTransverseMm: 20,
    ovaryLeftVolumeCm3: 5.3,
    ovaryLeftDescription: 'Parénquima ovárico de características sonográficas conservadas.',
    douglasFluid: 'Libre / Sin líquido patológico',
    bladderState: 'Vejiga en repleción fisiológica, paredes delgadas y regulares',
    diagnosticImpression: 'Estudio ecográfico ginecológico pélvico dentro de límites normales para la edad y fase del ciclo.',
    suggestions: 'Control ecográfico de rutina en 1 año.',
  });

  // Cálculo en vivo del volumen uterino
  const computedUterusVolume = useMemo(() => {
    return calculateEllipsoidVolume(report.uterusLengthMm, report.uterusApMm, report.uterusTransverseMm);
  }, [report.uterusLengthMm, report.uterusApMm, report.uterusTransverseMm]);

  // Cálculo en vivo del volumen ovárico derecho
  const computedRightOvaryVolume = useMemo(() => {
    return calculateEllipsoidVolume(
      report.ovaryRightLengthMm,
      report.ovaryRightApMm,
      report.ovaryRightTransverseMm
    );
  }, [report.ovaryRightLengthMm, report.ovaryRightApMm, report.ovaryRightTransverseMm]);

  // Cálculo en vivo del volumen ovárico izquierdo
  const computedLeftOvaryVolume = useMemo(() => {
    return calculateEllipsoidVolume(
      report.ovaryLeftLengthMm,
      report.ovaryLeftApMm,
      report.ovaryLeftTransverseMm
    );
  }, [report.ovaryLeftLengthMm, report.ovaryLeftApMm, report.ovaryLeftTransverseMm]);

  if (!isOpen) return null;

  const handleSave = () => {
    const finalReport = {
      ...report,
      uterusVolumeCm3: computedUterusVolume,
      ovaryRightVolumeCm3: computedRightOvaryVolume,
      ovaryLeftVolumeCm3: computedLeftOvaryVolume,
    };
    if (onSaveReport) {
      onSaveReport(finalReport);
    }
    onClose();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera Estilo Himego Moderno */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white flex items-center justify-center shadow-md">
              <Activity size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Ecografía Ginecológica Pélvica / Transvaginal</h2>
                <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 text-[10px] font-black uppercase tracking-wider">
                  Biometría 3D
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Paciente: <strong className="text-foreground">{patientName}</strong> | Médico: {doctorName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Imprimir Informe Ecográfico"
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

        {/* Cuerpo del Formulario Biométrico */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* SECCIÓN 1: ÚTERO & ENDOMETRIO */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-pink-600 dark:text-pink-400 flex items-center gap-2">
                <Layers size={14} /> 1. Biometría Uterina & Endometrio
              </h3>
              <div className="px-3 py-1 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-700 dark:text-pink-300 text-xs font-black font-mono">
                Volumen Calculado: {computedUterusVolume} cm³
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Posición Uterina</label>
                <select
                  value={report.uterusPosition}
                  onChange={(e) => setReport({ ...report, uterusPosition: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500"
                >
                  <option value="AVF">AVF (Anteversoflexión)</option>
                  <option value="RVF">RVF (Retroversoflexión)</option>
                  <option value="Indiferente">Indiferente / Eje medio</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Longitud (L mm)</label>
                <input
                  type="number"
                  value={report.uterusLengthMm}
                  onChange={(e) => setReport({ ...report, uterusLengthMm: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Anteroposterior (AP mm)</label>
                <input
                  type="number"
                  value={report.uterusApMm}
                  onChange={(e) => setReport({ ...report, uterusApMm: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Transverso (T mm)</label>
                <input
                  type="number"
                  value={report.uterusTransverseMm}
                  onChange={(e) => setReport({ ...report, uterusTransverseMm: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500 font-mono"
                />
              </div>
            </div>

            {/* Endometrio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Grosor Endometrio (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={report.endometriumThicknessMm}
                  onChange={(e) => setReport({ ...report, endometriumThicknessMm: Number(e.target.value) })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-black text-slate-500 block mb-1">Patrón Endometrial</label>
                <select
                  value={report.endometriumPattern}
                  onChange={(e) => setReport({ ...report, endometriumPattern: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500"
                >
                  <option value="Trilaminar (Proliferativo)">Trilaminar (Fase Proliferativa / Folicular)</option>
                  <option value="Secretor (Hiperecogénico)">Secretor Hiperecogénico (Fase Lútea)</option>
                  <option value="Atrófico">Atrófico / Delgado (Posmenopausia &lt; 4-5 mm)</option>
                  <option value="Engrosado / Pólipo sospechoso">Engrosado / Heterogéneo / Sospecha de Pólipo</option>
                </select>
              </div>
            </div>

            {/* Miometrio */}
            <div>
              <label className="text-[11px] font-black text-slate-500 block mb-1">Hallazgos Miometriales & Miomas</label>
              <input
                type="text"
                value={report.myomasDescription}
                onChange={(e) => setReport({ ...report, myomasDescription: e.target.value })}
                placeholder="Ej: Miometrio homogéneo sin nódulos o Mioma subseroso fúndico de 22 mm..."
                className="w-full text-xs font-medium p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* SECCIÓN 2: OVARIOS BILATERALES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ovario Derecho */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-foreground">Ovario Derecho</h4>
                <span className="text-[11px] font-mono font-black text-pink-600 dark:text-pink-400">
                  Vol: {computedRightOvaryVolume} cm³
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">L (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryRightLengthMm}
                    onChange={(e) => setReport({ ...report, ovaryRightLengthMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">AP (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryRightApMm}
                    onChange={(e) => setReport({ ...report, ovaryRightApMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">T (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryRightTransverseMm}
                    onChange={(e) => setReport({ ...report, ovaryRightTransverseMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
              </div>
              <input
                type="text"
                value={report.ovaryRightDescription}
                onChange={(e) => setReport({ ...report, ovaryRightDescription: e.target.value })}
                className="w-full text-xs p-2 rounded-lg bg-card border border-border outline-none text-slate-600 dark:text-slate-300"
              />
            </div>

            {/* Ovario Izquierdo */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase text-foreground">Ovario Izquierdo</h4>
                <span className="text-[11px] font-mono font-black text-pink-600 dark:text-pink-400">
                  Vol: {computedLeftOvaryVolume} cm³
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">L (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryLeftLengthMm}
                    onChange={(e) => setReport({ ...report, ovaryLeftLengthMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">AP (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryLeftApMm}
                    onChange={(e) => setReport({ ...report, ovaryLeftApMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">T (mm)</span>
                  <input
                    type="number"
                    value={report.ovaryLeftTransverseMm}
                    onChange={(e) => setReport({ ...report, ovaryLeftTransverseMm: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2 rounded-lg bg-card border border-border font-mono"
                  />
                </div>
              </div>
              <input
                type="text"
                value={report.ovaryLeftDescription}
                onChange={(e) => setReport({ ...report, ovaryLeftDescription: e.target.value })}
                className="w-full text-xs p-2 rounded-lg bg-card border border-border outline-none text-slate-600 dark:text-slate-300"
              />
            </div>
          </div>

          {/* SECCIÓN 3: DOUGLAS & VEJIGA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-black text-slate-500 block mb-1">Fondo de Saco de Douglas</label>
              <select
                value={report.douglasFluid}
                onChange={(e) => setReport({ ...report, douglasFluid: e.target.value as any })}
                className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500"
              >
                <option value="Libre / Sin líquido patológico">Libre / Sin líquido patológico</option>
                <option value="Presencia de escaso líquido libre">Presencia de escaso líquido libre fisiológico</option>
                <option value="Líquido libre moderado a abundante">Líquido libre moderado a abundante</option>
                <option value="Tabiques / Hemoperitoneo">Tabiques / Hemoperitoneo sospechoso</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 block mb-1">Vejiga Urinaria</label>
              <input
                type="text"
                value={report.bladderState}
                onChange={(e) => setReport({ ...report, bladderState: e.target.value })}
                className="w-full text-xs font-medium p-2.5 rounded-xl bg-card border border-border outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* SECCIÓN 4: IMPRESIÓN DIAGNÓSTICA Y SUGERENCIAS */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Impresión Diagnóstica Ecográfica</label>
              <textarea
                rows={2}
                value={report.diagnosticImpression}
                onChange={(e) => setReport({ ...report, diagnosticImpression: e.target.value })}
                className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-pink-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="text-xs font-black text-foreground block mb-1">Sugerencias y Conducta</label>
              <input
                type="text"
                value={report.suggestions}
                onChange={(e) => setReport({ ...report, suggestions: e.target.value })}
                className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-pink-500 shadow-2xs"
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
            className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-pink-500/20 transition-all btn-haptic"
          >
            <Save size={16} /> Guardar Informe Ecográfico
          </button>
        </div>
      </div>
    </div>
  );
}
