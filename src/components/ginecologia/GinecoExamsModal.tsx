'use client';

import React, { useState } from 'react';
import { X, Printer, Save, FileText, Microscope, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import {
  BETHESDA_2014_CATEGORIES,
  VAGINAL_MICROORGANISMS,
  BIRADS_CATEGORIES,
} from '@/lib/ginecologia/clinicalConstants';

export interface GinecoExamsData {
  // Citología
  cytologySampleDate: string;
  cytologySampleType: 'Cervical Exo/Endo' | 'Vaginal' | 'Cérvico-Vaginal' | 'Secreción Mamaria' | 'Aspiración TU Mamario';
  cytologyAdequacy: 'Satisfactoria (Zona de transformación presente)' | 'Satisfactoria (Sin células endocervicales)' | 'Insatisfactoria para evaluación';
  cytologyBethesdaCode: string;
  cytologyMicroorganisms: string[];
  cytologyObservations: string;

  // Biopsia
  biopsyDate: string;
  biopsyLocation: 'Cuello Uterino (Cérvix)' | 'Endometrio (Cánula Pipelle)' | 'Vulva / Vagina' | 'Mama';
  biopsyPathologyResult: string;
  biopsyPathologist: string;

  // Mamografía & Eco Mamario
  mammoDate: string;
  mammoBiradsCode: string;
  mammoFindings: string;
  mammoAxillaryLymphNodes: 'Axilas libres de adenopatías sospechosas' | 'Adenopatía reactiva inespecífica' | 'Adenopatía patológica / sospechosa';

  // Densitometría Ósea
  dexaDate: string;
  dexaSpineTScore: number;
  dexaFemurTScore: number;
  dexaDiagnosis: 'Normal' | 'Osteopenia' | 'Osteoporosis';
  dexaTreatmentNotes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorName: string;
  onSaveExams?: (data: GinecoExamsData) => void;
}

type TabKey = 'citologia' | 'biopsia' | 'mamografia' | 'densitometria';

export function GinecoExamsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorName,
  onSaveExams,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('citologia');

  const [examsData, setExamsData] = useState<GinecoExamsData>({
    cytologySampleDate: new Date().toISOString().split('T')[0],
    cytologySampleType: 'Cervical Exo/Endo',
    cytologyAdequacy: 'Satisfactoria (Zona de transformación presente)',
    cytologyBethesdaCode: 'NILM',
    cytologyMicroorganisms: ['Lactobacillus sp. (Flora bacilar fisiológica normal)'],
    cytologyObservations: 'Células escamosas superficiales e intermedias maduras.',

    biopsyDate: new Date().toISOString().split('T')[0],
    biopsyLocation: 'Cuello Uterino (Cérvix)',
    biopsyPathologyResult: 'Cervicitis crónica inespecífica. Negativo para neoplasia.',
    biopsyPathologist: 'Dr. Patólogo / Laboratorio Central',

    mammoDate: new Date().toISOString().split('T')[0],
    mammoBiradsCode: '1',
    mammoFindings: 'Patrón fibroglandular simétrico bilateral sin masas ni calcificaciones pleomórficas.',
    mammoAxillaryLymphNodes: 'Axilas libres de adenopatías sospechosas',

    dexaDate: new Date().toISOString().split('T')[0],
    dexaSpineTScore: -0.8,
    dexaFemurTScore: -0.5,
    dexaDiagnosis: 'Normal',
    dexaTreatmentNotes: 'Dieta adecuada en lácteos y exposición solar moderada.',
  });

  if (!isOpen) return null;

  const currentBethesda = BETHESDA_2014_CATEGORIES.find((b) => b.code === examsData.cytologyBethesdaCode);

  const toggleMicroorganism = (micro: string) => {
    setExamsData((prev) => {
      const exists = prev.cytologyMicroorganisms.includes(micro);
      if (exists) {
        return { ...prev, cytologyMicroorganisms: prev.cytologyMicroorganisms.filter((m) => m !== micro) };
      } else {
        return { ...prev, cytologyMicroorganisms: [...prev.cytologyMicroorganisms, micro] };
      }
    });
  };

  const handleSave = () => {
    if (onSaveExams) {
      onSaveExams(examsData);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 text-white flex items-center justify-center shadow-md">
              <Microscope size={22} />
            </div>
            <div>
              <h2 className="text-base font-black text-foreground">Exámenes Ginecológicos Especializados</h2>
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

        {/* Barra de Pestañas Himego: Citologías / Biopsias / Mamografías / Densitometrías */}
        <div className="px-6 pt-3 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto">
          {[
            { key: 'citologia', label: '1. Citologías (Bethesda)' },
            { key: 'biopsia', label: '2. Biopsias' },
            { key: 'mamografia', label: '3. Mamografías (BIRADS)' },
            { key: 'densitometria', label: '4. Densitometrías' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-purple-600 text-purple-600 bg-card shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de la pestaña activa */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PESTAÑA 1: CITOLOGÍA BETHESDA */}
          {activeTab === 'citologia' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Fecha de la Muestra</label>
                  <input
                    type="date"
                    value={examsData.cytologySampleDate}
                    onChange={(e) => setExamsData({ ...examsData, cytologySampleDate: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Tipo de Muestra</label>
                  <select
                    value={examsData.cytologySampleType}
                    onChange={(e) => setExamsData({ ...examsData, cytologySampleType: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  >
                    <option value="Cervical Exo/Endo">Cervical Exo/Endo (PAP convencional)</option>
                    <option value="Vaginal">Vaginal</option>
                    <option value="Cérvico-Vaginal">Cérvico-Vaginal</option>
                    <option value="Secreción Mamaria">Secreción Mamaria</option>
                    <option value="Aspiración TU Mamario">Aspiración TU Mamario</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Adecuación del Frotis</label>
                  <select
                    value={examsData.cytologyAdequacy}
                    onChange={(e) => setExamsData({ ...examsData, cytologyAdequacy: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  >
                    <option value="Satisfactoria (Zona de transformación presente)">Satisfactoria (Zona T presente)</option>
                    <option value="Satisfactoria (Sin células endocervicales)">Satisfactoria (Sin endocérvix)</option>
                    <option value="Insatisfactoria para evaluación">Insatisfactoria (Hemorragia/Fijación)</option>
                  </select>
                </div>
              </div>

              {/* Categoría Bethesda */}
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                <label className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                  Diagnóstico Citológico - Sistema Bethesda 2014
                </label>
                <select
                  value={examsData.cytologyBethesdaCode}
                  onChange={(e) => setExamsData({ ...examsData, cytologyBethesdaCode: e.target.value })}
                  className="w-full text-xs font-black p-3 rounded-xl bg-card border border-border text-foreground"
                >
                  {BETHESDA_2014_CATEGORIES.map((b) => (
                    <option key={b.code} value={b.code}>
                      [{b.code}] {b.label}
                    </option>
                  ))}
                </select>
                {currentBethesda && (
                  <div className="p-3 rounded-xl bg-card/80 border border-border/80 text-xs space-y-1">
                    <p className="text-slate-600 dark:text-slate-300">{currentBethesda.description}</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">
                      Conducta sugerida: {currentBethesda.recommendation}
                    </p>
                  </div>
                )}
              </div>

              {/* Microorganismos */}
              <div className="space-y-2">
                <label className="text-xs font-black text-foreground block">
                  Microorganismos / Flora Vaginal Identificada
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VAGINAL_MICROORGANISMS.map((micro) => {
                    const checked = examsData.cytologyMicroorganisms.includes(micro);
                    return (
                      <button
                        key={micro}
                        type="button"
                        onClick={() => toggleMicroorganism(micro)}
                        className={`text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                          checked
                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300'
                            : 'bg-card border-border text-slate-500 hover:border-slate-400'
                        }`}
                      >
                        <span className="truncate pr-2">{micro}</span>
                        {checked && <ShieldCheck size={14} className="shrink-0 text-purple-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Observaciones Citológicas</label>
                <textarea
                  rows={2}
                  value={examsData.cytologyObservations}
                  onChange={(e) => setExamsData({ ...examsData, cytologyObservations: e.target.value })}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-purple-500"
                />
              </div>
            </div>
          )}

          {/* PESTAÑA 2: BIOPSIAS */}
          {activeTab === 'biopsia' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Fecha de Biopsia</label>
                  <input
                    type="date"
                    value={examsData.biopsyDate}
                    onChange={(e) => setExamsData({ ...examsData, biopsyDate: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Localización Anatómica</label>
                  <select
                    value={examsData.biopsyLocation}
                    onChange={(e) => setExamsData({ ...examsData, biopsyLocation: e.target.value as any })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  >
                    <option value="Cuello Uterino (Cérvix)">Cuello Uterino (Cérvix con Tischler)</option>
                    <option value="Endometrio (Cánula Pipelle)">Endometrio (Cánula Pipelle / Novak)</option>
                    <option value="Vulva / Vagina">Vulva / Vagina (Punch de Keyes)</option>
                    <option value="Mama">Mama (TRU-CUT / PAAF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">
                  Diagnóstico Anatomopatológico e Histológico
                </label>
                <textarea
                  rows={4}
                  value={examsData.biopsyPathologyResult}
                  onChange={(e) => setExamsData({ ...examsData, biopsyPathologyResult: e.target.value })}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-purple-500"
                  placeholder="Descripción macroscópica y microscópica con conclusión histopatológica..."
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Patólogo / Laboratorio de Referencia</label>
                <input
                  type="text"
                  value={examsData.biopsyPathologist}
                  onChange={(e) => setExamsData({ ...examsData, biopsyPathologist: e.target.value })}
                  className="w-full text-xs font-medium p-2.5 rounded-xl bg-card border border-border"
                />
              </div>
            </div>
          )}

          {/* PESTAÑA 3: MAMOGRAFÍA & ECO MAMARIO */}
          {activeTab === 'mamografia' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Fecha del Estudio</label>
                  <input
                    type="date"
                    value={examsData.mammoDate}
                    onChange={(e) => setExamsData({ ...examsData, mammoDate: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Clasificación BI-RADS</label>
                  <select
                    value={examsData.mammoBiradsCode}
                    onChange={(e) => setExamsData({ ...examsData, mammoBiradsCode: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  >
                    {BIRADS_CATEGORIES.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Hallazgos Mamográficos / Ecográficos</label>
                <textarea
                  rows={3}
                  value={examsData.mammoFindings}
                  onChange={(e) => setExamsData({ ...examsData, mammoFindings: e.target.value })}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Estado de Regiones Axilares</label>
                <select
                  value={examsData.mammoAxillaryLymphNodes}
                  onChange={(e) => setExamsData({ ...examsData, mammoAxillaryLymphNodes: e.target.value as any })}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="Axilas libres de adenopatías sospechosas">Axilas libres de adenopatías sospechosas</option>
                  <option value="Adenopatía reactiva inespecífica">Adenopatía reactiva inespecífica (benigna)</option>
                  <option value="Adenopatía patológica / sospechosa">Adenopatía patológica / sospechosa (corteza engrosada)</option>
                </select>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: DENSITOMETRÍA ÓSEA */}
          {activeTab === 'densitometria' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Fecha Densitometría</label>
                  <input
                    type="date"
                    value={examsData.dexaDate}
                    onChange={(e) => setExamsData({ ...examsData, dexaDate: e.target.value })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">T-Score Columna L1-L4</label>
                  <input
                    type="number"
                    step="0.1"
                    value={examsData.dexaSpineTScore}
                    onChange={(e) => setExamsData({ ...examsData, dexaSpineTScore: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">T-Score Cuello Femoral</label>
                  <input
                    type="number"
                    step="0.1"
                    value={examsData.dexaFemurTScore}
                    onChange={(e) => setExamsData({ ...examsData, dexaFemurTScore: Number(e.target.value) })}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Diagnóstico Osteometabólico OMS</label>
                <select
                  value={examsData.dexaDiagnosis}
                  onChange={(e) => setExamsData({ ...examsData, dexaDiagnosis: e.target.value as any })}
                  className="w-full text-xs font-black p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="Normal">Normal (T-Score &gt; -1.0 DE)</option>
                  <option value="Osteopenia">Osteopenia (T-Score entre -1.0 y -2.5 DE)</option>
                  <option value="Osteoporosis">Osteoporosis (T-Score &lt; -2.5 DE)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Conducta y Tratamiento</label>
                <input
                  type="text"
                  value={examsData.dexaTreatmentNotes}
                  onChange={(e) => setExamsData({ ...examsData, dexaTreatmentNotes: e.target.value })}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-purple-500"
                  placeholder="Calcio + Vitamina D3, ácido alendrónico, ibandronato..."
                />
              </div>
            </div>
          )}
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
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-purple-600/20 transition-all btn-haptic"
          >
            <Save size={16} /> Guardar Registro de Exámenes
          </button>
        </div>
      </div>
    </div>
  );
}
