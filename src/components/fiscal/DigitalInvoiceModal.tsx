'use client';

import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Share2,
  FileCheck2,
  Building2,
  QrCode,
  ShieldCheck,
  Receipt,
  Clock,
  Calendar,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { DigitalInvoicePayload, PROVIDENCIA_00093_NOTICE } from '@/lib/fiscal/digitalInvoicing';

export interface DigitalInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: DigitalInvoicePayload | null;
}

export function DigitalInvoiceModal({ isOpen, onClose, invoice }: DigitalInvoiceModalProps) {
  const [printFormat, setPrintFormat] = useState<'letter' | 'thermal'>('letter');
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen || !invoice) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(invoice.digitalHashSha256);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Estimado cliente ${invoice.buyer.businessName}, le hacemos entrega de su Factura Digital N° ${invoice.documentNumber} (Control: ${invoice.controlNumber}) por un monto total de $${invoice.totals.totalAmountUsd.toFixed(2)} (Bs ${invoice.totals.totalAmountVes.toFixed(2)} a tasa BCV ${invoice.totals.bcvRate.toFixed(2)}). Verificación fiscal: ${invoice.qrPayload}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static print:z-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full">
        
        {/* Cabecera de Control (Oculta en Impresión) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                Factura Digital Oficial
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border border-emerald-300 dark:border-emerald-800">
                  Providencia 00093
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gaceta Oficial N.º 43.484 • Certificación Telemática
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Formato */}
            <div className="flex items-center bg-slate-200 dark:bg-slate-700/60 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintFormat('letter')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printFormat === 'letter'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                A4 / Carta
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  printFormat === 'thermal'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                Ticket 80mm
              </button>
            </div>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Documento (Imprimible) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible print:space-y-4 text-slate-800 dark:text-slate-100">
          
          {printFormat === 'thermal' ? (
            /* ─────────────────────────────────────────────────────────────
               VISTA TICKET TÉRMICO (80mm)
            ────────────────────────────────────────────────────────────── */
            <div className="max-w-[80mm] mx-auto font-mono text-xs border border-dashed border-slate-300 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-950/50 print:border-none print:p-0">
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-400">
                <h4 className="font-extrabold text-sm uppercase">{invoice.seller.businessName}</h4>
                <p className="font-semibold">RIF: {invoice.seller.taxId}</p>
                <p className="text-[11px] leading-tight text-slate-600 dark:text-slate-300">{invoice.seller.fiscalAddress}</p>
                {invoice.seller.phone && <p className="text-[11px]">Telf: {invoice.seller.phone}</p>}
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="font-bold">FACTURA DIGITAL:</span>
                  <span className="font-extrabold">{invoice.documentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span>N° CONTROL:</span>
                  <span className="font-bold">{invoice.controlNumber}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>FECHA/HORA:</span>
                  <span>{invoice.issueTimestamp}</span>
                </div>
                <div className="text-[10px] text-slate-500 text-center pt-0.5">
                  {invoice.controlRange}
                </div>
              </div>

              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <p className="font-bold uppercase">CLIENTE:</p>
                <p>{invoice.buyer.businessName}</p>
                <p>RIF/CI: {invoice.buyer.taxId}</p>
                <p className="leading-tight text-slate-600 dark:text-slate-300">DOM. FISCAL: {invoice.buyer.fiscalAddress}</p>
              </div>

              {/* Detalle ítems ticket */}
              <div className="py-2.5 border-b border-dashed border-slate-400">
                <div className="flex justify-between font-bold pb-1 text-[11px]">
                  <span>CANT / DESCRIPCIÓN</span>
                  <span>TOTAL (USD/Bs)</span>
                </div>
                {invoice.lines.map((line, idx) => (
                  <div key={idx} className="py-1 text-[11px] border-b border-slate-200 dark:border-slate-800 last:border-none">
                    <div className="flex justify-between">
                      <span className="font-medium">{line.quantity}x {line.description} ({line.taxCategory})</span>
                      <span className="font-bold">${line.totalUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>P.U. ${line.unitPriceUsd.toFixed(2)}</span>
                      <span>Bs {line.totalVes.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totales ticket */}
              <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Base Imponible (G 16%):</span>
                  <span>${invoice.totals.taxableAmountUsd.toFixed(2)} / Bs {invoice.totals.taxableAmountVes.toFixed(2)}</span>
                </div>
                {invoice.totals.exemptAmountUsd > 0 && (
                  <div className="flex justify-between">
                    <span>Total Exento (E):</span>
                    <span>${invoice.totals.exemptAmountUsd.toFixed(2)} / Bs {invoice.totals.exemptAmountVes.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>IVA (16%):</span>
                  <span>${invoice.totals.ivaAmountUsd.toFixed(2)} / Bs {invoice.totals.ivaAmountVes.toFixed(2)}</span>
                </div>
                {invoice.totals.igtfAmountUsd > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>IGTF (3%):</span>
                    <span>${invoice.totals.igtfAmountUsd.toFixed(2)} / Bs {invoice.totals.igtfAmountVes.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[10px] text-slate-500 pt-1">
                  <span>TASA OFICIAL BCV:</span>
                  <span>Bs {invoice.totals.bcvRate.toFixed(4)} ({invoice.totals.bcvRateDate})</span>
                </div>
                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-slate-400">
                  <span>TOTAL A PAGAR:</span>
                  <span>${invoice.totals.totalAmountUsd.toFixed(2)}</span>
                </div>
                <div className="flex justify-end font-extrabold text-xs text-slate-600 dark:text-slate-300">
                  <span>Bs {invoice.totals.totalAmountVes.toFixed(2)}</span>
                </div>

                {/* Retenciones */}
                {invoice.totals.retentionIvaAmountUsd && invoice.totals.retentionIvaAmountUsd > 0 ? (
                  <div className="pt-2 border-t border-dotted border-slate-400 text-[10px]">
                    <div className="flex justify-between text-rose-600 font-semibold">
                      <span>(-) Retención IVA ({invoice.totals.retentionIvaRate}%):</span>
                      <span>-${invoice.totals.retentionIvaAmountUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>NETO A LIQUIDAR:</span>
                      <span>${invoice.totals.netPayableUsd.toFixed(2)} (Bs {invoice.totals.netPayableVes.toFixed(2)})</span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Pie fiscal ticket */}
              <div className="pt-3 text-center space-y-1.5 text-[10px]">
                <p className="font-semibold text-slate-700 dark:text-slate-300">{invoice.statutoryNotice}</p>
                <div className="p-2 bg-white rounded border border-slate-300 inline-block">
                  <div className="w-24 h-24 bg-slate-100 flex items-center justify-center text-slate-500 text-[9px] font-mono text-center">
                    [QR FISCAL TELEMÁTICO]
                  </div>
                </div>
                <p className="font-mono text-[9px] text-slate-500 break-all">HASH: {invoice.digitalHashSha256.substring(0, 32)}...</p>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               VISTA COMPLETA A4 / CARTA (Para Distribuidoras y Mayoristas)
            ────────────────────────────────────────────────────────────── */
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 bg-white dark:bg-slate-900 shadow-sm print:border-none print:p-0">
              
              {/* Cabecera Superior */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <h2 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">
                      {invoice.seller.businessName}
                    </h2>
                  </div>
                  <p className="font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
                    RIF: {invoice.seller.taxId}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                    <span className="font-semibold">Domicilio Fiscal:</span> {invoice.seller.fiscalAddress}
                  </p>
                  {invoice.seller.phone && (
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold">Teléfono:</span> {invoice.seller.phone}
                    </p>
                  )}
                  {invoice.seller.email && (
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold">Email:</span> {invoice.seller.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:items-end justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="sm:text-right space-y-1">
                    <div className="inline-block px-3 py-1 rounded-md bg-blue-600 text-white font-black text-sm uppercase tracking-wide">
                      FACTURA DIGITAL
                    </div>
                    <div className="font-mono text-lg font-black text-slate-900 dark:text-white">
                      N° {invoice.documentNumber}
                    </div>
                  </div>

                  <div className="sm:text-right text-xs space-y-0.5 pt-2">
                    <p className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      N° DE CONTROL: {invoice.controlNumber}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {invoice.controlRange}
                    </p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center sm:justify-end gap-1.5 pt-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {invoice.issueTimestamp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Información del Comprador (Mandatorio Art. 8) */}
              <div className="my-6 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider mb-2">
                  Datos Fiscales del Adquiriente (Comprador)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Nombre / Razón Social:</p>
                    <p className="font-bold text-sm text-slate-900 dark:text-white uppercase">{invoice.buyer.businessName}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">RIF / C.I.:</p>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{invoice.buyer.taxId}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Domicilio Fiscal (Obligatorio Prov. 00093):</p>
                    <p className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{invoice.buyer.fiscalAddress}</p>
                    {invoice.buyer.phone && (
                      <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Teléfono: <span className="text-slate-700 dark:text-slate-300 font-medium">{invoice.buyer.phone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tabla de Productos / Servicios */}
              <div className="overflow-x-auto my-6">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-2">Cant</th>
                      <th className="py-2.5 px-2">Descripción del Ítem</th>
                      <th className="py-2.5 px-2 text-center">Alícuota</th>
                      <th className="py-2.5 px-2 text-right">P.U. ($ USD)</th>
                      <th className="py-2.5 px-2 text-right">Total ($ USD)</th>
                      <th className="py-2.5 px-2 text-right">Total (Bs VES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {invoice.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-2 font-bold">{line.quantity}</td>
                        <td className="py-2.5 px-2 font-medium">{line.description}</td>
                        <td className="py-2.5 px-2 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            line.taxCategory === 'E'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {line.taxCategory === 'E' ? 'Exento (E)' : `Gravado ${line.taxRate}% (G)`}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono">${line.unitPriceUsd.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono font-bold">${line.totalUsd.toFixed(2)}</td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-500">Bs {line.totalVes.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bloque de Totales Bimoneda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <p className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-blue-600" />
                      Régimen Cambiario Oficial (BCV)
                    </p>
                    <p className="text-slate-600 dark:text-slate-400">
                      Tasa de Referencia Oficial BCV: <span className="font-mono font-bold text-slate-900 dark:text-white">Bs {invoice.totals.bcvRate.toFixed(4)} / USD</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Fecha de cotización oficial: {invoice.totals.bcvRateDate}
                    </p>
                  </div>

                  {/* Detalle de Retenciones si existen */}
                  {invoice.totals.retentionIvaAmountUsd && invoice.totals.retentionIvaAmountUsd > 0 ? (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs space-y-1">
                      <p className="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Retenciones de Contribuyente Especial
                      </p>
                      <p className="text-rose-700 dark:text-rose-400 text-[11px]">
                        Comprobante N°: <span className="font-mono font-bold">{invoice.totals.retentionVoucherNumber || 'PENDIENTE'}</span>
                      </p>
                      <div className="flex justify-between pt-1 border-t border-rose-200 dark:border-rose-900/60 font-semibold">
                        <span>Retención IVA ({invoice.totals.retentionIvaRate}%):</span>
                        <span>-${invoice.totals.retentionIvaAmountUsd.toFixed(2)} (Bs {invoice.totals.retentionIvaAmountVes?.toFixed(2)})</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Base Imponible Gravada (G 16%):</span>
                    <span className="font-mono font-medium">${invoice.totals.taxableAmountUsd.toFixed(2)} / Bs {invoice.totals.taxableAmountVes.toFixed(2)}</span>
                  </div>

                  {invoice.totals.exemptAmountUsd > 0 && (
                    <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                      <span>Total Operaciones Exentas (E):</span>
                      <span className="font-mono font-medium">${invoice.totals.exemptAmountUsd.toFixed(2)} / Bs {invoice.totals.exemptAmountVes.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
                    <span>Impuesto al Valor Agregado IVA (16%):</span>
                    <span className="font-mono font-medium">${invoice.totals.ivaAmountUsd.toFixed(2)} / Bs {invoice.totals.ivaAmountVes.toFixed(2)}</span>
                  </div>

                  {invoice.totals.igtfAmountUsd > 0 && (
                    <div className="flex justify-between py-1 text-amber-700 dark:text-amber-400 font-semibold">
                      <span>IGTF Percibido en Divisas (3%):</span>
                      <span className="font-mono">${invoice.totals.igtfAmountUsd.toFixed(2)} / Bs {invoice.totals.igtfAmountVes.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-slate-300 dark:border-slate-700">
                    <div className="flex justify-between items-baseline font-black text-base text-slate-900 dark:text-white">
                      <span>TOTAL FACTURA:</span>
                      <span className="font-mono">${invoice.totals.totalAmountUsd.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-baseline text-xs font-bold text-slate-600 dark:text-slate-400">
                      <span>Contravalor en Bolívares:</span>
                      <span className="font-mono">Bs {invoice.totals.totalAmountVes.toFixed(2)}</span>
                    </div>
                  </div>

                  {invoice.totals.netPayableUsd !== invoice.totals.totalAmountUsd && (
                    <div className="pt-2 border-t border-dotted border-slate-300 dark:border-slate-700">
                      <div className="flex justify-between items-baseline font-black text-sm text-emerald-700 dark:text-emerald-400">
                        <span>NETO A LIQUIDAR (Deducidas Retenciones):</span>
                        <span className="font-mono">${invoice.totals.netPayableUsd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-xs font-bold text-emerald-600 dark:text-emerald-500">
                        <span>Neto en Bolívares:</span>
                        <span className="font-mono">Bs {invoice.totals.netPayableVes.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pie de Página Fiscal y Certificación Digital */}
              <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-600 dark:text-slate-400 text-center p-1 rounded">
                      <QrCode className="w-10 h-10 mb-0.5 text-blue-600" />
                      <span className="text-[8px] font-mono leading-none">VERIFICAR QR</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Certificación Telemática SENIAT
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md">
                      {invoice.statutoryNotice}
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] font-mono text-slate-400">
                        SHA-256: {invoice.digitalHashSha256.substring(0, 24)}...
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHash}
                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 print:hidden"
                      >
                        {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        {copiedHash ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400 print:text-slate-500">
                  <p>Software Homologado: <span className="font-bold text-slate-600 dark:text-slate-300">Rendo ERP v2.0</span></p>
                  <p>Emisión Telemática en la Nube</p>
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
