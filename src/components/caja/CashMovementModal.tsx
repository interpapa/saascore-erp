'use client';

import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, DollarSign, FileText, CheckCircle2, ShoppingCart } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import { recordCashMovementAction } from '@/app/actions/cashRegister';

interface CashMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  actor: any;
  currentRate: number;
  onSuccess: () => void;
}

export function CashMovementModal({
  isOpen,
  onClose,
  tenantId,
  actor,
  currentRate,
  onSuccess
}: CashMovementModalProps) {
  const { toast } = useToast();
  const [type, setType] = useState<'out' | 'in'>('out');
  const [currencyMode, setCurrencyMode] = useState<'usd' | 'ves'>('usd');
  const [amountUSD, setAmountUSD] = useState('');
  const [amountVES, setAmountVES] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const rate = currentRate || 849.56;

  // Actualización reactiva entre monedas
  const handleUSDChange = (val: string) => {
    setAmountUSD(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setAmountVES((num * rate).toFixed(2));
    } else {
      setAmountVES('');
    }
  };

  const handleVESChange = (val: string) => {
    setAmountVES(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0 && rate > 0) {
      setAmountUSD((num / rate).toFixed(2));
    } else {
      setAmountUSD('');
    }
  };

  const quickReasons = type === 'out' ? [
    'Botellón de Agua',
    'Compra de Bolsas',
    'Pago de Delivery',
    'Hielo',
    'Insumos de Limpieza',
    'Refrigerio Personal'
  ] : [
    'Aporte para Dar Cambio',
    'Fondo Adicional',
    'Cobro Menor Pendiente'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numUSD = parseFloat(amountUSD) || 0;
    const numVES = parseFloat(amountVES) || 0;

    if (numUSD <= 0 && numVES <= 0) {
      toast({ variant: 'warning', title: 'Monto Inválido', description: 'Ingresa un importe mayor a 0.' });
      return;
    }

    if (!reason.trim()) {
      toast({ variant: 'warning', title: 'Motivo Requerido', description: 'Escribe el concepto del movimiento.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordCashMovementAction(
        tenantId,
        type,
        numUSD,
        numVES,
        reason,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: type === 'out' ? 'Gasto Registrado en Compras' : 'Ingreso Registrado',
          description: `${type === 'out' ? 'Egreso' : 'Ingreso'} de $${numUSD.toFixed(2)} USD (Bs. ${numVES.toFixed(2)}) asentado en gaveta y compras.`
        });
        onSuccess();
        onClose();
      } else {
        toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo registrar el movimiento.' });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-card border border-border rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Cabecera */}
        <div className="p-5 border-b border-border/50 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
              type === 'out' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              {type === 'out' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                {type === 'out' ? 'Gasto Menor / Salida de Efectivo' : 'Ingreso de Efectivo / Cambio'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Movimientos de caja chica en gaveta
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-full hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Selector de Tipo (Salida vs Entrada) */}
          <div className="bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl border border-border grid grid-cols-2 gap-1 font-bold">
            <button
              type="button"
              onClick={() => setType('out')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all btn-haptic ${
                type === 'out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <ArrowDownRight size={14} />
              <span>Salida (Gasto)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('in')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all btn-haptic ${
                type === 'in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-foreground'
              }`}
            >
              <ArrowUpRight size={14} />
              <span>Entrada (Aporte)</span>
            </button>
          </div>

          {/* Información sobre Compras */}
          {type === 'out' && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-500/20 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <ShoppingCart size={15} className="shrink-0 mt-0.5" />
              <span>
                <strong>Sincronizado con Compras:</strong> Esta salida se registrará automáticamente en el módulo de <strong>Compras</strong> como gasto pagado de caja chica y se restará del arqueo.
              </span>
            </div>
          )}

          {/* Montos Duales ($ y Bs) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Monto en Dólares ($) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountUSD}
                  onChange={(e) => handleUSDChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-7 pr-2 py-2 text-sm font-black text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Monto en Bolívares (Bs) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">Bs.</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amountVES}
                  onChange={(e) => handleVESChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-2 py-2 text-sm font-black text-foreground font-mono focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 text-right font-mono">
            Tasa de conversión: Bs. {rate.toFixed(2)}
          </div>

          {/* Motivo / Concepto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Motivo o Concepto *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Botellón de agua 20L para la tienda..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />

            {/* Atajos Rápidos de Motivos */}
            <div className="flex flex-wrap gap-1 pt-1">
              {quickReasons.map((qr) => (
                <button
                  key={qr}
                  type="button"
                  onClick={() => setReason(qr)}
                  className="px-2 py-0.5 rounded-lg border border-border bg-slate-50 dark:bg-slate-900 text-[10px] font-bold text-slate-500 hover:text-foreground transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border font-bold text-slate-500 text-xs hover:bg-black/5 dark:hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (!amountUSD && !amountVES) || !reason}
              className={`flex-1 py-2.5 rounded-xl font-bold text-white text-xs shadow-md btn-haptic disabled:opacity-40 flex items-center justify-center gap-1.5 ${
                type === 'out' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  <span>{type === 'out' ? 'Registrar Gasto' : 'Registrar Ingreso'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
