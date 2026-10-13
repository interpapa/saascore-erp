'use client';

import React from 'react';
import {
  X,
  Printer,
  MessageSquare,
  Stethoscope,
  Pill,
  ClipboardList,
  FlaskConical,
  Eye,
  Calendar,
  User,
} from 'lucide-react';
import { MedicalSpecialtyId, MEDICAL_SPECIALTIES_MAP } from '@/lib/medical/specialtyRegistry';
import { calculateSphericalEquivalent } from '@/lib/medical/clinicalCalculators';

export interface PrescriptionPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicName: string;
  specialtyId: MedicalSpecialtyId;
  doctorName: string;
  doctorLicense?: string;
  patientName: string;
  patientTaxId?: string;
  patientPhone?: string;
  patientAgeText?: string;
  cie10Code?: string;
  diagnosisText?: string;
  medications: string;
  instructions: string;
  labOrders?: string;
  specialtyState?: Record<string, any>;
}

export function PrescriptionPrintModal({
  isOpen,
  onClose,
  clinicName,
  specialtyId,
  doctorName,
  doctorLicense,
  patientName,
  patientTaxId,
  patientPhone,
  patientAgeText,
  cie10Code,
  diagnosisText,
  medications,
  instructions,
  labOrders,
  specialtyState,
}: PrescriptionPrintModalProps) {
  if (!isOpen) return null;

  const specialtyConfig =
    MEDICAL_SPECIALTIES_MAP[specialtyId] || MEDICAL_SPECIALTIES_MAP.med_general;
  const dateFormatted = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const isOphthalmology = specialtyId === 'med_oftalmologia';
  const od = specialtyState?.od || {
    avSc: '20/40',
    avCc: '20/20',
    sphere: -1.25,
    cylinder: -0.5,
    axis: 90,
    add: 0,
  };
  const oi = specialtyState?.oi || {
    avSc: '20/30',
    avCc: '20/20',
    sphere: -1.0,
    cylinder: -0.25,
    axis: 85,
    add: 0,
  };
  const dpMm = specialtyState?.dpMm ?? 62;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = (patientPhone || '').replace(/\D/g, '');
    const lines = [
      `*RÉCIPE E INDICACIONES MÉDICAS*`,
      `🏥 *${clinicName}* — ${specialtyConfig.name}`,
      `👨‍⚕️ *Médico:* ${doctorName}`,
      `👤 *Paciente:* ${patientName}${patientTaxId ? ` (${patientTaxId})` : ''}`,
      `📅 *Fecha:* ${dateFormatted}`,
      cie10Code || diagnosisText
        ? `🩺 *Diagnóstico:* ${cie10Code ? `[${cie10Code}] ` : ''}${diagnosisText || ''}`
        : '',
      '',
      `💊 *RÉCIPE / MEDICAMENTOS:*`,
      medications || 'Sin medicamentos prescritos.',
      '',
      `📋 *INDICACIONES Y POSOLOGÍA:*`,
      instructions || 'Seguir pauta médica indicada en consulta.',
    ];

    if (labOrders && labOrders.trim()) {
      lines.push('', `🧪 *ÓRDENES DE LABORATORIO / PARACLÍNICOS:*`, labOrders);
    }

    if (isOphthalmology) {
      lines.push(
        '',
        `👓 *FÓRMULA ÓPTICA DE LENTES (DIP: ${dpMm} mm):*`,
        `• *OD:* Esf ${od.sphere} | Cil ${od.cylinder} | Eje ${od.axis}° | ADD +${od.add}`,
        `• *OI:* Esf ${oi.sphere} | Cil ${oi.cylinder} | Eje ${oi.axis}° | ADD +${oi.add}`
      );
    }

    const textEncoded = encodeURIComponent(lines.filter(Boolean).join('\n'));
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${textEncoded}`
      : `https://wa.me/?text=${textEncoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden my-8">
        {/* Barra superior de acciones (oculta en impresión) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Vista Previa de Récipe Médico Digital (2 Columnas)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Formato estándar de prescripción facultativa e indicaciones al paciente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              Imprimir Récipe
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Lienzo de Impresión de 2 Columnas */}
        <div className="p-6 sm:p-8 bg-white text-slate-900 space-y-6">
          {/* Encabezado Institucional */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-sky-700">
                {clinicName || 'Centro Médico Especializado'}
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-0.5">
                {specialtyConfig.name}
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Dr(a). {doctorName || 'Médico Tratante'}
                {doctorLicense ? ` · MPPS / Colegio Médico: ${doctorLicense}` : ''}
              </p>
            </div>

            <div className="text-left sm:text-right text-xs space-y-0.5">
              <div className="font-bold text-slate-800 flex items-center sm:justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-700" />
                Fecha: {dateFormatted}
              </div>
              <div className="text-slate-600">
                <User className="w-3.5 h-3.5 inline mr-1 text-sky-700" />
                Paciente: <strong className="text-slate-900">{patientName}</strong>
              </div>
              <div className="text-slate-500">
                {patientTaxId ? `Doc/ID: ${patientTaxId}` : ''}
                {patientAgeText ? ` · Edad: ${patientAgeText}` : ''}
              </div>
            </div>
          </div>

          {/* Cinta de Diagnóstico CIE-10 */}
          {(cie10Code || diagnosisText) && (
            <div className="rounded-lg bg-slate-100 border border-slate-200 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-bold text-slate-700">Impresión Diagnóstica (CIE-10): </span>
                <span className="font-semibold text-slate-900">
                  {cie10Code ? `[${cie10Code}] ` : ''}
                  {diagnosisText}
                </span>
              </div>
            </div>
          )}

          {/* Formato Clásico de 2 Columnas: Récipe a la Izquierda | Indicaciones a la Derecha */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Columna Izquierda: Rp. / Medicamentos */}
            <div className="rounded-xl border-2 border-slate-200 p-5 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 mb-3">
                  <Pill className="w-4 h-4 text-sky-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Rp. / Récipe Médico (Medicamentos)
                  </h4>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
                  {medications || 'Sin medicamentos registrados en esta consulta.'}
                </pre>
              </div>

              <div className="pt-8 mt-6 border-t border-dashed border-slate-300 text-center">
                <div className="text-xs font-bold text-slate-800">Dr(a). {doctorName}</div>
                <div className="text-[10px] text-slate-500">
                  Firma y Sello del Facultativo · {specialtyConfig.shortName}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Indicaciones / Posología */}
            <div className="rounded-xl border-2 border-slate-200 p-5 flex flex-col justify-between min-h-[260px]">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5 mb-3">
                  <ClipboardList className="w-4 h-4 text-emerald-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Indicaciones Médicas y Posología
                  </h4>
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-800">
                  {instructions || 'Seguir las recomendaciones generales explicadas en consulta.'}
                </pre>
              </div>

              <div className="pt-8 mt-6 border-t border-dashed border-slate-300 text-center">
                <div className="text-xs font-bold text-slate-800">Dr(a). {doctorName}</div>
                <div className="text-[10px] text-slate-500">
                  Plan Terapéutico y Cuidados Ambulatorios
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Fórmula de Lentes OD/OI (Solo si es Oftalmología) */}
          {isOphthalmology && (
            <div className="rounded-xl border-2 border-cyan-600/30 bg-cyan-50/40 p-4">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-900">
                    Fórmula Óptica de Lentes Correctivos (OD / OI)
                  </h4>
                </div>
                <span className="text-xs font-bold text-cyan-900">
                  Distancia Interpupilar (DIP / DP): {dpMm} mm
                </span>
              </div>

              <table className="w-full text-xs border-collapse bg-white rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-cyan-900/10 text-slate-700 border-b border-slate-200">
                    <th className="py-1.5 px-3 text-left">Ojo</th>
                    <th className="py-1.5 px-3 text-left">AV s/c</th>
                    <th className="py-1.5 px-3 text-left">AV c/c</th>
                    <th className="py-1.5 px-3 text-left">Esfera</th>
                    <th className="py-1.5 px-3 text-left">Cilindro</th>
                    <th className="py-1.5 px-3 text-left">Eje</th>
                    <th className="py-1.5 px-3 text-left">Adición (ADD)</th>
                    <th className="py-1.5 px-3 text-left">Eq. Esférico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-2 px-3 font-bold text-cyan-800">OD (Derecho)</td>
                    <td className="py-2 px-3">{od.avSc}</td>
                    <td className="py-2 px-3 font-semibold">{od.avCc}</td>
                    <td className="py-2 px-3 font-bold">{od.sphere} D</td>
                    <td className="py-2 px-3 font-bold">{od.cylinder} D</td>
                    <td className="py-2 px-3 font-bold">{od.axis}°</td>
                    <td className="py-2 px-3 font-bold">+{od.add} D</td>
                    <td className="py-2 px-3 font-bold text-slate-700">
                      {calculateSphericalEquivalent(Number(od.sphere), Number(od.cylinder))} D
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-bold text-cyan-800">OI (Izquierdo)</td>
                    <td className="py-2 px-3">{oi.avSc}</td>
                    <td className="py-2 px-3 font-semibold">{oi.avCc}</td>
                    <td className="py-2 px-3 font-bold">{oi.sphere} D</td>
                    <td className="py-2 px-3 font-bold">{oi.cylinder} D</td>
                    <td className="py-2 px-3 font-bold">{oi.axis}°</td>
                    <td className="py-2 px-3 font-bold">+{oi.add} D</td>
                    <td className="py-2 px-3 font-bold text-slate-700">
                      {calculateSphericalEquivalent(Number(oi.sphere), Number(oi.cylinder))} D
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Órdenes de Laboratorio y Estudios Paraclínicos */}
          {labOrders && labOrders.trim() !== '' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <FlaskConical className="w-4 h-4 text-indigo-700" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Orden de Estudios de Laboratorio e Imágenes Diagnósticas
                </h4>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">
                {labOrders}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
