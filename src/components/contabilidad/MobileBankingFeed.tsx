'use client';

import React, { useState, useMemo } from 'react';
import { 
  JournalEntry, 
  TrialBalanceRow, 
  IncomeStatementReport 
} from '@/types/accounting';
import { 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Building2, 
  Smartphone, 
  Receipt, 
  ShoppingBag, 
  Coins, 
  RefreshCw, 
  X,
  ChevronRight,
  FileText,
  Package,
  Clock,
  Trash2,
  AlertCircle,
  Ban
} from 'lucide-react';
import { voidSaleAction } from '@/app/actions/cashRegister';
import { useToast } from '@/components/core/ToastProvider';

interface MobileBankingFeedProps {
  journalEntries: JournalEntry[];
  trialBalance: TrialBalanceRow[];
  incomeStatement?: IncomeStatementReport;
  isLoading: boolean;
  onRefresh: () => void;
  tenantId?: string;
  actor?: any;
}

function getEntryConcept(e: any): string {
  return e?.description || e?.concept || 'Movimiento';
}

function getEntryDate(e: any): string {
  return e?.created_at || e?.entry_date || e?.date || '';
}

function getEntryReference(e: any): string {
  return e?.source_document_ref || e?.entry_number || e?.reference || '';
}

export function MobileBankingFeed({
  journalEntries,
  trialBalance,
  incomeStatement,
  isLoading,
  onRefresh,
  tenantId,
  actor,
}: MobileBankingFeedProps) {
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isConfirmingVoid, setIsConfirmingVoid] = useState(false);
  const [voidReason, setVoidReason] = useState('Anulación solicitada desde el feed móvil');
  const [isVoiding, setIsVoiding] = useState(false);

  const handleVoidEntry = async () => {
    if (!selectedEntry) return;
    if (!tenantId || !actor) {
      toast({ variant: 'error', title: 'Error de permisos', description: 'No se pudo identificar la empresa o usuario actual.' });
      return;
    }

    const docId = selectedEntry.document_id || (selectedEntry.id.startsWith('JE-DOC-') ? selectedEntry.id.replace('JE-DOC-', '') : selectedEntry.id);

    try {
      setIsVoiding(true);
      const res = await voidSaleAction(docId, voidReason.trim() || 'Anulación desde móvil', tenantId, actor);
      if (res.success) {
        toast({
          variant: 'success',
          title: 'Movimiento Anulado',
          description: 'Se generó la contrapartida contable y se restauró el stock en inventario.',
        });
        setSelectedEntry(null);
        setIsConfirmingVoid(false);
        onRefresh();
      } else {
        toast({
          variant: 'error',
          title: 'No se pudo anular',
          description: res.error || 'Error al procesar la contrapartida.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error de servidor',
        description: err.message || 'Fallo inesperado al anular.',
      });
    } finally {
      setIsVoiding(false);
    }
  };

  // Extraer saldos de cuentas de efectivo y bancos del Balance de Comprobación
  const bankAccounts = useMemo(() => {
    // Buscar cuentas de nivel 1.1 o caja/banco
    const cashAndBankRows = trialBalance.filter((r) => 
      r.account_code.startsWith('11') || 
      r.account_code.startsWith('1.1') ||
      r.account_name.toLowerCase().includes('caja') ||
      r.account_name.toLowerCase().includes('banco')
    );

    if (cashAndBankRows.length === 0) {
      return [
        { name: 'Caja Principal', balance: 0, currency: 'USD', type: 'cash' },
        { name: 'Bancos / Cuentas', balance: 0, currency: 'USD', type: 'bank' },
      ];
    }

    return cashAndBankRows.slice(0, 5).map((r) => {
      const net = (r.final_debit || 0) - (r.final_credit || 0);
      const isBank = r.account_name.toLowerCase().includes('banco') || r.account_name.toLowerCase().includes('transfer');
      return {
        name: r.account_name,
        code: r.account_code,
        balance: net,
        type: isBank ? 'bank' : 'cash',
      };
    });
  }, [trialBalance]);

  // Total de fondos disponibles
  const totalFunds = useMemo(() => {
    return bankAccounts.reduce((sum, a) => sum + a.balance, 0);
  }, [bankAccounts]);

  // Analizar y mapear movimientos de transacciones
  const transactions = useMemo(() => {
    return journalEntries.map((entry) => {
      const lines = entry.lines || [];
      
      // Determinar si hay flujo de caja/banco
      let cashDebit = 0;
      let cashCredit = 0;
      let otherTotal = 0;

      lines.forEach((l) => {
        const isCashOrBank = l.account_code.startsWith('11') || 
                             l.account_code.startsWith('1.1') ||
                             l.account_name?.toLowerCase().includes('caja') ||
                             l.account_name?.toLowerCase().includes('banco');
        if (isCashOrBank) {
          cashDebit += Number(l.debit || 0);
          cashCredit += Number(l.credit || 0);
        } else {
          otherTotal += Number(l.debit || 0);
        }
      });

      const netCash = cashDebit - cashCredit;
      const conceptStr = getEntryConcept(entry);
      const refStr = getEntryReference(entry);
      const dateStr = getEntryDate(entry);
      const isInflow = netCash > 0 || (netCash === 0 && conceptStr.toLowerCase().includes('venta'));
      const amount = Math.abs(netCash) > 0 ? Math.abs(netCash) : otherTotal || lines.reduce((acc, l) => acc + Number(l.debit || 0), 0);

      // Determinar icono del método
      const lowerConcept = conceptStr.toLowerCase();
      const lowerRef = refStr.toLowerCase();
      let methodIcon = 'receipt';
      let methodLabel = 'Venta / Factura';

      if (lowerConcept.includes('pago móvil') || lowerConcept.includes('pagomovil') || lowerRef.includes('pago móvil')) {
        methodIcon = 'phone';
        methodLabel = 'Pago Móvil';
      } else if (lowerConcept.includes('zelle') || lowerRef.includes('zelle')) {
        methodIcon = 'zelle';
        methodLabel = 'Zelle';
      } else if (lowerConcept.includes('binance') || lowerRef.includes('binance') || lowerConcept.includes('usdt')) {
        methodIcon = 'binance';
        methodLabel = 'Binance Pay (USDT)';
      } else if (lowerConcept.includes('tarjeta') || lowerConcept.includes('punto') || lowerConcept.includes('pos')) {
        methodIcon = 'card';
        methodLabel = 'Punto de Venta';
      } else if (lowerConcept.includes('efectivo') || lowerConcept.includes('caja')) {
        methodIcon = 'cash';
        methodLabel = 'Efectivo';
      } else if (lowerConcept.includes('transferencia') || lowerConcept.includes('banco')) {
        methodIcon = 'bank';
        methodLabel = 'Transferencia';
      } else if (lowerConcept.includes('compra') || lowerConcept.includes('proveedor') || lowerConcept.includes('gasto')) {
        methodIcon = 'expense';
        methodLabel = 'Gasto / Compra';
      }

      // Formato de hora / fecha
      let timeLabel = '';
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const datePart = d.toLocaleDateString('es-VE', { 
            day: '2-digit', 
            month: 'short' 
          });
          const timePart = d.toLocaleTimeString('es-VE', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true
          });
          timeLabel = `${datePart} · ${timePart}`;
        } else {
          timeLabel = dateStr;
        }
      } catch {
        timeLabel = dateStr;
      }

      const products = (entry as any).products || [];

      return {
        ...entry,
        concept: conceptStr,
        date: dateStr,
        reference: refStr,
        isInflow,
        amount,
        methodIcon,
        methodLabel,
        timeLabel,
        products,
      };
    });
  }, [journalEntries]);

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* 1. Cabecera Móvil Limpia */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Movimientos Financieros</h2>
          <p className="text-xs text-slate-500 font-medium">Feed bancario de cobros, pagos y saldos</p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2.5 rounded-2xl bg-card border border-border text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-all btn-haptic disabled:opacity-50"
          title="Actualizar movimientos"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin text-primary' : ''} />
        </button>
      </div>

      {/* 2. Carrusel de Tarjetas de Cuentas y Saldos (Estilo App Bancaria) */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {/* Tarjeta 1: Total Disponible */}
        <div className="min-w-[200px] flex-1 p-4 rounded-3xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md border border-white/10 shrink-0">
          <div className="flex items-center justify-between text-indigo-300 mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider">Total en Fondos</span>
            <Wallet size={16} />
          </div>
          <div className="font-mono text-2xl font-black text-white leading-tight">
            ${totalFunds.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-300 font-medium mt-1 block">
            Caja + Cuentas Bancarias
          </span>
        </div>

        {/* Tarjetas Dinámicas de Bancos / Cuentas */}
        {bankAccounts.map((acc, idx) => (
          <div
            key={acc.name + idx}
            className="min-w-[170px] p-4 rounded-3xl bg-card border border-border shadow-xs shrink-0 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[110px]">
                {acc.name}
              </span>
              {acc.type === 'bank' ? (
                <Building2 size={15} className="text-blue-500" />
              ) : (
                <Coins size={15} className="text-emerald-500" />
              )}
            </div>
            <div>
              <div className="font-mono text-lg font-black text-foreground">
                ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                {acc.type === 'bank' ? 'Banco / Transf.' : 'Efectivo / Gaveta'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Feed Vertical de Movimientos Tipo App Bancaria */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Últimas Transacciones ({transactions.length})
          </span>
          <span className="text-[10px] font-bold text-slate-400">
            Toca una para ver detalle contable
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center space-y-3 bg-card rounded-3xl border border-border">
            <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Cargando feed financiero...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center bg-card rounded-3xl border border-dashed border-border space-y-2">
            <Receipt className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
            <p className="text-sm font-black text-foreground">Sin transacciones registradas</p>
            <p className="text-xs text-slate-500">Los cobros de caja y compras a proveedores aparecerán aquí en vivo.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => setSelectedEntry(tx)}
                className="bg-card border border-border rounded-2xl p-3.5 shadow-xs flex items-center justify-between gap-3 hover:border-primary/40 transition-all cursor-pointer active:scale-99"
              >
                {/* Icono del Método */}
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  tx.isInflow 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                }`}>
                  {tx.methodIcon === 'phone' && <Smartphone size={20} />}
                  {tx.methodIcon === 'card' && <CreditCard size={20} />}
                  {tx.methodIcon === 'cash' && <Coins size={20} />}
                  {tx.methodIcon === 'bank' && <Building2 size={20} />}
                  {tx.methodIcon === 'zelle' && <span className="font-black text-xs">Z</span>}
                  {tx.methodIcon === 'binance' && <Coins size={20} className="text-yellow-500" />}
                  {tx.methodIcon === 'expense' && <ShoppingBag size={20} />}
                  {tx.methodIcon === 'receipt' && <Receipt size={20} />}
                </div>

                {/* Concepto, Productos y Método */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-black text-slate-900 dark:text-white text-sm truncate ${tx.status === 'annulled' ? 'line-through opacity-60' : ''}`}>
                      {tx.concept}
                    </span>
                    {tx.status === 'annulled' && (
                      <span className="px-1.5 py-0.2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[9px] font-black uppercase border border-rose-500/20">
                        Anulado
                      </span>
                    )}
                  </div>

                  {/* Pills de Productos de la Venta/Compra */}
                  {tx.products && tx.products.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      {tx.products.slice(0, 2).map((p: string, pIdx: number) => (
                        <span
                          key={pIdx}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-border/60"
                        >
                          <Package className="w-2.5 h-2.5 text-primary shrink-0" />
                          <span className="truncate max-w-[120px]">{p}</span>
                        </span>
                      ))}
                      {tx.products.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-bold self-center">
                          +{tx.products.length - 2}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="font-bold text-slate-600 dark:text-slate-400">
                      {tx.methodLabel}
                    </span>
                    <span>•</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {tx.timeLabel}
                    </span>
                  </div>
                </div>

                {/* Monto Prominente con Alto Contraste */}
                <div className="text-right shrink-0 flex items-center gap-1">
                  <div>
                    <span className={`font-mono font-black text-base block leading-tight ${
                      tx.status === 'annulled'
                        ? 'line-through opacity-50 text-slate-400'
                        : tx.isInflow 
                        ? 'text-emerald-700 dark:text-emerald-400' 
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      {tx.isInflow ? '+' : '-'}${tx.amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">USD</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Modal / Sheet de Detalle Contable del Asiento (Al tocar cualquier tarjeta) */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-card border border-border w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-200">
            {/* Cabecera del Detalle */}
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Asiento #{selectedEntry.id.slice(0, 8)}
                </span>
                <h3 className="text-base font-black text-foreground mt-1">
                  {getEntryConcept(selectedEntry)}
                </h3>
                <p className="text-xs text-slate-500">
                  Fecha: {new Date(getEntryDate(selectedEntry)).toLocaleDateString('es-VE')} {getEntryReference(selectedEntry) ? `· Ref: ${getEntryReference(selectedEntry)}` : ''}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            {/* Productos si los tiene */}
            {(selectedEntry as any).products && (selectedEntry as any).products.length > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-1.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Package size={12} className="text-primary" /> Productos / Ítems de la Operación
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedEntry as any).products.map((p: string, pIdx: number) => (
                    <span
                      key={pIdx}
                      className="px-2.5 py-1 rounded-xl bg-card border border-border text-foreground text-xs font-bold shadow-2xs"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Partida Doble: Cuentas Involucradas */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                Partida Doble (Debe y Haber)
              </span>

              <div className="space-y-1.5">
                {(selectedEntry.lines || []).map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono text-[10px] text-slate-400 block">
                        {line.account_code}
                      </span>
                      <span className="font-bold text-foreground">
                        {line.account_name}
                      </span>
                    </div>

                    <div className="text-right font-mono font-black">
                      {Number(line.debit || 0) > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 block">
                          +${Number(line.debit).toFixed(2)} (Debe)
                        </span>
                      )}
                      {Number(line.credit || 0) > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 block">
                          -${Number(line.credit).toFixed(2)} (Haber)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones de Anulación / Contrapartida */}
            {selectedEntry.status === 'annulled' ? (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                <Ban size={16} className="shrink-0" />
                <span className="font-bold">Este movimiento ya fue anulado / extornado previamente.</span>
              </div>
            ) : (
              <div className="pt-2 border-t border-border space-y-2">
                {isConfirmingVoid ? (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>¿Confirmas la anulación de este movimiento?</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      Se generará la <b>contrapartida contable (extorno)</b>, se devolverán los productos al inventario y se revertirá el saldo de caja o deuda.
                    </p>
                    <input
                      type="text"
                      placeholder="Motivo (ej: Error en precio mayorista)..."
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 font-medium"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isVoiding}
                        onClick={handleVoidEntry}
                        className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black btn-haptic disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {isVoiding ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 size={13} />
                            <span>Sí, Anular y Extornar</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isVoiding}
                        onClick={() => setIsConfirmingVoid(false)}
                        className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-foreground rounded-xl text-xs font-bold"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingVoid(true);
                      setVoidReason('Anulación solicitada desde el feed móvil');
                    }}
                    className="w-full py-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-xs flex items-center justify-center gap-2 transition-colors btn-haptic"
                  >
                    <Trash2 size={14} />
                    <span>Anular Movimiento (Contrapartida)</span>
                  </button>
                )}
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedEntry(null);
                  setIsConfirmingVoid(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
