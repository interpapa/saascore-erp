'use client';

import React, { useState, useMemo } from 'react';
import { Printer, ShieldCheck, FileText, X } from 'lucide-react';

const now = Date.now();

interface InvoicePrintViewProps {
  document: unknown;
  onClose: () => void;
}

export function InvoicePrintView({ document, onClose }: InvoicePrintViewProps) {
  const [printFormat, setPrintFormat] = useState<'letter' | 'thermal'>('letter');
  const doc = document as { created_at?: string; metadata?: Record<string, unknown>; document_number?: string; subtotal_amount?: number; tax_amount?: number; total_amount?: number; id?: string };
  const printedDate = useMemo(() => new Date(doc?.created_at || now), [doc?.created_at]);
  
  if (!doc) return null;

  const metadata = (doc.metadata as Record<string, unknown>) || {};
  const customer = (metadata.customer_snapshot as Record<string, unknown>) || {};
  const taxDetails = (metadata.tax_details as Record<string, unknown>) || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-60 overflow-y-auto">
      <div className={`bg-slate-900 border border-slate-800 w-full p-6 space-y-6 shadow-2xl text-slate-200 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none mx-auto ${
        printFormat === 'thermal' ? 'max-w-[300px] rounded-sm' : 'max-w-2xl rounded-2xl'
      }`}>
        {/* Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white text-lg">Factura</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            <div className="flex bg-slate-800 p-1 rounded-lg">
              <button
                onClick={() => setPrintFormat('letter')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${printFormat === 'letter' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Carta PDF
              </button>
              <button
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${printFormat === 'thermal' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Ticket Térmico
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrint}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg transition"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Invoice Printable Area */}
        {printFormat === 'letter' ? (
          <div id="printable-invoice" className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800/80 pb-6 print:border-black">
              <div>
                <h1 className="text-2xl font-black text-white print:text-black tracking-tight">Rendo</h1>
                <p className="text-xs text-slate-400 print:text-gray-600 mt-1">Comprobante Fiscal Inmutable</p>
                <p className="text-xs font-mono text-slate-500 print:text-gray-500 mt-0.5">
                  Localización: {metadata.localization || 'VE'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold uppercase px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded print:border-black print:text-black">
                  {doc.document_number}
                </span>
                <p className="text-xs text-slate-400 print:text-gray-600 mt-2">
                  Fecha: {printedDate.toLocaleDateString()}
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
                <span className="col-span-2">Concepto / Artículo</span>
                <span className="text-right">Cantidad x P. Unit</span>
                <span className="text-right">Total</span>
              </div>
              <div className="p-4 text-sm space-y-3">
                {metadata.cart_lines && metadata.cart_lines.length > 0 ? (
                  metadata.cart_lines.map((line: Record<string, any>, idx: number) => (
                    <div key={idx} className="grid grid-cols-4 text-slate-200 print:text-black items-center text-xs">
                      <span className="col-span-2 font-semibold text-white print:text-black">{line.description}</span>
                      <span className="text-right font-mono text-slate-400 print:text-gray-700">
                        {line.quantity} x ${Number(line.unit_price).toFixed(2)}
                      </span>
                      <span className="text-right font-bold text-slate-100 print:text-black">
                        ${Number(line.total || (line.unit_price * line.quantity)).toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="grid grid-cols-4 text-slate-200 print:text-black items-center">
                    <span className="col-span-2 font-medium">Venta General POS</span>
                    <span className="text-right text-xs uppercase font-mono text-slate-400 print:text-gray-700">
                      {metadata.payment_method || 'Contado'}
                    </span>
                    <span className="text-right font-bold">${Number(doc.subtotal_amount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tax Breakdown & Totals */}
            <div className="flex justify-between items-end pt-2">
              <div className="text-xs text-slate-500 print:text-gray-600 space-y-1">
                <div className="flex items-center gap-1 text-emerald-400 print:text-black font-medium">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Factura Sellada Inmutablemente</span>
                </div>
                <p className="font-mono text-[10px]">ID: {doc.id}</p>
                <p className="font-mono text-[10px]">Emisor: {metadata.processed_by || 'Sistema ERP'}</p>
              </div>

              <div className="w-72 space-y-1.5 text-right text-xs">
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200 print:text-black">${Number(doc.subtotal_amount || 0).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-slate-400 print:text-gray-600">
                  <span>Impuesto ({((taxDetails.taxRate || 0) * 100).toFixed(0)}%):</span>
                  <span className="font-mono text-slate-200 print:text-black">${Number(doc.tax_amount || 0).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white print:text-black pt-2 border-t border-slate-800 print:border-gray-400">
                  <span>Total USD:</span>
                  <span className="font-mono text-indigo-400 print:text-black">${Number(doc.total_amount || 0).toFixed(2)} USD</span>
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
        ) : (
          <div id="printable-invoice" className="font-mono text-[10px] text-slate-200 print:text-black space-y-3 p-2 mx-auto">
            <div className="text-center pb-2 border-b border-dashed border-slate-600 print:border-black">
              <h1 className="text-sm font-black uppercase tracking-wider">Rendo</h1>
              <p className="mt-1">Comprobante Fiscal</p>
              <p className="mt-0.5">Factura: {doc.document_number}</p>
              <p>Fecha: {printedDate.toLocaleString()}</p>
            </div>
            
            <div className="py-2 border-b border-dashed border-slate-600 print:border-black space-y-0.5">
              <p>CLIENTE: {customer.snapshot_name || 'Cliente de Contado'}</p>
              <p>RIF/ID: {customer.snapshot_tax_id || 'N/A'}</p>
            </div>

            <div className="py-2 border-b border-dashed border-slate-600 print:border-black">
              <div className="flex justify-between font-bold mb-1">
                <span>CANT DESCRIPCION</span>
                <span>TOTAL</span>
              </div>
              <div className="space-y-1">
                {metadata.cart_lines && metadata.cart_lines.length > 0 ? (
                  metadata.cart_lines.map((line: Record<string, any>, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                      <span className="pr-2">{line.quantity}x {line.description}</span>
                      <span>${Number(line.total || (line.unit_price * line.quantity)).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-start">
                    <span className="pr-2">1x Venta General POS</span>
                    <span>${Number(doc.subtotal_amount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="py-2 border-b border-dashed border-slate-600 print:border-black space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span>${Number(doc.subtotal_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>IVA ({((taxDetails.taxRate || 0) * 100).toFixed(0)}%):</span>
                <span>${Number(doc.tax_amount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-xs mt-1 pt-1 border-t border-dashed border-slate-700 print:border-gray-400">
                <span>TOTAL USD:</span>
                <span>${Number(doc.total_amount || 0).toFixed(2)}</span>
              </div>
              {metadata.total_local && (
                <div className="flex justify-between font-bold text-xs mt-1">
                  <span>TOTAL LOCAL:</span>
                  <span>{metadata.currency_symbol || 'Bs.'} {Number(metadata.total_local).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            <div className="text-center pt-2 space-y-1 opacity-80">
              <p className="font-bold">¡Gracias por su compra!</p>
              <p>Tasa: {metadata.exchange_rate} {metadata.currency_symbol || 'Bs.'}/USD</p>
              <p>Pago: {metadata.payment_method === 'mixed' ? 'Mixto' : metadata.payment_method}</p>
              {metadata.payments && metadata.payments.length > 0 && (
                <div className="text-[8px] text-left mt-1 border border-slate-700 print:border-gray-400 p-1">
                  {metadata.payments.map((p: Record<string, any>, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span className="uppercase">{p.method}:</span>
                      <span>${p.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[8px] truncate">Ref: {doc.id}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
