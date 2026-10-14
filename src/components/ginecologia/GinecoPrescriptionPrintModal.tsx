'use client';

import React from 'react';
import { X, Printer, Share2, Baby, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';

interface GinecoPrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientTaxId?: string;
  patientAge?: number | null;
  patientPhone?: string;
  doctorName: string;
  doctorLicense?: string;
  gestationalWeeks?: number;
  gestationalDays?: number;
  cie10?: { code: string; description: string };
  prescription: {
    medications: string;
    instructions: string;
    labOrders?: string[];
  };
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
}

export function GinecoPrescriptionPrintModal({
  isOpen,
  onClose,
  patientName,
  patientTaxId,
  patientAge,
  patientPhone,
  doctorName,
  doctorLicense,
  gestationalWeeks,
  gestationalDays,
  cie10,
  prescription,
  clinicName = 'CENTRO GINECOLÓGICO & MATERNO',
  clinicAddress = 'Consultorio de Ginecología y Obstetricia',
  clinicPhone = '+58 412-0000000',
}: GinecoPrescriptionPrintModalProps) {
  const { toast } = useToast();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const gaText =
      gestationalWeeks !== undefined && gestationalWeeks > 0
        ? `*Edad Gestacional:* ${gestationalWeeks} sem + ${gestationalDays || 0} d\n`
        : '';
    const diagText = cie10 ? `*Diagnóstico:* ${cie10.code} - ${cie10.description}\n` : '';
    const labsText =
      Array.isArray(prescription.labOrders) && prescription.labOrders.length > 0
        ? `\n*Órdenes de Exámenes / Ecos:*\n${prescription.labOrders.map((l) => `• ${l}`).join('\n')}\n`
        : '';

    const text =
      `📋 *RÉCIPE E INDICACIONES MÉDICAS*\n` +
      `*Paciente:* ${patientName}\n` +
      `${gaText}` +
      `${diagText}` +
      `*Médico Tratante:* Dr(a). ${doctorName}\n\n` +
      `💊 *MEDICAMENTOS:*\n${prescription.medications || 'Sin prescripción agregada'}\n\n` +
      `📝 *INDICACIONES & SIGNOS DE ALARMA:*\n${prescription.instructions || 'Seguir indicaciones verbales'}\n` +
      `${labsText}\n` +
      `_Emitido por ${clinicName}_`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
    window.open(url, '_blank');
    toast({ variant: 'success', title: 'WhatsApp Preparado', description: 'Mensaje listo para enviar a la paciente.' });
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col animate-in zoom-in-95">
        {/* Barra superior de controles (no se imprime) */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-bold">
              <Baby size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Récipe Médico Gineco-Obstétrico
              </h3>
              <p className="text-[11px] text-slate-500">
                Formato estándar de dos cuerpos (Prescripción + Indicaciones de la Paciente)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-500/20 btn-haptic"
            >
              <Share2 size={13} />
              <span>Enviar WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm btn-haptic"
            >
              <Printer size={13} />
              <span>Imprimir Récipe</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hoja de Récipe Digital para Imprimir */}
        <div className="flex-1 overflow-y-auto pr-1 print:overflow-visible print:p-0">
          <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none print:p-0 space-y-6">
            {/* Membrete Médico */}
            <div className="flex items-start justify-between border-b-2 border-pink-500 pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  {clinicName}
                </h2>
                <p className="text-xs font-bold text-pink-600">
                  SERVICIO DE GINECOLOGÍA, OBSTETRICIA & MATERNIDAD
                </p>
                <p className="text-[11px] text-slate-500">{clinicAddress}</p>
                <p className="text-[11px] text-slate-500">Contacto: {clinicPhone}</p>
              </div>

              <div className="text-right">
                <p className="text-sm font-black text-slate-900">Dr(a). {doctorName}</p>
                <p className="text-xs font-bold text-slate-600">Especialista en Ginecología y Obstetricia</p>
                {doctorLicense && (
                  <p className="text-[10px] font-mono text-slate-500">M.P.P.S / C.M: {doctorLicense}</p>
                )}
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  Fecha: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Ficha Paciente */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Paciente:</span>
                <span className="font-black text-slate-900 truncate block">{patientName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Cédula / ID:</span>
                <span className="font-mono font-bold text-slate-800">{patientTaxId || 'No registrada'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Edad:</span>
                <span className="font-bold text-slate-800">{patientAge ? `${patientAge} años` : '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Edad Gestacional:</span>
                <span className="font-black text-pink-600">
                  {gestationalWeeks !== undefined && gestationalWeeks > 0
                    ? `${gestationalWeeks} sem + ${gestationalDays || 0} d`
                    : 'No gestante / No aplica'}
                </span>
              </div>
            </div>

            {/* Diagnóstico CIE-10 */}
            {cie10 && (
              <div className="text-xs border-l-4 border-pink-500 pl-3 py-0.5">
                <span className="font-black text-slate-700">Impresión Diagnóstica: </span>
                <span className="font-mono font-bold text-pink-700">[{cie10.code}]</span>{' '}
                <span className="text-slate-800 font-semibold">{cie10.description}</span>
              </div>
            )}

            {/* Cuerpo del Récipe: 2 Columnas Tradicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Columna Izquierda: Rp / Medicamentos */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Rp / Prescripción Médica</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Fármaco, Dosis & Vía</span>
                </div>
                <div className="text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed min-h-[140px]">
                  {prescription.medications || 'Sin medicamentos prescritos para esta sesión.'}
                </div>
              </div>

              {/* Columna Derecha: Indicaciones y Posología */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-pink-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Indicaciones a la Paciente</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Pautas & Alarmas</span>
                </div>
                <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[140px]">
                  {prescription.instructions || 'Sin instrucciones adicionales.'}
                </div>
              </div>
            </div>

            {/* Órdenes Paraclínicas / Ecografías */}
            {Array.isArray(prescription.labOrders) && prescription.labOrders.length > 0 && (
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  🔬 Órdenes de Exámenes de Laboratorio y Ecografías Solicitadas:
                </h4>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-800 list-disc list-inside">
                  {prescription.labOrders.map((lab) => (
                    <li key={lab} className="font-medium">
                      {lab}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pie de Firma */}
            <div className="pt-10 flex justify-between items-end">
              <div className="text-[10px] text-slate-400 space-y-0.5">
                <p>• Documento médico emitido conforme a protocolos de la OMS / FIGO.</p>
                <p>• Válido para despacho farmacéutico ambulatorio.</p>
              </div>

              <div className="text-center w-64 border-t border-slate-400 pt-1.5">
                <p className="text-xs font-black text-slate-900">Dr(a). {doctorName}</p>
                <p className="text-[10px] text-slate-500">Firma y Sello del Médico Especialista</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
