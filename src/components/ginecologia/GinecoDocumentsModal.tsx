'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, FileText, Calendar, CheckSquare, Send, Copy, Sparkles, Building2 } from 'lucide-react';
import { calculateMaternityLeave } from '@/lib/ginecologia/biometryCalculators';
import { LAB_ORDER_PROFILES } from '@/lib/ginecologia/clinicalConstants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  patientTaxId?: string;
  doctorName: string;
  doctorLicense?: string;
  fppDate?: string;
  fumDate?: string;
}

type DocumentType = 'reposo' | 'constancia' | 'referencia' | 'consentimiento' | 'ordenes_lab';

export function GinecoDocumentsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  patientTaxId,
  doctorName,
  doctorLicense,
  fppDate,
  fumDate,
}: Props) {
  const [docType, setDocType] = useState<DocumentType>('reposo');

  // Reposo
  const maternityDates = useMemo(() => {
    return calculateMaternityLeave(fppDate || new Date().toISOString().split('T')[0]);
  }, [fppDate]);

  const [prenatalStart, setPrenatalStart] = useState(maternityDates.prenatalStartDate);
  const [prenatalEnd, setPrenatalEnd] = useState(maternityDates.prenatalEndDate);
  const [posnatalStart, setPosnatalStart] = useState(maternityDates.posnatalStartDate);
  const [posnatalEnd, setPosnatalEnd] = useState(maternityDates.posnatalEndDate);
  const [restReason, setRestReason] = useState('Embarazo a término en evolución fisiológica / Protección a la maternidad.');

  // Constancia
  const [constanciaGestationalAge, setConstanciaGestationalAge] = useState('32 semanas de gestación');
  const [constanciaFitness, setConstanciaFitness] = useState('Paciente en óptimas condiciones de salud, apta para realizar actividades habituales.');

  // Referencia
  const [referralSpecialist, setReferralSpecialist] = useState('Servicio de Medicina Materno-Fetal / Perinatología');
  const [referralReason, setReferralReason] = useState('Sospecha de restricción del crecimiento intrauterino / Evaluación Doppler.');

  // Consentimiento
  const [spouseName, setSpouseName] = useState('');
  const [spouseTaxId, setSpouseTaxId] = useState('');
  const [consentProcedure, setConsentProcedure] = useState('Cesárea Segmentaria con Salpingectomía Bilateral (Esterilización Quirúrgica)');

  // Órdenes de laboratorio
  const [selectedProfileId, setSelectedProfileId] = useState(LAB_ORDER_PROFILES[0].id);

  if (!isOpen) return null;

  const currentProfile = LAB_ORDER_PROFILES.find((p) => p.id === selectedProfileId) || LAB_ORDER_PROFILES[0];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Documentos, Reposos e Informes Médicos</h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                  Formatos Legales
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Paciente: <strong className="text-foreground">{patientName}</strong> | C.I: {patientTaxId || 'S/C'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              type="button"
              className="p-2 rounded-xl text-slate-500 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Imprimir Documento"
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

        {/* Selector de Plantilla Himego */}
        <div className="px-6 pt-3 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto">
          {[
            { key: 'reposo', label: '1. Reposo Prenatal/Posnatal (LOTTT)' },
            { key: 'constancia', label: '2. Constancia de Control' },
            { key: 'referencia', label: '3. Informe de Referencia' },
            { key: 'consentimiento', label: '4. Consentimiento Quirúrgico' },
            { key: 'ordenes_lab', label: '5. Solicitud de Laboratorio' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDocType(tab.key as DocumentType)}
              className={`px-3.5 py-2.5 rounded-t-xl text-xs font-black transition-all border-b-2 whitespace-nowrap ${
                docType === tab.key
                  ? 'border-indigo-600 text-indigo-600 bg-card shadow-xs'
                  : 'border-transparent text-slate-500 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Vista previa y edición del documento */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* FORMATO 1: REPOSO MÉDICO LOTTT */}
          {docType === 'reposo' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-1">
                <p className="font-black text-indigo-700 dark:text-indigo-300">
                  Cálculo Legal Automatizado (Art. 336 Ley Orgánica del Trabajo, los Trabajadores y las Trabajadoras):
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Prenatal: 6 semanas antes del parto (semana 34). Posnatal: 12 semanas (84 días continuos) posteriores al alumbramiento. Total acumulado: 126 días de reposo pre y posnatal.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
                  <h4 className="text-xs font-black uppercase text-foreground">Período Prenatal (6 Semanas)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={prenatalStart}
                        onChange={(e) => setPrenatalStart(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1">Fecha Culminación</label>
                      <input
                        type="date"
                        value={prenatalEnd}
                        onChange={(e) => setPrenatalEnd(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
                  <h4 className="text-xs font-black uppercase text-foreground">Período Posnatal (12 Semanas / 84 Días)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={posnatalStart}
                        onChange={(e) => setPosnatalStart(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 block mb-1">Fecha Culminación</label>
                      <input
                        type="date"
                        value={posnatalEnd}
                        onChange={(e) => setPosnatalEnd(e.target.value)}
                        className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Diagnóstico & Justificación Médica</label>
                <textarea
                  rows={3}
                  value={restReason}
                  onChange={(e) => setRestReason(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* FORMATO 2: CONSTANCIA DE CONTROL */}
          {docType === 'constancia' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Edad Gestacional Actual</label>
                  <input
                    type="text"
                    value={constanciaGestationalAge}
                    onChange={(e) => setConstanciaGestationalAge(e.target.value)}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">FPP (Fecha Probable de Parto)</label>
                  <input
                    type="date"
                    defaultValue={fppDate}
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Dictamen de Aptitud / Observaciones</label>
                <textarea
                  rows={4}
                  value={constanciaFitness}
                  onChange={(e) => setConstanciaFitness(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* FORMATO 3: INFORME DE REFERENCIA */}
          {docType === 'referencia' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Especialidad / Servicio de Destino</label>
                <input
                  type="text"
                  value={referralSpecialist}
                  onChange={(e) => setReferralSpecialist(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                />
              </div>

              <div>
                <label className="text-xs font-black text-foreground block mb-1">Resumen Clínico y Motivo de Referencia</label>
                <textarea
                  rows={5}
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                  className="w-full text-xs font-medium p-3 rounded-2xl bg-card border border-border outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* FORMATO 4: CONSENTIMIENTO INFORMADO QUIRÚRGICO */}
          {docType === 'consentimiento' && (
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Procedimiento a Consentir</label>
                <input
                  type="text"
                  value={consentProcedure}
                  onChange={(e) => setConsentProcedure(e.target.value)}
                  className="w-full text-xs font-black p-2.5 rounded-xl bg-card border border-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Nombre del Cónyuge / Pareja / Testigo</label>
                  <input
                    type="text"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    placeholder="Nombre completo"
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-500 block mb-1">Cédula del Cónyuge / Testigo</label>
                  <input
                    type="text"
                    value={spouseTaxId}
                    onChange={(e) => setSpouseTaxId(e.target.value)}
                    placeholder="V-00.000.000"
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2">
                <p>
                  Yo, <strong className="text-foreground">{patientName}</strong>, C.I. <strong className="text-foreground">{patientTaxId || 'S/C'}</strong>, en pleno uso de mis facultades mentales, declaro que he sido debidamente informada por el Dr.(a) <strong className="text-foreground">{doctorName}</strong> sobre la naturaleza, riesgos, complicaciones potenciales y alternativas del procedimiento denominado <strong className="text-foreground">{consentProcedure}</strong>, manifestando mi libre y voluntaria conformidad.
                </p>
              </div>
            </div>
          )}

          {/* FORMATO 5: SOLICITUD DE LABORATORIO */}
          {docType === 'ordenes_lab' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-foreground block mb-1">Seleccionar Perfil Preconfigurado</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full text-xs font-black p-3 rounded-xl bg-card border border-border text-foreground"
                >
                  {LAB_ORDER_PROFILES.map((prof) => (
                    <option key={prof.id} value={prof.id}>
                      {prof.title} ({prof.orders.length} pruebas)
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-2">
                <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                  Pruebas Solicitadas para Impresión / Orden:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {currentProfile.orders.map((ord, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 p-2 rounded-xl bg-card border border-border">
                      <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-600 font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate">{ord}</span>
                    </li>
                  ))}
                </ul>
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
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            type="button"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all btn-haptic"
          >
            <Printer size={16} /> Imprimir Documento Oficial
          </button>
        </div>
      </div>
    </div>
  );
}
