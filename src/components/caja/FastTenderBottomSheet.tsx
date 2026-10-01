'use client';

import React from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Landmark, 
  CheckCircle2, 
  Coins, 
  Check, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { MobileBottomSheet } from '@/components/ui/mobile/MobileBottomSheet';

interface FastTenderBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  totalUSD: number;
  totalVES: number;
  currentRate: number;
  ticketCount: number;
  paymentMethod: string;
  setPaymentMethod: (method: any) => void;
  cashTenderedUSD: string;
  setCashTenderedUSD: (val: string) => void;
  cashTenderedVES: string;
  setCashTenderedVES: (val: string) => void;
  changeDueUSD: number;
  changeDueVES: number;
  onConfirmCheckout: () => Promise<void>;
  isSaving: boolean;
  customerName?: string;
}

export function FastTenderBottomSheet({
  isOpen,
  onClose,
  totalUSD,
  totalVES,
  currentRate,
  ticketCount,
  paymentMethod,
  setPaymentMethod,
  cashTenderedUSD,
  setCashTenderedUSD,
  cashTenderedVES,
  setCashTenderedVES,
  changeDueUSD,
  changeDueVES,
  onConfirmCheckout,
  isSaving,
  customerName = 'Cliente de Mostrador',
}: FastTenderBottomSheetProps) {
  const isCashUSD = paymentMethod === 'cash_usd';
  const isCashVES = paymentMethod === 'cash_ves';

  // Denominaciones comunes para cobro rápido en USD
  const COMMON_BILLS_USD = [
    Math.ceil(totalUSD),
    10,
    20,
    50,
    100
  ].filter((v, idx, arr) => v >= totalUSD && arr.indexOf(v) === idx);

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Cobro Rápido en Mostrador"
      subtitle={`${customerName} · ${ticketCount} ítem(s)`}
    >
      <div className="space-y-4">
        {/* 1. TOTAL DE LA VENTA */}
        <div className="p-4 rounded-2xl bg-linear-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
            Total a Cobrar
          </span>
          <div className="text-3xl font-black text-foreground font-mono">
            ${totalUSD.toFixed(2)}
          </div>
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
            ≈ Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            Tasa Oficial: Bs. {currentRate.toFixed(2)}
          </div>
        </div>

        {/* 2. SELECTOR DE FORMA DE PAGO TÁCTIL */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider block mb-2">
            Forma de Pago
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('cash_usd');
                setCashTenderedUSD(totalUSD.toString());
              }}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic ${
                paymentMethod === 'cash_usd'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <DollarSign size={16} className={paymentMethod === 'cash_usd' ? 'text-white' : 'text-emerald-500'} />
              <span>Efectivo ($ USD)</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('pago_movil')}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic ${
                paymentMethod === 'pago_movil'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Smartphone size={16} className={paymentMethod === 'pago_movil' ? 'text-white' : 'text-amber-500'} />
              <span>Pago Móvil</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic ${
                paymentMethod === 'card'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CreditCard size={16} className={paymentMethod === 'card' ? 'text-white' : 'text-blue-500'} />
              <span>Punto Débito</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('zelle')}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic ${
                paymentMethod === 'zelle'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Landmark size={16} className={paymentMethod === 'zelle' ? 'text-white' : 'text-purple-500'} />
              <span>Zelle</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPaymentMethod('cash_ves');
                setCashTenderedVES(totalVES.toFixed(2));
              }}
              className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic col-span-2 ${
                paymentMethod === 'cash_ves'
                  ? 'bg-teal-600 text-white border-teal-700 shadow-sm'
                  : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Coins size={16} className={paymentMethod === 'cash_ves' ? 'text-white' : 'text-teal-500'} />
              <span>Efectivo Bolívares (Bs.)</span>
            </button>
          </div>
        </div>

        {/* 3. CALCULADORA DE VUELTO RÁPIDA (SI ES EFECTIVO USD) */}
        {isCashUSD && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Monto Recibido ($ USD):</span>
              <button
                type="button"
                onClick={() => setCashTenderedUSD(totalUSD.toString())}
                className="text-[11px] text-emerald-600 font-black hover:underline"
              >
                Monto Exacto (${totalUSD.toFixed(2)})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={cashTenderedUSD}
                onChange={(e) => setCashTenderedUSD(e.target.value)}
                placeholder={totalUSD.toString()}
                className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-base font-black font-mono text-foreground focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Atajos de Billetes */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {COMMON_BILLS_USD.map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setCashTenderedUSD(bill.toString())}
                  className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-black font-mono shrink-0 transition-all btn-haptic"
                >
                  ${bill}
                </button>
              ))}
            </div>

            {/* Vuelto a Entregar */}
            {changeDueUSD > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  Vuelto a Entregar:
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block">
                    ${changeDueUSD.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ≈ Bs. {(changeDueUSD * currentRate).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. BOTÓN GIGANTE FINALIZAR PAGO */}
        <button
          type="button"
          onClick={onConfirmCheckout}
          disabled={isSaving}
          className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white text-sm font-black transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 btn-haptic"
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Procesando Cobro...</span>
            </div>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>CONFIRMAR Y EMITIR COMPROBANTE ➔</span>
            </>
          )}
        </button>
      </div>
    </MobileBottomSheet>
  );
}
