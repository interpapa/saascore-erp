'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, DollarSign, Calculator, FileText, CheckCircle2, AlertTriangle, ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import { CashSession, openCashSessionAction, closeCashSessionAction } from '@/app/actions/cashRegister';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  actor: any;
  currentSession: CashSession | null;
  currentRate?: number;
  onSuccess: () => void;
}

export function CashRegisterModal({
  isOpen,
  onClose,
  tenantId,
  actor,
  currentSession,
  currentRate = 849.56,
  onSuccess
}: CashRegisterModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Estado Apertura (USD y Bs)
  const [initialUSD, setInitialUSD] = useState<string>('0');
  const [initialVES, setInitialVES] = useState<string>('0');

  // Estado Cierre (Arqueo USD y Bs)
  const [countedUSD, setCountedUSD] = useState<string>('0');
  const [countedVES, setCountedVES] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setInitialUSD('0');
      setInitialVES('0');
      setCountedUSD('0');
      setCountedVES('0');
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOpening = !currentSession;
  const rate = Number(currentSession?.exchangeRate) || Number(currentRate) || 849.56;

  // Cálculos Unificados en Apertura
  const numInitUSD = parseFloat(initialUSD) || 0;
  const numInitVES = parseFloat(initialVES) || 0;
  const unifiedInitTotalUSD = numInitUSD + (rate > 0 ? numInitVES / rate : 0);
  const unifiedInitTotalVES = (numInitUSD * rate) + numInitVES;

  // Cálculos Unificados en Cierre
  const expectedTotalUSD = currentSession?.expectedTotalUSD ?? currentSession?.expectedCash ?? 0;
  const expectedTotalVES = currentSession?.expectedTotalVES ?? (expectedTotalUSD * rate);

  const numCountUSD = parseFloat(countedUSD) || 0;
  const numCountVES = parseFloat(countedVES) || 0;
  const unifiedCountedTotalUSD = numCountUSD + (rate > 0 ? numCountVES / rate : 0);
  const unifiedCountedTotalVES = (numCountUSD * rate) + numCountVES;

  const diffUSD = unifiedCountedTotalUSD - expectedTotalUSD;
  const diffVES = unifiedCountedTotalVES - expectedTotalVES;
  const isBalanced = Math.abs(diffUSD) < 0.05;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isOpening) {
        const res = await openCashSessionAction(numInitUSD, tenantId, actor, numInitVES, rate);
        if (res.success) {
          toast({ 
            variant: 'success', 
            title: 'Caja Abierta (Fondo Unificado)', 
            description: `Fondo total registrado: $${unifiedInitTotalUSD.toFixed(2)} USD (Bs. ${unifiedInitTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})` 
          });
          onSuccess();
          onClose();
        } else {
          throw new Error(res.error);
        }
      } else {
        const res = await closeCashSessionAction(currentSession.id, numCountUSD, notes, tenantId, actor, numCountVES);
        if (res.success) {
          toast({ 
            variant: 'success', 
            title: 'Caja Cerrada (Arqueo Z Unificado)', 
            description: `Total contado: $${unifiedCountedTotalUSD.toFixed(2)} USD. Arqueo completado.` 
          });
          onSuccess();
          onClose();
        } else {
          throw new Error(res.error);
        }
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message || 'Error al procesar la caja.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-card/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        {/* Encabezado */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-white/40 dark:bg-slate-900/40">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${isOpening ? 'bg-indigo-600' : 'bg-rose-600'}`}>
              <Wallet size={18} />
            </div>
            <div>
              <span>{isOpening ? 'Apertura de Turno de Caja' : 'Cierre Z / Arqueo Unificado'}</span>
              <p className="text-[11px] font-medium text-slate-400">
                Tasa Oficial BCV: <strong>Bs. {rate.toFixed(2)}</strong>
              </p>
            </div>
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors btn-haptic"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {isOpening ? (
            /* ─────────────────────────────────────────────────────────────
               APERTURA DE CAJA: FONDO UNIFICADO (USD + BS)
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-500/20 rounded-2xl text-xs text-indigo-700 dark:text-indigo-300">
                💡 Ingresa el efectivo con el que abres la gaveta (en dólares y/o bolívares). Si no tienes dinero en caja, déjalo en <strong>0.00</strong>.
              </div>

              {/* Billetes en USD */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <DollarSign size={13} className="text-emerald-500" /> Billetes en Dólares ($ USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialUSD}
                    onChange={(e) => setInitialUSD(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2.5 text-base font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    placeholder="0.00"
                  />
                </div>
                {/* Botones de atajo rápido USD */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[
                    { label: 'Sin Base ($0)', value: '0' },
                    { label: '$10', value: '10' },
                    { label: '$20', value: '20' },
                    { label: '$50', value: '50' },
                    { label: '$100', value: '100' }
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setInitialUSD(chip.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                        initialUSD === chip.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border text-slate-500 hover:text-foreground'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Billetes en Bolívares */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                  <span className="text-blue-500 font-black">Bs.</span> Billetes en Bolívares (Efectivo Bs)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">Bs.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialVES}
                    onChange={(e) => setInitialVES(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-10 pr-3 py-2.5 text-base font-black text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Resumen Unificado en Vivo */}
              <div className="p-3.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Fondo Total Unificado en Gaveta
                  </span>
                  <span className="text-xs text-slate-500">
                    Suma total a la tasa BCV del día
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400 block">
                    ${unifiedInitTotalUSD.toFixed(2)} USD
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
                    ≈ Bs. {unifiedInitTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               CIERRE Z / ARQUEO UNIFICADO (DÓLARES + BOLÍVARES = 1 GAVETA)
               ───────────────────────────────────────────────────────────── */
            <div className="space-y-4">
              {/* Resumen Unificado del Sistema */}
              <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl border border-border/50 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Turno abierto por:</span>
                  <span className="font-bold text-foreground">{currentSession?.openedBy}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Fondo Inicial Unificado:</span>
                  <span className="font-bold text-foreground font-mono">
                    ${(currentSession?.initialTotalUSD ?? currentSession?.initialAmount ?? 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Ventas Efectivo en Sesión:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +${(currentSession?.totalSalesInUSD ?? currentSession?.salesCashInSession ?? 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="h-px bg-border my-1"></div>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-black text-foreground block">Total Esperado en Gaveta:</span>
                    <span className="text-[10px] text-slate-400">Dólares y Bolívares unificados</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="block font-black text-base text-indigo-600 dark:text-indigo-400">
                      ${expectedTotalUSD.toFixed(2)} USD
                    </span>
                    <span className="block font-bold text-xs text-blue-600 dark:text-blue-400">
                      ≈ Bs. {expectedTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conteo Real Físico de Billetes */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Billetes en Dólares ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={countedUSD}
                        onChange={(e) => setCountedUSD(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-7 pr-2 py-2 text-sm font-black text-foreground font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Billetes en Bolívares (Bs)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-[10px]">Bs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={countedVES}
                        onChange={(e) => setCountedVES(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl pl-9 pr-2 py-2 text-sm font-black text-foreground font-mono"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                {/* Resultado Unificado del Conteo vs Esperado */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                  isBalanced
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                    : diffUSD > 0
                    ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-500/30 text-blue-800 dark:text-blue-300'
                    : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/30 text-rose-800 dark:text-rose-300'
                }`}>
                  <div>
                    <span className="font-bold flex items-center gap-1.5 text-sm">
                      {isBalanced ? (
                        <>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <span>¡Caja Cuadrada!</span>
                        </>
                      ) : diffUSD > 0 ? (
                        <>
                          <ArrowRightLeft size={16} className="text-blue-500" />
                          <span>Sobrante en Gaveta</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} className="text-rose-500" />
                          <span>Faltante en Gaveta</span>
                        </>
                      )}
                    </span>
                    <span className="text-[11px] opacity-80 block mt-0.5">
                      Total Contado: <strong>${unifiedCountedTotalUSD.toFixed(2)} USD</strong> (Bs. {unifiedCountedTotalVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })})
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-base font-black block">
                      {diffUSD >= 0 ? `+$${diffUSD.toFixed(2)}` : `-$${Math.abs(diffUSD).toFixed(2)}`} USD
                    </span>
                    <span className="text-[10px] font-bold block opacity-90">
                      {diffVES >= 0 ? `+Bs. ${diffVES.toFixed(2)}` : `-Bs. ${Math.abs(diffVES).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <FileText size={12} /> Observaciones / Justificación de Arqueo
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre billetes deteriorados, gastos menores de caja o diferencias..."
                  className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border font-bold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-md transition-all text-xs btn-haptic flex items-center justify-center gap-2 ${
                isOpening
                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
                  : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isOpening ? (
                'Iniciar Turno'
              ) : (
                'Confirmar Cierre Z'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
