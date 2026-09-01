'use client';

import { useState, useEffect } from 'react';
import { X, Wallet, DollarSign, Calculator, FileText } from 'lucide-react';
import { useToast } from '@/components/core/ToastProvider';
import { CashSession, openCashSessionAction, closeCashSessionAction } from '@/app/actions/cashRegister';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  actor: { email: string; role: unknown };
  currentSession: CashSession | null;
  onSuccess: () => void;
}

export function CashRegisterModal({
  isOpen,
  onClose,
  tenantId,
  actor,
  currentSession,
  onSuccess
}: CashRegisterModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [initialAmount, setInitialAmount] = useState<number>(0);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInitialAmount(0);
       
      setCountedCash(0);
       
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOpening = !currentSession;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isOpening) {
        const res = await openCashSessionAction(initialAmount, tenantId, actor);
        if (res.success) {
          toast({ variant: 'success', title: 'Caja Abierta', description: 'La caja se abrió exitosamente.' });
          onSuccess();
          onClose();
        } else {
          throw new Error(res.error);
        }
      } else {
        const res = await closeCashSessionAction(currentSession.id, countedCash, notes, tenantId, actor);
        if (res.success) {
          toast({ variant: 'success', title: 'Caja Cerrada (Arqueo Z)', description: 'El arqueo de caja se completó exitosamente.' });
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

  const expectedCash = currentSession?.expectedCash || 0;
  const difference = countedCash - expectedCash;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-card/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-white/40 dark:bg-slate-900/40 rounded-t-[24px]">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${isOpening ? 'bg-indigo-500' : 'bg-rose-500'}`}>
              <Wallet size={18} />
            </div>
            {isOpening ? 'Apertura de Caja' : 'Cierre Z / Arqueo'}
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
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <DollarSign size={12} /> Fondo de Caja Inicial *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={initialAmount || ''}
                    onChange={(e) => setInitialAmount(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-3 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Ingresa el monto de efectivo inicial con el que comienza el turno.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-border/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Fondo Inicial:</span>
                  <span className="font-bold text-foreground">${currentSession?.initialAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Ventas en Efectivo:</span>
                  <span className="font-bold text-foreground">${currentSession?.salesCashInSession?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-foreground">Efectivo Esperado:</span>
                  <span className="text-xl font-black text-indigo-500">${expectedCash.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <Calculator size={12} /> Efectivo Contado (Real) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={countedCash || ''}
                    onChange={(e) => setCountedCash(Number(e.target.value))}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-3 text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                difference === 0 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                  : difference > 0 
                    ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400'
              }`}>
                <span className="text-sm font-bold">
                  {difference === 0 ? 'Caja Cuadrada' : difference > 0 ? 'Sobrante (+)' : 'Faltante (-)'}
                </span>
                <span className="text-lg font-black">
                  ${Math.abs(difference).toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <FileText size={12} /> Notas del Cierre
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
                  placeholder="Justificación de diferencias, retiros de efectivo, etc..."
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-xl text-white font-black text-sm transition-all btn-haptic disabled:opacity-50 flex justify-center items-center gap-2 ${
                isOpening ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20' : 'bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-500/20'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Wallet size={18} />
                  {isOpening ? 'Confirmar Apertura' : 'Confirmar Cierre Z'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
