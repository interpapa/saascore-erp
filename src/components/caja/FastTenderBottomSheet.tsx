'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Smartphone, 
  Landmark, 
  CheckCircle2, 
  Coins, 
  Check, 
  ArrowRight,
  Sparkles,
  FileText,
  Split,
  UserCheck,
  AlertCircle,
  Search,
  Plus,
  ChevronDown,
  ChevronUp
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
  // Soporte para Crédito y Pago Dividido en Móvil
  mixedPayments?: { cash: number; card: number; transfer: number; credit: number };
  setMixedPayments?: React.Dispatch<React.SetStateAction<{ cash: number; card: number; transfer: number; credit: number }>>;
  selectedCustomer?: string;
  setSelectedCustomer?: (customerId: string) => void;
  customers?: any[];
  onOpenCustomerModal?: () => void;
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
  mixedPayments = { cash: 0, card: 0, transfer: 0, credit: 0 },
  setMixedPayments,
  selectedCustomer = 'generic_counter_customer',
  setSelectedCustomer,
  customers = [],
  onOpenCustomerModal,
}: FastTenderBottomSheetProps) {
  const isCashUSD = paymentMethod === 'cash_usd';
  const isCashVES = paymentMethod === 'cash_ves';
  const isCredit = paymentMethod === 'credit';
  const isMixed = paymentMethod === 'mixed';

  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [isPaymentSelectorOpen, setIsPaymentSelectorOpen] = useState(false);

  const paymentOptions = [
    { id: 'cash_usd', label: 'Efectivo ($ USD)', sublabel: 'Billetes en dólares físicos', icon: DollarSign, badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    { id: 'pago_movil', label: 'Pago Móvil', sublabel: 'Transferencia interbancaria Bs.', icon: Smartphone, badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
    { id: 'card', label: 'Punto Débito / Tarjeta', sublabel: 'Terminal POS bancario', icon: CreditCard, badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' },
    { id: 'zelle', label: 'Zelle', sublabel: 'Transferencia USD en línea', icon: Landmark, badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20' },
    { id: 'cash_ves', label: 'Efectivo Bs.', sublabel: 'Bolívares en efectivo', icon: Coins, badgeClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20' },
    { id: 'credit', label: 'Crédito (Deuda Total)', sublabel: 'Cuenta por Cobrar (CxC)', icon: FileText, badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' },
    { id: 'mixed', label: 'Pago Dividido / Abono', sublabel: 'Varios métodos o parte a crédito', icon: Split, badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' },
  ];

  const currentOption = paymentOptions.find((p) => p.id === paymentMethod) || paymentOptions[0];
  const CurrentIcon = currentOption.icon;

  // Auto-prellenar monto exacto de cobro al abrir o cambiar de método si está vacío
  React.useEffect(() => {
    if (isOpen) {
      if (paymentMethod === 'cash_usd') {
        if (!cashTenderedUSD || Number(cashTenderedUSD) === 0) {
          setCashTenderedUSD(totalUSD > 0 ? totalUSD.toFixed(2) : '');
        }
      } else if (paymentMethod === 'cash_ves') {
        if (!cashTenderedVES || Number(cashTenderedVES) === 0) {
          setCashTenderedVES(totalVES > 0 ? totalVES.toFixed(2) : '');
        }
      }
    }
  }, [isOpen, paymentMethod, totalUSD, totalVES]);

  // Denominaciones comunes para cobro rápido en USD
  const COMMON_BILLS_USD = [
    Math.ceil(totalUSD),
    10,
    20,
    50,
    100
  ].filter((v, idx, arr) => v >= totalUSD && arr.indexOf(v) === idx);

  // Filtrado de clientes para asignación rápida de crédito
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[^a-z0-9]/gi, '');
    return customers.filter((c) => {
      const nameMatch = c.name?.toLowerCase().includes(q);
      const taxMatch = c.tax_id?.toLowerCase().includes(q) || (c.tax_id && c.tax_id.replace(/[^a-z0-9]/gi, '').includes(cleanQ));
      const phoneMatch = c.phone?.includes(q);
      const metaCedula = c.metadata?.cedula ? String(c.metadata.cedula).toLowerCase() : '';
      const metaDni = c.metadata?.dni ? String(c.metadata.dni).toLowerCase() : '';
      return nameMatch || taxMatch || phoneMatch || metaCedula.includes(q) || metaDni.includes(q);
    }).slice(0, 10);
  }, [customers, customerSearchQuery]);

  const isGenericCustomer = selectedCustomer === 'generic_counter_customer';

  // Cálculos para pago mixto
  const mixedAssigned = (mixedPayments.cash || 0) + (mixedPayments.card || 0) + (mixedPayments.transfer || 0) + (mixedPayments.credit || 0);
  const mixedRemaining = Math.round((totalUSD - mixedAssigned) * 100) / 100;
  const isMixedValid = Math.abs(mixedRemaining) < 0.02;

  // Atajo: 50% Efectivo y 50% Deuda
  const handleSplitFiftyFifty = () => {
    if (!setMixedPayments) return;
    const half = Math.round((totalUSD / 2) * 100) / 100;
    const rest = Math.round((totalUSD - half) * 100) / 100;
    setMixedPayments({
      cash: half,
      card: 0,
      transfer: 0,
      credit: rest,
    });
  };

  // Atajo: Cargar Restante a Deuda
  const handleAssignRestToCredit = () => {
    if (!setMixedPayments) return;
    const paidWithoutCredit = (mixedPayments.cash || 0) + (mixedPayments.card || 0) + (mixedPayments.transfer || 0);
    const rest = Math.max(0, Math.round((totalUSD - paidWithoutCredit) * 100) / 100);
    setMixedPayments({
      ...mixedPayments,
      credit: rest,
    });
  };

  const isDebtTransaction = isCredit || (isMixed && (mixedPayments.credit || 0) > 0);

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

        {/* 2. SELECTOR DE FORMA DE PAGO DESPLEGABLE (0 RUIDO VISUAL) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              Forma de Pago
            </label>
            <button
              type="button"
              onClick={() => setIsPaymentSelectorOpen(!isPaymentSelectorOpen)}
              className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>{isPaymentSelectorOpen ? 'Ocultar opciones' : 'Cambiar método'}</span>
              {isPaymentSelectorOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          </div>

          {/* Barra Desplegable Táctil */}
          <button
            type="button"
            onClick={() => setIsPaymentSelectorOpen(!isPaymentSelectorOpen)}
            className="w-full p-3 rounded-2xl border-2 border-primary/40 bg-card hover:bg-slate-50 dark:hover:bg-slate-900 text-foreground flex items-center justify-between shadow-xs transition-all btn-haptic"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-xs ${currentOption.badgeClass}`}>
                <CurrentIcon size={18} />
              </div>
              <div className="text-left">
                <span className="font-black text-sm text-slate-900 dark:text-white block leading-tight">
                  {currentOption.label}
                </span>
                <span className="text-[10px] text-slate-500 font-bold block">
                  {currentOption.sublabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="text-xs font-bold text-primary">{isPaymentSelectorOpen ? 'Cerrar' : 'Elegir'}</span>
              <ChevronDown size={16} className={`transition-transform duration-200 text-primary ${isPaymentSelectorOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Opciones desplegadas al tocar la barra */}
          {isPaymentSelectorOpen && (
            <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in zoom-in-95 duration-150">
              {paymentOptions.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                const OptIcon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      setIsPaymentSelectorOpen(false);
                      if (opt.id === 'cash_usd') {
                        setCashTenderedUSD(totalUSD.toFixed(2));
                      } else if (opt.id === 'cash_ves') {
                        setCashTenderedVES(totalVES.toFixed(2));
                      } else if (opt.id === 'mixed') {
                        if (setMixedPayments && (!mixedPayments.cash && !mixedPayments.card && !mixedPayments.transfer && !mixedPayments.credit)) {
                          const half = Math.round((totalUSD / 2) * 100) / 100;
                          setMixedPayments({ cash: half, card: 0, transfer: 0, credit: Math.round((totalUSD - half) * 100) / 100 });
                        }
                      }
                    }}
                    className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all btn-haptic text-left ${
                      opt.id === 'mixed' ? 'col-span-2' : ''
                    } ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-card text-foreground border-border hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <OptIcon size={16} className={isSelected ? 'text-primary-foreground' : 'text-slate-500'} />
                    <div className="truncate">
                      <span className="block truncate">{opt.label}</span>
                      <span className={`text-[10px] block truncate font-normal ${isSelected ? 'opacity-90' : 'text-slate-400'}`}>
                        {opt.sublabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2B. GESTIÓN DE CLIENTE SI HAY CRÉDITO O DEUDA */}
        {isDebtTransaction && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <UserCheck size={14} className="text-amber-600" />
                Cliente deudor (CxC):
              </span>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(!showCustomerPicker)}
                className="text-[11px] font-black text-amber-700 dark:text-amber-400 hover:underline"
              >
                {showCustomerPicker ? 'Ocultar' : 'Cambiar / Asignar'}
              </button>
            </div>

            {isGenericCustomer ? (
              <div className="flex items-start gap-2 p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <span className="font-bold block">Cliente registrado requerido</span>
                  <p className="text-[10px] text-rose-600/90 dark:text-rose-300/90 mt-0.5">
                    No puedes otorgar crédito a "Cliente General". Selecciona un cliente con nombre o cédula.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-background border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="font-black text-foreground block">{customerName}</span>
                  <span className="text-[10px] text-slate-400">La deuda se sumará al saldo acumulado de este cliente.</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">
                  Vinculado
                </span>
              </div>
            )}

            {/* Selector Rápido de Clientes por Cédula o Nombre */}
            {(showCustomerPicker || isGenericCustomer) && setSelectedCustomer && (
              <div className="pt-2 border-t border-amber-500/20 space-y-2">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por cédula, DNI o nombre..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(c.id);
                        setShowCustomerPicker(false);
                      }}
                      className={`w-full p-2 rounded-lg border text-left text-xs transition-colors flex items-center justify-between ${
                        selectedCustomer === c.id
                          ? 'border-amber-500 bg-amber-500/10 font-bold'
                          : 'border-border bg-card hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span className="block truncate">{c.name}</span>
                        {c.tax_id && (
                          <span className="text-[10px] text-slate-400 font-mono">{c.tax_id}</span>
                        )}
                      </div>
                      {selectedCustomer === c.id && <Check size={14} className="text-amber-600 shrink-0" />}
                    </button>
                  ))}
                </div>

                {onOpenCustomerModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCustomerModal();
                      onClose();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg border border-dashed border-amber-500/50 text-amber-700 dark:text-amber-300 text-xs font-bold hover:bg-amber-500/10 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Crear Nuevo Cliente Rápido</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. CALCULADORA DE VUELTO RÁPIDA (SI ES EFECTIVO USD) */}
        {isCashUSD && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-border space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Monto Recibido ($ USD):</span>
              <button
                type="button"
                onClick={() => setCashTenderedUSD(totalUSD.toFixed(2))}
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
                placeholder={totalUSD.toFixed(2)}
                className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-base font-black font-mono text-foreground focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Atajos de Billetes */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
              {COMMON_BILLS_USD.map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setCashTenderedUSD(bill.toFixed(2))}
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

        {/* 3B. CALCULADORA DE VUELTO RÁPIDA (SI ES EFECTIVO BS) */}
        {isCashVES && (
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-500/20 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">Monto Recibido (Bs.):</span>
              <button
                type="button"
                onClick={() => setCashTenderedVES(totalVES.toFixed(2))}
                className="text-[11px] text-teal-600 dark:text-teal-400 font-black hover:underline"
              >
                Monto Exacto (Bs. {totalVES.toFixed(2)})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={cashTenderedVES}
                onChange={(e) => setCashTenderedVES(e.target.value)}
                placeholder={totalVES.toFixed(2)}
                className="flex-1 bg-background border border-input rounded-xl px-3 py-2 text-base font-black font-mono text-foreground focus:ring-2 focus:ring-teal-500/30"
              />
            </div>

            {/* Vuelto a Entregar en Bs */}
            {changeDueVES > 0 && (
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  Vuelto a Entregar:
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-teal-600 dark:text-teal-400 font-mono block">
                    Bs. {changeDueVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  {currentRate > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono">
                      ≈ ${(changeDueVES / currentRate).toFixed(2)} USD
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3C. PANEL DE PAGO DIVIDIDO / MIXTO CON CRÉDITO (ABONO PARCIAL + DEUDA) */}
        {isMixed && setMixedPayments && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-indigo-500/20 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-foreground">Desglose de Pago / Abono</span>
              <span className={`text-xs font-black font-mono ${isMixedValid ? 'text-emerald-600' : 'text-rose-500'}`}>
                {isMixedValid ? '✓ Cuadrado Exacto' : `Falta: $${mixedRemaining.toFixed(2)}`}
              </span>
            </div>

            {/* Atajos Rápidos Táctiles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSplitFiftyFifty}
                className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-500/30 text-[11px] font-black text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors"
              >
                ⚡ 50% Efectivo / 50% Deuda
              </button>
              {mixedRemaining > 0.01 && (
                <button
                  type="button"
                  onClick={handleAssignRestToCredit}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-[11px] font-black text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  ⚡ Restante a Deuda (${mixedRemaining.toFixed(2)})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">💵 Efectivo ($ USD)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mixedPayments.cash === 0 ? '' : mixedPayments.cash}
                  onChange={(e) => setMixedPayments({ ...mixedPayments, cash: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-foreground"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">💳 Punto / Tarjeta ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mixedPayments.card === 0 ? '' : mixedPayments.card}
                  onChange={(e) => setMixedPayments({ ...mixedPayments, card: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-foreground"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-500 font-bold block mb-1">📱 Pago Móvil / Transf. ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mixedPayments.transfer === 0 ? '' : mixedPayments.transfer}
                  onChange={(e) => setMixedPayments({ ...mixedPayments, transfer: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-foreground"
                />
              </div>

              <div>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 font-black block mb-1">📑 Crédito / Deuda CxC ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={mixedPayments.credit === 0 ? '' : mixedPayments.credit}
                  onChange={(e) => setMixedPayments({ ...mixedPayments, credit: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full bg-background border border-rose-500/40 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
                />
              </div>
            </div>

            {/* Resumen del Pago Dividido */}
            <div className="p-2.5 rounded-xl bg-background border border-border flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Cobrado Hoy:</span>
                <span className="font-bold text-foreground">
                  ${((mixedPayments.cash || 0) + (mixedPayments.card || 0) + (mixedPayments.transfer || 0)).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-rose-500 block font-sans">Queda en Deuda:</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  ${(mixedPayments.credit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 4. BOTÓN GIGANTE FINALIZAR PAGO */}
        <button
          type="button"
          onClick={onConfirmCheckout}
          disabled={isSaving || (isDebtTransaction && isGenericCustomer) || (isMixed && !isMixedValid)}
          className={`w-full py-4 px-4 rounded-2xl text-white text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2 btn-haptic ${
            isDebtTransaction && isGenericCustomer
              ? 'bg-slate-400 cursor-not-allowed opacity-60'
              : isMixed && !isMixedValid
              ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
              : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 shadow-emerald-600/30'
          }`}
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Procesando Cobro...</span>
            </div>
          ) : isDebtTransaction && isGenericCustomer ? (
            <span>Selecciona un cliente para dar crédito</span>
          ) : isMixed && !isMixedValid ? (
            <span>Completa el desglose (Falta ${mixedRemaining.toFixed(2)})</span>
          ) : (
            <>
              <CheckCircle2 size={18} />
              <span>
                {isCredit 
                  ? 'CONFIRMAR Y CARGAR A CRÉDITO ➔'
                  : isMixed && (mixedPayments.credit || 0) > 0
                  ? 'CONFIRMAR PAGO PARCIAL Y DEUDA ➔'
                  : 'CONFIRMAR Y EMITIR COMPROBANTE ➔'}
              </span>
            </>
          )}
        </button>
      </div>
    </MobileBottomSheet>
  );
}
