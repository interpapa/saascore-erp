'use client';

import React from 'react';
import { Printer, CheckCircle2, ShieldCheck, FileText, X } from 'lucide-react';

interface InvoicePrintViewProps {
  document: any;
  onClose: () => void;
}

export function InvoicePrintView({ document, onClose }: InvoicePrintViewProps) {
  if (!document) return null;

  const metadata = document.metadata || {};
  const customer = metadata.customer_snapshot || {};
  const taxDetails = metadata.tax_details || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-60 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl text-slate-200 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white text-lg">Factura Fiscal Digital</h2>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Printable Area */}
        <div id="printable-invoice" className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-800/80 pb-6 print:border-black">
            <div>
              <h1 className="text-2xl font-black text-white print:text-black tracking-tight">SaaSCORE ERP</h1>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-1">Comprobante Fiscal Inmutable</p>
              <p className="text-xs font-mono text-slate-500 print:text-gray-500 mt-0.5">
                Localización: {metadata.localization || 'VE'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded print:border-black print:text-black">
                {document.document_number}
              </span>
              <p className="text-xs text-slate-400 print:text-gray-600 mt-2">
                Fecha: {new Date(document.created_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Customer Snapshot */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/60 print:bg-gray-100 print:border-gray-300 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 font-medium print:text-gray-500">CLIENTE (SNAPSHOT INMUTABLE)</p>
              <p className="font-bold text-white print:text-black text-sm mt-0.5">{customer.snapshot_name || 'Cliente de Contado'}</p>
              <p className="text-slate-400 print:text-gray-700 font-mono">RIF/ID: {customer.snapshot_tax_id || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-500 font-medium print:text-gray-500">DETALLES DE CONTACTO</p>
              <p className="text-slate-300 print:text-gray-700 mt-0.5">{customer.snapshot_email || 'N/A'}</p>
              <p className="text-slate-300 print:text-gray-700">{customer.snapshot_phone || 'N/A'}</p>
            </div>
          </div>

          {/* Invoice Summary */}
          <div className="border border-slate-800 rounded-xl overflow-hidden print:border-gray-300">
            <div className="bg-slate-950/80 print:bg-gray-200 px-4 py-2.5 text-xs font-semibold text-slate-400 print:text-gray-700 grid grid-cols-4">
              <span className="col-span-2">Concepto / Resumen</span>
              <span className="text-right">Método</span>
              <span className="text-right">Monto</span>
            </div>
            <div className="p-4 text-sm space-y-2">
              <div className="grid grid-cols-4 text-slate-200 print:text-black">
                <span className="col-span-2 font-medium">Venta General POS</span>
                <span className="text-right text-xs uppercase font-mono text-slate-400 print:text-gray-700">
                  {metadata.payment_method || 'Contado'}
                </span>
                <span className="text-right font-bold">${Number(document.subtotal_amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Tax Breakdown & Totals */}
          <div className="flex justify-between items-end pt-2">
            <div className="text-xs text-slate-500 print:text-gray-600 space-y-1">
              <div className="flex items-center gap-1 text-emerald-400 print:text-black font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Factura Sellada Inmutablemente</span>
              </div>
              <p className="font-mono text-[10px]">ID: {document.id}</p>
              <p className="font-mono text-[10px]">Emisor: {metadata.processed_by || 'Sistema ERP'}</p>
            </div>

            <div className="w-72 space-y-1.5 text-right text-xs">
              <div className="flex justify-between text-slate-400 print:text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200 print:text-black">${Number(document.subtotal_amount || 0).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-400 print:text-gray-600">
                <span>Impuesto ({((taxDetails.taxRate || 0) * 100).toFixed(0)}%):</span>
                <span className="font-mono text-slate-200 print:text-black">${Number(document.tax_amount || 0).toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white print:text-black pt-2 border-t border-slate-800 print:border-gray-400">
                <span>Total USD:</span>
                <span className="font-mono text-indigo-400 print:text-black">${Number(document.total_amount || 0).toFixed(2)} USD</span>
              </div>
              {metadata.total_local && (
                <div className="flex justify-between text-xs font-bold text-emerald-400 print:text-gray-800 pt-1">
                  <span>Total Moneda Local ({metadata.currency_symbol || 'Bs.'}):</span>
                  <span className="font-mono">{metadata.currency_symbol || 'Bs.'} {Number(metadata.total_local).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
              {metadata.exchange_rate && (
                <div className="text-[10px] text-slate-500 print:text-gray-500 font-mono pt-0.5">
                  Tasa de cambio sellada: {metadata.exchange_rate} {metadata.currency_symbol || 'Bs.'}/USD
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
