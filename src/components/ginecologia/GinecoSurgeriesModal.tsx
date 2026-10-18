'use client';

import React, { useState, useMemo } from 'react';
import { X, Printer, Save, Scissors, DollarSign, Send, Building2, UserCheck, Shield } from 'lucide-react';
import { GINECO_SURGICAL_CATALOG, SurgicalProcedureConfig } from '@/lib/ginecologia/clinicalConstants';

export interface SurgicalInterventionRecord {
  id?: string;
  date: string;
  patientId: string;
  patientName: string;
  procedureId: string;
  procedureName: string;
  clinicName: string;
  roomNumber: string;
  surgicalIndication: string;
  totalPackagePriceUSD: number;

  // Desglose de Honorarios
  surgeonFeeUSD: number;
  surgeonName: string;
  assistantFeeUSD: number;
  assistantName: string;
  anesthesiologistFeeUSD: number;
  anesthesiologistName: string;
  pediatricianFeeUSD: number;
  pediatricianName: string;
  instrumentistFeeUSD: number;

  // Cobranza
  paymentStatus: 'Pendiente' | 'Cobrado' | 'Aseguradora';
  paymentMethod: 'Efectivo USD' | 'Pago Móvil / Transferencia Bs' | 'Cheque' | 'Seguro / Póliza';
  insuranceName?: string;
  insuranceKey?: string;
  checkNumber?: string;
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorName: string;
  exchangeRate: number;
  onDispatchToPOS?: (record: SurgicalInterventionRecord) => void;
  onSaveRecord?: (record: SurgicalInterventionRecord) => void;
}

export function GinecoSurgeriesModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  doctorName,
  exchangeRate,
  onDispatchToPOS,
  onSaveRecord,
}: Props) {
  const defaultProcedure = GINECO_SURGICAL_CATALOG[0];

  const [selectedProcId, setSelectedProcId] = useState(defaultProcedure.id);
  const [totalPriceUSD, setTotalPriceUSD] = useState(defaultProcedure.defaultPriceUSD);
  const [clinicName, setClinicName] = useState('Policlínica / Centro Médico Quirúrgico');
  const [roomNumber, setRoomNumber] = useState('Pabellón 2');
  const [surgicalIndication, setSurgicalIndication] = useState('Cesárea iterativa / Desproporción feto-pélvica');

  // Nombres de Equipo Quirúrgico
  const [surgeonName, setSurgeonName] = useState(doctorName);
  const [assistantName, setAssistantName] = useState('Dr. Primer Ayudante');
  const [anesthesiologistName, setAnesthesiologistName] = useState('Dra. Médico Anestesiólogo');
  const [pediatricianName, setPediatricianName] = useState('Dr. Neonatólogo / Pediatra');

  // Cobranza
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo USD' | 'Pago Móvil / Transferencia Bs' | 'Cheque' | 'Seguro / Póliza'>('Efectivo USD');
  const [insuranceName, setInsuranceName] = useState('');
  const [insuranceKey, setInsuranceKey] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [notes, setNotes] = useState('Procedimiento electivo programado.');

  const currentProc = useMemo(() => {
    return GINECO_SURGICAL_CATALOG.find((p) => p.id === selectedProcId) || defaultProcedure;
  }, [selectedProcId, defaultProcedure]);

  // Cálculo automático de honorarios
  const surgeonFee = Math.round((totalPriceUSD * currentProc.surgeonSplitPercent) / 100);
  const assistantFee = Math.round((totalPriceUSD * currentProc.assistantSplitPercent) / 100);
  const anesthesiologistFee = Math.round((totalPriceUSD * currentProc.anesthesiologistSplitPercent) / 100);
  const pediatricianFee = currentProc.pediatricianRequired ? Math.round(totalPriceUSD * 0.1) : 0;
  const instrumentistFee = Math.max(0, totalPriceUSD - (surgeonFee + assistantFee + anesthesiologistFee + pediatricianFee));

  const totalVES = totalPriceUSD * (exchangeRate || 1);

  if (!isOpen) return null;

  const handleSelectProcedure = (procId: string) => {
    setSelectedProcId(procId);
    const found = GINECO_SURGICAL_CATALOG.find((p) => p.id === procId);
    if (found) {
      setTotalPriceUSD(found.defaultPriceUSD);
    }
  };

  const buildRecord = (): SurgicalInterventionRecord => ({
    date: new Date().toISOString().split('T')[0],
    patientId,
    patientName,
    procedureId: selectedProcId,
    procedureName: currentProc.name,
    clinicName,
    roomNumber,
    surgicalIndication,
    totalPackagePriceUSD: totalPriceUSD,
    surgeonFeeUSD: surgeonFee,
    surgeonName,
    assistantFeeUSD: assistantFee,
    assistantName,
    anesthesiologistFeeUSD: anesthesiologistFee,
    anesthesiologistName,
    pediatricianFeeUSD: pediatricianFee,
    pediatricianName,
    instrumentistFeeUSD: instrumentistFee,
    paymentStatus: 'Pendiente',
    paymentMethod,
    insuranceName: paymentMethod === 'Seguro / Póliza' ? insuranceName : undefined,
    insuranceKey: paymentMethod === 'Seguro / Póliza' ? insuranceKey : undefined,
    checkNumber: paymentMethod === 'Cheque' ? checkNumber : undefined,
    notes,
  });

  const handleSaveOnly = () => {
    const rec = buildRecord();
    if (onSaveRecord) onSaveRecord(rec);
    onClose();
  };

  const handleSendToPOS = () => {
    const rec = buildRecord();
    if (onDispatchToPOS) onDispatchToPOS(rec);
    if (onSaveRecord) onSaveRecord(rec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Scissors size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-foreground">Intervenciones Quirúrgicas & Honorarios</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">
                  Himego Quirófano
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Paciente: <strong className="text-foreground">{patientName}</strong> | Cirujano Principal: {surgeonName}
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

        {/* Formulario Quirúrgico */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* BLOQUE 1: PROCEDIMIENTO Y CLÍNICA */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Tipo de Intervención</label>
                <select
                  value={selectedProcId}
                  onChange={(e) => handleSelectProcedure(e.target.value)}
                  className="w-full text-xs font-black p-2.5 rounded-xl bg-card border border-border text-foreground"
                >
                  {GINECO_SURGICAL_CATALOG.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black text-slate-500 block mb-1">Monto Total Paquete Quirúrgico (USD)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={totalPriceUSD}
                    onChange={(e) => setTotalPriceUSD(Math.max(0, Number(e.target.value)))}
                    className="w-full text-sm font-black p-2.5 rounded-xl bg-card border border-border font-mono text-foreground"
                  />
                  <div className="px-3 py-2 rounded-xl bg-card border border-border text-xs font-bold text-slate-500 whitespace-nowrap font-mono">
                    ≈ Bs {totalVES.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Clínica / Quirófano</label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Pabellón / Habitación</label>
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Indicación Médica Quirúrgica</label>
                <input
                  type="text"
                  value={surgicalIndication}
                  onChange={(e) => setSurgicalIndication(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-xl bg-card border border-border"
                />
              </div>
            </div>
          </div>

          {/* BLOQUE 2: LIQUIDACIÓN AUTOMÁTICA DE HONORARIOS MÉDICOS */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <DollarSign size={14} /> Desglose de Honorarios del Equipo Quirúrgico
              </h3>
              <span className="text-[11px] font-black font-mono text-amber-700 dark:text-amber-400">
                Total Distribuido: ${surgeonFee + assistantFee + anesthesiologistFee + pediatricianFee + instrumentistFee} USD
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cirujano */}
              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Cirujano Principal ({currentProc.surgeonSplitPercent}%)</span>
                  <input
                    type="text"
                    value={surgeonName}
                    onChange={(e) => setSurgeonName(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent outline-none w-full"
                  />
                </div>
                <span className="text-sm font-black text-amber-600 font-mono">${surgeonFee}</span>
              </div>

              {/* Primer Ayudante */}
              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Primer Ayudante ({currentProc.assistantSplitPercent}%)</span>
                  <input
                    type="text"
                    value={assistantName}
                    onChange={(e) => setAssistantName(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent outline-none w-full"
                  />
                </div>
                <span className="text-sm font-black text-amber-600 font-mono">${assistantFee}</span>
              </div>

              {/* Anestesiólogo */}
              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">Médico Anestesiólogo ({currentProc.anesthesiologistSplitPercent}%)</span>
                  <input
                    type="text"
                    value={anesthesiologistName}
                    onChange={(e) => setAnesthesiologistName(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent outline-none w-full"
                  />
                </div>
                <span className="text-sm font-black text-amber-600 font-mono">${anesthesiologistFee}</span>
              </div>

              {/* Pediatra / Neonatólogo (si aplica) */}
              <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block">
                    {currentProc.pediatricianRequired ? 'Pediatra / Neonatólogo (10%)' : 'Instrumentista Quirúrgico'}
                  </span>
                  <input
                    type="text"
                    value={pediatricianName}
                    onChange={(e) => setPediatricianName(e.target.value)}
                    className="text-xs font-bold text-foreground bg-transparent outline-none w-full"
                  />
                </div>
                <span className="text-sm font-black text-amber-600 font-mono">
                  ${currentProc.pediatricianRequired ? pediatricianFee : instrumentistFee}
                </span>
              </div>
            </div>
          </div>

          {/* BLOQUE 3: MÉTODO DE PAGO Y FACTURACIÓN */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-border/80 space-y-3">
            <h4 className="text-xs font-black uppercase text-foreground">Cobro & Forma de Pago</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 block mb-1">Forma de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                >
                  <option value="Efectivo USD">Efectivo USD</option>
                  <option value="Pago Móvil / Transferencia Bs">Pago Móvil / Transferencia Bs</option>
                  <option value="Cheque">Cheque Bancario</option>
                  <option value="Seguro / Póliza">Seguro Médico / Póliza de Salud</option>
                </select>
              </div>

              {paymentMethod === 'Cheque' && (
                <div>
                  <label className="text-[10px] font-black text-slate-500 block mb-1">Número de Cheque y Banco</label>
                  <input
                    type="text"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="Ej: Banco Mercantil #0049281"
                    className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                  />
                </div>
              )}

              {paymentMethod === 'Seguro / Póliza' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Aseguradora</label>
                    <input
                      type="text"
                      value={insuranceName}
                      onChange={(e) => setInsuranceName(e.target.value)}
                      placeholder="Mercantil, Caracas, etc."
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 block mb-1">Clave de Aprobación</label>
                    <input
                      type="text"
                      value={insuranceKey}
                      onChange={(e) => setInsuranceKey(e.target.value)}
                      placeholder="# Clave"
                      className="w-full text-xs font-bold p-2.5 rounded-xl bg-card border border-border font-mono"
                    />
                  </div>
                </div>
              )}
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveOnly}
              type="button"
              className="px-4 py-2.5 rounded-xl bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-foreground transition-all"
            >
              Guardar Registro
            </button>
            <button
              onClick={handleSendToPOS}
              type="button"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all btn-haptic"
            >
              <Send size={16} /> Despachar a Caja POS (${totalPriceUSD} USD)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
