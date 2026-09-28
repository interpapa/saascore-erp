'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Printer,
  Receipt,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Banknote,
  SendHorizontal
} from 'lucide-react';
import { processSecureCheckout, CartItem } from '@/app/actions/checkout';
import { createEntityRecordAction } from '@/app/actions/entityRecords';
import { ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

export interface PlannedTreatmentItem {
  id?: string;
  toothNum: string;
  procedureName: string;
  cost: number;
  category?: string;
  notes?: string;
}

interface DentalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    tax_id?: string | null;
  };
  plannedTreatments: PlannedTreatmentItem[];
  tenantId: string;
  actor: ActionActor;
  exchangeRate?: number;
  onSuccess: () => void;
}

export function DentalCheckoutModal({
  isOpen,
  onClose,
  patient,
  plannedTreatments,
  tenantId,
  actor,
  exchangeRate = 850.0,
  onSuccess,
}: DentalCheckoutModalProps) {
  const { toast } = useToast();

  // Procedimientos seleccionados para cobrar en esta sesión (por defecto todos)
  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    plannedTreatments.map((_, idx) => idx)
  );

  // Modo de cobro: 'full' (100% de los seleccionados) o 'partial' (abono/anticipo de sesión)
  const [billingMode, setBillingMode] = useState<'full' | 'partial'>('full');
  const [partialAmountUSD, setPartialAmountUSD] = useState<string>('');

  // Método de pago principal
  const [paymentMethod, setPaymentMethod] = useState<'cash_usd' | 'transfer' | 'card' | 'credit'>('cash_usd');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Estados de proceso
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedDoc, setCompletedDoc] = useState<any>(null);

  // Cálculos financieros
  const subtotalUSD = useMemo(() => {
    return selectedIndices.reduce((sum, idx) => {
      const item = plannedTreatments[idx];
      return sum + (item ? Number(item.cost || 0) : 0);
    }, 0);
  }, [selectedIndices, plannedTreatments]);

  const discountAmountUSD = useMemo(() => {
    if (discountPercent <= 0) return 0;
    return (subtotalUSD * discountPercent) / 100;
  }, [subtotalUSD, discountPercent]);

  const finalTreatmentTotalUSD = Math.max(0, subtotalUSD - discountAmountUSD);

  const amountToChargeUSD = useMemo(() => {
    if (billingMode === 'full') {
      return finalTreatmentTotalUSD;
    }
    const entered = parseFloat(partialAmountUSD) || 0;
    return Math.min(finalTreatmentTotalUSD, Math.max(0, entered));
  }, [billingMode, finalTreatmentTotalUSD, partialAmountUSD]);

  const remainingBalanceUSD = Math.max(0, finalTreatmentTotalUSD - amountToChargeUSD);
  const amountToChargeVES = amountToChargeUSD * exchangeRate;

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIndices.length === plannedTreatments.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(plannedTreatments.map((_, idx) => idx));
    }
  };

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleExecuteCheckout = async () => {
    if (selectedIndices.length === 0) {
      toast({
        variant: 'warning',
        title: 'Selecciona tratamientos',
        description: 'Debes marcar al menos un procedimiento para facturar.',
      });
      return;
    }

    if (amountToChargeUSD <= 0 && paymentMethod !== 'credit') {
      toast({
        variant: 'warning',
        title: 'Monto a cobrar inválido',
        description: 'Ingresa un monto mayor a $0 o selecciona cobro a Crédito.',
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Preparar ítems del carrito formal
      const cartItems: CartItem[] = selectedIndices.map((idx) => {
        const item = plannedTreatments[idx];
        const toothPrefix = item.toothNum ? `[Pieza #${item.toothNum}] ` : '';
        return {
          itemId: item.id || `custom-dental-${Date.now()}-${idx}`,
          name: `${toothPrefix}${item.procedureName}`,
          price: Number(item.cost || 0),
          quantity: 1,
          type: 'service',
        };
      });

      // Si hay descuento global, se ajusta el precio o se agrega línea de descuento
      const safePaymentBreakdown =
        paymentMethod === 'credit'
          ? [{ method: 'credit' as const, amount: finalTreatmentTotalUSD }]
          : billingMode === 'partial' && remainingBalanceUSD > 0
          ? [
              {
                method: (paymentMethod === 'transfer' ? 'transfer' : paymentMethod === 'card' ? 'card' : 'cash') as any,
                amount: amountToChargeUSD,
              },
              { method: 'credit' as const, amount: remainingBalanceUSD },
            ]
          : undefined;

      const checkoutRes = await processSecureCheckout(
        cartItems,
        patient.id,
        paymentMethod,
        tenantId,
        actor,
        'VE',
        `dental-pay-${Date.now()}`,
        false, // odontología exenta o sin IVA discriminado por defecto
        safePaymentBreakdown
      );

      if (!checkoutRes.success) {
        toast({
          variant: 'error',
          title: 'Error al procesar cobro',
          description: checkoutRes.error || 'No se pudo generar la factura.',
        });
        return;
      }

      // Registrar automáticamente en la Historia Clínica del paciente
      const procedureNames = selectedIndices
        .map((idx) => {
          const t = plannedTreatments[idx];
          return `${t.toothNum ? `Pieza #${t.toothNum}: ` : ''}${t.procedureName}`;
        })
        .join('; ');

      const clinicalNote = `Tratamiento Odontológico Facturado:\n${procedureNames}\n` +
        `Total Presupuestado: $${finalTreatmentTotalUSD.toFixed(2)} USD.\n` +
        `Monto Cobrado Hoy: $${amountToChargeUSD.toFixed(2)} USD (${paymentMethod.toUpperCase()}).\n` +
        (remainingBalanceUSD > 0 ? `Saldo Pendiente / Crédito: $${remainingBalanceUSD.toFixed(2)} USD.` : 'Tratamiento cancelado en su totalidad.');

      await createEntityRecordAction(
        {
          entity_id: patient.id,
          record_type: 'clinical_note',
          title: `Atención & Cobro Dental — Factura #${checkoutRes.document?.document_number || 'N/A'}`,
          body: clinicalNote,
          metadata: {
            source: 'dental_suite_checkout',
            document_id: checkoutRes.document?.id,
            document_number: checkoutRes.document?.document_number,
            amount_paid: amountToChargeUSD,
            remaining_balance: remainingBalanceUSD,
            payment_method: paymentMethod,
            reference: referenceNumber || null,
          },
        },
        tenantId,
        actor
      );

      setCompletedDoc(checkoutRes.document);
      toast({
        variant: 'success',
        title: '¡Cobro y Facturación Completada!',
        description: `Se emitió el comprobante #${checkoutRes.document?.document_number || ''} para ${patient.name}.`,
      });

      onSuccess();
    } catch (err: unknown) {
      console.error('[DentalCheckoutModal]:', err);
      toast({
        variant: 'error',
        title: 'Error de cobro',
        description: (err as Error).message || 'No se pudo completar la transacción.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        {/* Cabecera */}
        <div className="p-5 border-b border-border bg-linear-to-r from-teal-500/10 via-cyan-500/10 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-teal-500/20">
              <Receipt size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Facturar y Cobrar Tratamiento Dental
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Paciente: <strong className="text-foreground">{patient.name}</strong>
                {patient.tax_id && ` · ${patient.tax_id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Si ya se completó el cobro: Pantalla de Recibo */}
        {completedDoc ? (
          <div className="p-8 text-center space-y-6 overflow-y-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-foreground">¡Transacción Exitosa!</h4>
              <p className="text-xs text-slate-500 font-mono">
                Documento Fiscal #{completedDoc.document_number}
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl max-w-md mx-auto text-left text-xs space-y-2.5">
              <div className="flex justify-between border-b border-border pb-2 font-bold">
                <span className="text-slate-400">Total Presupuestado:</span>
                <span className="font-mono">${finalTreatmentTotalUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2 font-bold text-emerald-600 dark:text-emerald-400">
                <span>Monto Cobrado en Consulta:</span>
                <span className="font-mono text-sm">${amountToChargeUSD.toFixed(2)} USD</span>
              </div>
              {amountToChargeVES > 0 && paymentMethod !== 'cash_usd' && (
                <div className="flex justify-between text-slate-500 border-b border-border pb-2">
                  <span>Equivalente en Bolívares (VES):</span>
                  <span className="font-mono font-bold">
                    Bs. {amountToChargeVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1">
                <span className="text-slate-400">Saldo Pendiente / Crédito:</span>
                <span className={`font-mono ${remainingBalanceUSD > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                  ${remainingBalanceUSD.toFixed(2)} USD
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                <span>Método Utilizado:</span>
                <span className="uppercase font-semibold text-foreground">{paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-3 max-w-md mx-auto pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2.5 px-4 bg-card border border-border text-foreground rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                <Printer size={16} />
                <span>Imprimir Recibo</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors shadow-xs"
              >
                Volver a la Consulta
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Cobro Integrado */
          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* 1. Selección de Procedimientos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tratamientos a Facturar ({selectedIndices.length}/{plannedTreatments.length})
                </label>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {selectedIndices.length === plannedTreatments.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              <div className="border border-border rounded-2xl divide-y divide-border max-h-48 overflow-y-auto bg-background">
                {plannedTreatments.map((pt, idx) => {
                  const isChecked = selectedIndices.includes(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleIndex(idx)}
                      className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-primary/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // controlado por onClick del padre
                          className="rounded-md border-input accent-primary w-4 h-4 cursor-pointer"
                        />
                        <div>
                          <p className="font-bold text-foreground">
                            {pt.toothNum ? `🦷 Pieza #${pt.toothNum} — ` : ''}{pt.procedureName}
                          </p>
                          {pt.notes && <p className="text-[11px] text-slate-400">{pt.notes}</p>}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-foreground text-sm">
                        ${Number(pt.cost || 0).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Modalidad de Cobro: Total vs Abono/Anticipo */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Modalidad de Pago
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setBillingMode('full')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                    billingMode === 'full'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-slate-600 dark:text-slate-400 hover:border-primary/40'
                  }`}
                >
                  <DollarSign size={18} />
                  <div>
                    <p className="text-xs font-bold">Pago Total (100%)</p>
                    <p className="text-[10px] opacity-70">Cancela el monto completo del tratamiento</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBillingMode('partial');
                    if (!partialAmountUSD) {
                      setPartialAmountUSD((finalTreatmentTotalUSD * 0.5).toFixed(2)); // Sugerir 50%
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                    billingMode === 'partial'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border text-slate-600 dark:text-slate-400 hover:border-primary/40'
                  }`}
                >
                  <Percent size={18} />
                  <div>
                    <p className="text-xs font-bold">Anticipo / Abono Parcial</p>
                    <p className="text-[10px] opacity-70">Para tratamientos multisesión o laboratorio</p>
                  </div>
                </button>
              </div>

              {/* Si es abono parcial: Campo de monto */}
              {billingMode === 'partial' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl flex items-center gap-3">
                  <span className="text-xs font-bold text-foreground">Monto del Anticipo:</span>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={finalTreatmentTotalUSD}
                      value={partialAmountUSD}
                      onChange={(e) => setPartialAmountUSD(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-3 py-1.5 bg-background border border-input rounded-xl text-xs font-mono font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Resta: <strong className="text-amber-600">${remainingBalanceUSD.toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 3. Métodos de Pago */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Método de Cobro
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'cash_usd', label: 'Efectivo USD', icon: <Banknote size={16} /> },
                  { id: 'transfer', label: 'Pago Móvil / Transf.', icon: <SendHorizontal size={16} /> },
                  { id: 'card', label: 'Punto / Tarjeta', icon: <CreditCard size={16} /> },
                  { id: 'credit', label: 'A Crédito (Deuda)', icon: <AlertTriangle size={16} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all ${
                      paymentMethod === m.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card border-border text-slate-600 dark:text-slate-300 hover:border-primary/50'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Si es transferencia / pago móvil, pedir referencia opcional */}
              {paymentMethod === 'transfer' && (
                <div className="pt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Número de referencia o confirmación bancaria (opcional)"
                    className="w-full text-xs bg-background border border-input rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
            </div>

            {/* 4. Resumen y Descuento */}
            <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-500/20 rounded-2xl space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Subtotal de Procedimientos:</span>
                <span className="font-mono font-bold text-foreground">${subtotalUSD.toFixed(2)} USD</span>
              </div>

              {/* Descuento convenido */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  Descuento Profesional:
                </span>
                <div className="flex items-center gap-1">
                  {[0, 5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountPercent(pct)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        discountPercent === pct
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'border-border text-slate-500 hover:border-teal-500/50'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-teal-500/20 pt-2 flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300 block">
                    TOTAL A COBRAR EN ESTA CITA:
                  </span>
                  {amountToChargeVES > 0 && paymentMethod !== 'cash_usd' && (
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 font-mono">
                      ≈ Bs. {amountToChargeVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (Tasa: {exchangeRate})
                    </span>
                  )}
                </div>
                <span className="text-2xl font-black font-mono text-primary">
                  ${amountToChargeUSD.toFixed(2)} <span className="text-xs text-slate-400">USD</span>
                </span>
              </div>

              {remainingBalanceUSD > 0 && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  ℹ️ Quedarán ${remainingBalanceUSD.toFixed(2)} USD registrados en la cuenta por cobrar del paciente para las siguientes sesiones.
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="w-1/3 py-2.5 border border-border bg-card hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleExecuteCheckout}
                disabled={isProcessing || selectedIndices.length === 0}
                className="w-2/3 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs rounded-xl transition-all shadow-md shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 btn-haptic"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Facturando y Emitiendo Asiento...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Confirmar y Facturar (${amountToChargeUSD.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
