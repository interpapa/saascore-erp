'use client';

import React from 'react';
import { 
  X, 
  Calendar, 
  User, 
  Stethoscope, 
  Activity, 
  Pill, 
  FileText, 
  Printer, 
  Share2, 
  Heart, 
  Baby, 
  CheckCircle2 
} from 'lucide-react';

export interface GinecoEncounterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounter: any;
  patientName: string;
  patientTaxId?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorLicense?: string;
  clinicName?: string;
  onOpenPrint?: (enc: any) => void;
}

export function GinecoEncounterDetailModal({
  isOpen,
  onClose,
  encounter,
  patientName,
  patientTaxId,
  patientPhone,
  doctorName,
  doctorLicense,
  clinicName = 'CENTRO MÉDICO GINECOLÓGICO',
  onOpenPrint,
}: GinecoEncounterDetailModalProps) {
  if (!isOpen || !encounter) return null;

  const meta = encounter.metadata || {};
  const soap = meta.soap || {};
  const vitals = meta.vitals || {};
  const obstetric = meta.obstetricExam || {};
  const gyneco = meta.gynecologicExam || {};
  const prescription = meta.prescription || {};
  const procedures = meta.selectedProcedures || [];

  const handleShareWhatsApp = () => {
    let msg = `*${clinicName}*\n`;
    msg += `*EXPEDIENTE DE CONSULTA GINECO-OBSTÉTRICA*\n`;
    msg += `Paciente: ${patientName}\n`;
    msg += `Fecha: ${encounter.createdAt ? new Date(encounter.createdAt).toLocaleDateString('es-VE') : 'Hoy'}\n`;
    const docDisplay = doctorName || meta.doctorName || 'Ginecólogo/a';
    msg += `Médico: ${docDisplay}\n`;
    if (doctorLicense || meta.doctorLicense) msg += `MPPS/Col: ${doctorLicense || meta.doctorLicense}\n`;
    if (soap.assessment) msg += `Diagnóstico: ${soap.assessment}\n`;
    if (prescription.medications) {
      msg += `\n*TRATAMIENTO Y RÉCIPE:*\n${prescription.medications}\n`;
    }
    if (prescription.instructions) {
      msg += `\n*INDICACIONES:*\n${prescription.instructions}\n`;
    }
    if (prescription.labOrders && prescription.labOrders.length > 0) {
      msg += `\n*PARACLÍNICOS SOLICITADOS:*\n• ${prescription.labOrders.join('\n• ')}\n`;
    }

    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-card border border-border rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="p-4 md:p-5 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-transparent border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500 text-white flex items-center justify-center font-black shadow-md shadow-pink-500/20">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-foreground">
                  {encounter.title || 'Consulta Médica'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black uppercase">
                  {meta.encounterType === 'prenatal' ? 'Control Prenatal' : 'Ginecología'}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span>{encounter.createdAt ? new Date(encounter.createdAt).toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha'}</span>
                <span>·</span>
                <span>Dr(a). {doctorName || meta.doctorName || 'Ginecólogo/a'}</span>
                {(doctorLicense || meta.doctorLicense) && (
                  <span className="font-mono text-[11px] text-slate-400">({doctorLicense || meta.doctorLicense})</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Fila de Paciente y Signos Vitales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 block">Paciente</span>
              <p className="text-sm font-black text-foreground">{patientName}</p>
              <p className="text-[11px] text-slate-500 font-mono">
                C.I: {patientTaxId || 'S/C'} {patientPhone ? `· Tel: ${patientPhone}` : ''}
              </p>
            </div>

            {/* Triaje / Signos Vitales */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-1.5">
              <span className="text-[10px] font-black uppercase text-pink-600 block flex items-center gap-1">
                <Activity size={12} /> Signos Vitales Maternos
              </span>
              <div className="grid grid-cols-4 gap-1 text-center font-mono">
                <div className="p-1 rounded-lg bg-card border border-border">
                  <span className="text-[8px] text-slate-400 block">TA</span>
                  <span className="text-xs font-black">{vitals.bloodPressure || '—'}</span>
                </div>
                <div className="p-1 rounded-lg bg-card border border-border">
                  <span className="text-[8px] text-slate-400 block">FC</span>
                  <span className="text-xs font-black">{vitals.heartRate ? `${vitals.heartRate} lpm` : '—'}</span>
                </div>
                <div className="p-1 rounded-lg bg-card border border-border">
                  <span className="text-[8px] text-slate-400 block">Peso</span>
                  <span className="text-xs font-black">{vitals.weightKg ? `${vitals.weightKg} kg` : '—'}</span>
                </div>
                <div className="p-1 rounded-lg bg-card border border-border">
                  <span className="text-[8px] text-slate-400 block">Temp</span>
                  <span className="text-xs font-black">{vitals.temperature ? `${vitals.temperature} °C` : '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Examen Obstétrico (si aplica) */}
          {(obstetric.fetalHeartRateBpm || obstetric.uterineHeightCm || meta.encounterType === 'prenatal') && (
            <div className="p-4 rounded-2xl bg-pink-50/50 dark:bg-pink-950/20 border border-pink-500/20 space-y-2">
              <h4 className="text-[11px] font-black text-pink-700 dark:text-pink-300 uppercase flex items-center gap-1.5">
                <Baby size={14} className="text-pink-600" /> Evaluación Obstétrica
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-center">
                <div className="p-2 rounded-xl bg-card border border-pink-500/20">
                  <span className="text-[9px] text-slate-400 block">Altura Uterina</span>
                  <span className="text-sm font-black text-foreground">
                    {obstetric.uterineHeightCm ? `${obstetric.uterineHeightCm} cm` : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-pink-500/20">
                  <span className="text-[9px] text-slate-400 block">FCF Fetal</span>
                  <span className="text-sm font-black text-pink-600">
                    {obstetric.fetalHeartRateBpm ? `${obstetric.fetalHeartRateBpm} lpm` : '—'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-pink-500/20">
                  <span className="text-[9px] text-slate-400 block">Presentación</span>
                  <span className="text-xs font-black text-foreground uppercase">
                    {obstetric.presentation || 'Cefálica'}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-card border border-pink-500/20">
                  <span className="text-[9px] text-slate-400 block">Movimientos</span>
                  <span className="text-xs font-black text-emerald-600 capitalize">
                    {obstetric.fetalMovements || 'Presentes'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Examen Ginecológico (si aplica) */}
          {gyneco && (gyneco.inspectionVulva || gyneco.speculoscopyCervix || gyneco.bethesdaPapClassification) && (
            <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20 space-y-2">
              <h4 className="text-[11px] font-black text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1.5">
                <Stethoscope size={14} className="text-purple-600" /> Exploración Ginecológica & Colposcopia
              </h4>
              <div className="space-y-1.5 text-[11px]">
                {gyneco.speculoscopyCervix && (
                  <p><strong className="text-slate-600 dark:text-slate-300">Especuloscopia / Cérvix:</strong> {gyneco.speculoscopyCervix}</p>
                )}
                {gyneco.aceticAcidTest && (
                  <p><strong className="text-slate-600 dark:text-slate-300">Test Ácido Acético:</strong> {gyneco.aceticAcidTest}</p>
                )}
                {gyneco.schillerTest && (
                  <p><strong className="text-slate-600 dark:text-slate-300">Test de Schiller:</strong> {gyneco.schillerTest}</p>
                )}
                {gyneco.bethesdaPapClassification && (
                  <p className="p-2 rounded-xl bg-card border border-purple-200 dark:border-purple-800/40 font-semibold text-purple-700 dark:text-purple-300">
                    Citología Bethesda: {gyneco.bethesdaPapClassification}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Evolución SOAP */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2.5">
            <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">
              Evolución Clínica (SOAP)
            </h4>
            <div className="space-y-2">
              {soap.subjective && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Subjetivo / Motivo:</span>
                  <p className="text-xs text-foreground mt-0.5">{soap.subjective}</p>
                </div>
              )}
              {soap.objective && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase">Objetivo / Hallazgos:</span>
                  <p className="text-xs text-foreground mt-0.5">{soap.objective}</p>
                </div>
              )}
              {soap.assessment && (
                <div className="p-2.5 rounded-xl bg-card border border-border">
                  <span className="text-[10px] font-black text-pink-600 uppercase block mb-0.5">
                    Impresión Diagnóstica (CIE-10):
                  </span>
                  <p className="text-xs font-bold text-foreground">
                    {soap.cie10Code ? `[${soap.cie10Code}] ` : ''}{soap.assessment}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Récipe e Indicaciones Médicas */}
          {(prescription.medications || prescription.instructions || (prescription.labOrders && prescription.labOrders.length > 0)) && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black uppercase text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Pill size={14} className="text-emerald-600" /> Récipe Médico & Plan Terapéutico
                </h4>
                <span className="text-[10px] font-bold text-emerald-600">Prescripción Registrada</span>
              </div>

              {prescription.medications && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                    Medicamentos & Posología:
                  </span>
                  <div className="p-3 rounded-xl bg-card border border-border whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-foreground">
                    {prescription.medications}
                  </div>
                </div>
              )}

              {prescription.instructions && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                    Indicaciones Generales & Signos de Alarma:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {prescription.instructions}
                  </p>
                </div>
              )}

              {prescription.labOrders && prescription.labOrders.length > 0 && (
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                    Exámenes / Laboratorios Solicitados:
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {prescription.labOrders.map((ord: string, i: number) => (
                      <li key={i} className="flex items-center gap-1.5 text-[11px] text-foreground font-semibold">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> {ord}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Procedimientos Realizados */}
          {procedures && procedures.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 block">
                Procedimientos / Aranceles de la Sesión
              </span>
              <div className="divide-y divide-border/60">
                {procedures.map((p: any, idx: number) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span className="font-mono font-bold text-pink-600">${Number(p.price || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="p-4 bg-card border-t border-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-foreground"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Share2 size={14} /> WhatsApp
            </button>

            {onOpenPrint && (
              <button
                type="button"
                onClick={() => onOpenPrint(encounter)}
                className="px-4 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black shadow-md shadow-pink-500/20 transition-all flex items-center gap-1.5 btn-haptic"
              >
                <Printer size={14} /> Imprimir Récipe
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
