'use client';

import React, { useRef, useState } from 'react';
import { X, Printer, Share2, Plus, Check, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { logExternalWhatsAppMessageAction } from '@/app/actions/whatsapp';

export interface SaleReceiptData {
  documentNumber: string;
  docLabel: string;
  docSubtype: string;
  createdAt: string;
  customerName: string;
  customerTaxId?: string;
  customerPhone?: string;
  companyName?: string;
  companyTaxId?: string;
  companyAddress?: string;
  companyPhone?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  taxAmount: number;
  total: number;
  totalVES: number;
  rate: number;
  paymentMethod: string;
  cashTenderedUSD?: number;
  cashTenderedVES?: number;
  changeDueUSD?: number;
  changeDueVES?: number;
  cashier: string;
}

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: SaleReceiptData | null;
}

export function ReceiptModal({ isOpen, onClose, saleData }: ReceiptModalProps) {
  const { toast } = useToast();
  const currentTenant = useERPStore((s) => s.currentTenant);
  const actor = useActionActor();
  const [customPhone, setCustomPhone] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !saleData) return null;

  const handlePrint = () => {
    window.print();
  };

  const getPaymentMethodLabel = (method: string) => {
    const map: Record<string, string> = {
      cash_usd: 'Efectivo USD ($)',
      cash_ves: 'Efectivo Bolívares (Bs)',
      pago_movil: 'Pago Móvil',
      card: 'Tarjeta / Punto de Venta',
      transfer: 'Transferencia Bancaria',
      zelle: 'Zelle ($)',
      mixed: 'Pago Combinado / Mixto',
      cash: 'Efectivo',
      credit: 'Venta a Crédito (Cta. por Cobrar)',
    };
    return map[method] || method;
  };

  const generateWhatsAppText = () => {
    const lines = [
      `*${saleData.companyName || 'RENDO ERP'}*`,
      saleData.companyTaxId ? `RIF: ${saleData.companyTaxId}` : '',
      `--------------------------------`,
      `*${saleData.docLabel.toUpperCase()}*`,
      `N°: ${saleData.documentNumber}`,
      `Fecha: ${new Date(saleData.createdAt).toLocaleDateString('es-VE')} ${new Date(saleData.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`,
      `Cliente: ${saleData.customerName}`,
      saleData.customerTaxId ? `CI/RIF: ${saleData.customerTaxId}` : '',
      `--------------------------------`,
      `*DETALLE DE PRODUCTOS:*`,
      ...saleData.items.map(it => `${it.quantity}x ${it.description} - $${it.total.toFixed(2)}`),
      `--------------------------------`,
      `Subtotal: $${saleData.subtotal.toFixed(2)}`,
      saleData.taxAmount > 0 ? `IVA (16%): +$${saleData.taxAmount.toFixed(2)}` : '',
      `*TOTAL A PAGAR: $${saleData.total.toFixed(2)} USD*`,
      `*(Bs. ${saleData.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})*`,
      `Tasa Oficial: Bs. ${saleData.rate.toFixed(2)}`,
      `--------------------------------`,
      `Pago: ${getPaymentMethodLabel(saleData.paymentMethod)}`,
      saleData.changeDueUSD && saleData.changeDueUSD > 0 ? `Vuelto: $${saleData.changeDueUSD.toFixed(2)} USD` : '',
      `--------------------------------`,
      `¡Gracias por su preferencia!`,
      `Atendido por: ${saleData.cashier}`
    ].filter(Boolean).join('\n');

    return encodeURIComponent(lines);
  };

  const handleSendWhatsApp = () => {
    const rawPhone = customPhone.trim() || saleData.customerPhone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (!cleanPhone) {
      setShowPhoneInput(true);
      return;
    }

    // Si tiene 10 dígitos (ej. 4121234567), anteponer 58 (código Venezuela)
    const finalPhone = cleanPhone.length === 10 ? `58${cleanPhone}` : cleanPhone;
    const textEncoded = generateWhatsAppText();
    const url = `https://wa.me/${finalPhone}?text=${textEncoded}`;
    window.open(url, '_blank');
    toast({ variant: 'success', title: 'Comprobante Enviado', description: 'Abriendo WhatsApp con el recibo.' });

    // Registrar en el CRM de WhatsApp
    if (currentTenant?.id && actor) {
      logExternalWhatsAppMessageAction(
        {
          phone: finalPhone,
          client_name: saleData.customerName,
          text: decodeURIComponent(textEncoded),
          module_source: 'caja',
          metadata: {
            document_number: saleData.documentNumber,
            total_usd: saleData.total,
          },
        },
        currentTenant.id,
        actor
      ).catch((err) => console.warn('[WhatsApp CRM Log Warning]:', err));
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Contenedor Modal */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh] overflow-hidden">
        
        {/* Cabecera Superior Modal */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600 bg-emerald-500/10 p-1.5 rounded-xl">
              <Check size={18} />
            </span>
            <div>
              <h3 className="text-sm font-black text-foreground">Venta Procesada Exitosamente</h3>
              <p className="text-[10px] text-slate-400">Comprobante emitido listo para entregar</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-100 dark:bg-slate-950/60">
          
          {/* TICKET TÉRMICO VISUAL (FORMATO 80MM) */}
          <div 
            id="thermal-receipt-print-area"
            ref={printRef}
            className="w-full max-w-[320px] bg-white text-slate-900 font-mono text-[11px] leading-relaxed p-5 shadow-md border border-dashed border-slate-300 rounded-sm space-y-2 select-text"
          >
            {/* Cabecera Empresa */}
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-2">
              <h2 className="font-black text-sm uppercase tracking-wider">
                {saleData.companyName || 'RENDO ERP'}
              </h2>
              {saleData.companyTaxId && (
                <p className="text-[10px] font-bold text-slate-700">RIF: {saleData.companyTaxId}</p>
              )}
              {saleData.companyAddress && (
                <p className="text-[10px] text-slate-600">{saleData.companyAddress}</p>
              )}
              {saleData.companyPhone && (
                <p className="text-[10px] text-slate-600">Telf: {saleData.companyPhone}</p>
              )}
            </div>

            {/* Documento y Fecha */}
            <div className="text-center py-1 border-b border-dashed border-slate-400 space-y-0.5">
              <span className="font-black text-xs block uppercase">
                {saleData.docLabel}
              </span>
              <p className="font-bold text-xs">{saleData.documentNumber}</p>
              <p className="text-[10px] text-slate-500">
                {new Date(saleData.createdAt).toLocaleDateString('es-VE')} - {new Date(saleData.createdAt).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Cliente */}
            <div className="py-1 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              <p><strong>Cliente:</strong> {saleData.customerName}</p>
              {saleData.customerTaxId && (
                <p><strong>CI/RIF:</strong> {saleData.customerTaxId}</p>
              )}
              {saleData.customerPhone && (
                <p><strong>Telf:</strong> {saleData.customerPhone}</p>
              )}
            </div>

            {/* Tabla de Artículos */}
            <div className="py-1 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between font-black text-[10px] border-b border-slate-200 pb-1">
                <span className="w-8">CANT</span>
                <span className="flex-1">DESCRIPCIÓN</span>
                <span className="w-14 text-right">TOTAL</span>
              </div>
              {saleData.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-start text-[10px] gap-1">
                  <span className="w-8 font-bold">{it.quantity}x</span>
                  <span className="flex-1 truncate">{it.description}</span>
                  <span className="w-14 text-right font-bold">${it.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Totales Bimoneda */}
            <div className="py-1 space-y-1 text-[11px] border-b border-dashed border-slate-400">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>${saleData.subtotal.toFixed(2)}</span>
              </div>

              {saleData.taxAmount > 0 && (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>IVA (16% Fiscal):</span>
                  <span>+${saleData.taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
                <span>TOTAL USD:</span>
                <span>${saleData.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between font-black text-xs text-blue-900 pt-0.5">
                <span>TOTAL BS:</span>
                <span>Bs. {saleData.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div className="text-[9px] text-slate-500 text-right">
                Tasa BCV: Bs. {saleData.rate.toFixed(2)} / USD
              </div>
            </div>

            {/* Forma de Pago y Vuelto */}
            <div className="py-1 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Forma de Pago:</span>
                <span className="font-bold capitalize">{getPaymentMethodLabel(saleData.paymentMethod)}</span>
              </div>

              {saleData.changeDueUSD !== undefined && saleData.changeDueUSD > 0 && (
                <div className="flex justify-between font-black text-emerald-800">
                  <span>Vuelto Entregado:</span>
                  <span>${saleData.changeDueUSD.toFixed(2)} USD</span>
                </div>
              )}
            </div>

            {/* Pie de Ticket */}
            <div className="text-center pt-2 space-y-1 text-[9px] text-slate-600">
              <p className="font-bold text-[10px]">¡GRACIAS POR SU PREFERENCIA!</p>
              <p>Atendido por: {saleData.cashier}</p>
              <p className="text-[8px] text-slate-400 font-mono">Sistema Rendo POS</p>
            </div>
          </div>
        </div>

        {/* Input teléfono si no existe */}
        {showPhoneInput && (
          <div className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-t border-border flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 shrink-0">N° WhatsApp:</span>
            <input
              type="text"
              placeholder="04121234567"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground font-mono"
            />
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold btn-haptic"
            >
              Enviar
            </button>
          </div>
        )}

        {/* Acciones del Modal */}
        <div className="p-4 border-t border-border bg-white/40 dark:bg-slate-900/40 flex items-center justify-between gap-2">
          {/* Imprimir Ticket */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 transition-all btn-haptic"
            title="Imprimir ticket en impresora térmica (80mm o 58mm)"
          >
            <Printer size={15} />
            <span>Imprimir</span>
          </button>

          {/* Enviar WhatsApp */}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all btn-haptic"
            title="Enviar comprobante detallado por WhatsApp"
          >
            <MessageSquare size={15} />
            <span>WhatsApp</span>
          </button>

          {/* Nueva Venta */}
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground text-xs font-bold transition-all btn-haptic"
            title="Continuar con el siguiente cliente"
          >
            + Nueva Venta
          </button>
        </div>
      </div>

      {/* ESTILOS DE IMPRESIÓN EXCLUSIVA TÉRMICA (80MM) */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-print-area,
          #thermal-receipt-print-area * {
            visibility: visible !important;
          }
          #thermal-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: auto;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
}
