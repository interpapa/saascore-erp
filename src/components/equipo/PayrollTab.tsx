/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Entity } from '@/lib/api/entities';
import { CreditCard, ArrowRight, Calendar, CheckCircle2, History, Printer, Eye, X, DollarSign, FileText, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { processPayroll, getPayrollHistoryAction } from '@/app/actions/payroll';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';

interface PayrollTabProps {
  employees: Entity[];
  tenantId: string;
}

type PayrollFrequency = 'semanal' | 'quincenal' | 'mensual';

export function PayrollTab({ employees, tenantId }: PayrollTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();

  const [frequency, setFrequency] = useState<PayrollFrequency>('quincenal');
  const [periodName, setPeriodName] = useState(() => {
    const now = new Date();
    const month = now.toLocaleString('es-ES', { month: 'long' });
    return `1ra Quincena ${month.charAt(0).toUpperCase() + month.slice(1)} ${now.getFullYear()}`;
  });
  const [paidThroughDate, setPaidThroughDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bonuses, setBonuses] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Historial de recibos
  const [historySlips, setHistorySlips] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<any | null>(null);
  const [activeSubView, setActiveSubView] = useState<'liquidar' | 'historial'>('liquidar');

  // Filtrar recursos físicos (canchas, cabinas, consultorios) para que NUNCA entren en nómina
  const payableEmployees = useMemo(() => {
    return employees.filter(
      (emp) =>
        (emp as any).is_resource !== true &&
        emp.metadata?.is_resource !== true &&
        emp.metadata?.resource_type !== 'asset' &&
        emp.metadata?.resource_type !== 'space'
    );
  }, [employees]);

  // Cargar historial de nóminas
  const loadHistory = useCallback(async () => {
    if (!tenantId || !actor) return;
    setIsLoadingHistory(true);
    try {
      const res = await getPayrollHistoryAction(tenantId, actor);
      if (res.success) {
        setHistorySlips(res.slips || []);
      }
    } catch (err) {
      console.error('Error cargando historial de nómina:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [tenantId, actor]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Cálculo proporcional del salario base según la periodicidad
  const getProportionalBase = (emp: Entity) => {
    const monthlySalary = Number(emp.metadata?.base_salary || emp.metadata?.salary || 0);
    if (frequency === 'mensual') return monthlySalary;
    if (frequency === 'semanal') return Math.round((monthlySalary / 4) * 100) / 100;
    return Math.round((monthlySalary / 2) * 100) / 100; // quincenal
  };

  const calculateNetSalary = (emp: Entity) => {
    const base = getProportionalBase(emp);
    const bonus = Number(bonuses[emp.id] || 0);
    const ded = Number(deductions[emp.id] || 0);
    return Math.max(0, Math.round((base + bonus - ded) * 100) / 100);
  };

  const calculatePayrollTotal = () => {
    return payableEmployees.reduce((sum, emp) => sum + calculateNetSalary(emp), 0);
  };

  // Procesar desembolso y generar comprobantes
  const handleProcessPayroll = async () => {
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }

    if (payableEmployees.length === 0) {
      toast({ variant: 'warning', title: 'Atención', description: 'No hay colaboradores en la nómina.' });
      return;
    }

    try {
      setIsProcessing(true);
      const res = await processPayroll(tenantId, payableEmployees, actor, {
        periodName,
        frequency,
        paidThroughDate,
        bonuses,
        deductions,
      });

      if (res.success) {
        toast({
          variant: 'success',
          title: '✅ Nómina Desembolsada Exitosamente',
          description: `Se generaron los comprobantes de pago de ${frequency} hasta el ${paidThroughDate}.`,
        });
        // Limpiar bonos y deducciones temporales
        setBonuses({});
        setDeductions({});
        loadHistory();
        setActiveSubView('historial');
      } else {
        toast({
          variant: 'error',
          title: 'Error al procesar nómina',
          description: res.error || 'No se pudo completar el desembolso.',
        });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de servidor', description: (err as Error).message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <CreditCard size={20} className="text-indigo-500" />
            Liquidación & Control de Nómina
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Cálculo proporcional por frecuencia, corte de fechas y emisión de recibos individuales
          </p>
        </div>

        {/* Sub-tabs: Liquidar vs Historial */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => setActiveSubView('liquidar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubView === 'liquidar'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <DollarSign size={14} />
            Calcular Nómina
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSubView('historial');
              loadHistory();
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubView === 'historial'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <History size={14} />
            Historial de Recibos ({historySlips.length})
          </button>
        </div>
      </div>

      {activeSubView === 'liquidar' ? (
        <>
          {/* Panel de Configuración de Período y Frecuencia */}
          <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Frecuencia de Pago
              </label>
              <select
                value={frequency}
                onChange={(e) => {
                  const newFreq = e.target.value as PayrollFrequency;
                  setFrequency(newFreq);
                  const now = new Date();
                  const month = now.toLocaleString('es-ES', { month: 'long' });
                  const mCap = month.charAt(0).toUpperCase() + month.slice(1);
                  if (newFreq === 'semanal') {
                    setPeriodName(`Semana del ${now.toLocaleDateString()}`);
                  } else if (newFreq === 'mensual') {
                    setPeriodName(`Mes Completo ${mCap} ${now.getFullYear()}`);
                  } else {
                    setPeriodName(`1ra Quincena ${mCap} ${now.getFullYear()}`);
                  }
                }}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="quincenal">Quincenal (Cada 15 días - Base / 2)</option>
                <option value="mensual">Mensual (Mes Completo - Base 100%)</option>
                <option value="semanal">Semanal (Cada Semana - Base / 4)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Nombre del Período
              </label>
              <input
                type="text"
                value={periodName}
                onChange={(e) => setPeriodName(e.target.value)}
                placeholder="Ej. 1ra Quincena Septiembre 2026"
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Fecha de Corte / Pagado Hasta
              </label>
              <input
                type="date"
                value={paidThroughDate}
                onChange={(e) => setPaidThroughDate(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Tabla de Nómina y Cálculo */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <span>Planilla de Liquidación — {periodName}</span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                    {frequency}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Corte hasta el <strong className="text-foreground">{paidThroughDate}</strong>
                </p>
              </div>

              <Button
                onClick={handleProcessPayroll}
                disabled={isProcessing || payableEmployees.length === 0}
                className="btn-haptic text-xs font-bold flex items-center gap-2 shrink-0"
              >
                {isProcessing ? 'Procesando y Guardando Recibos...' : 'Aprobar & Desembolsar Nómina'}
                <ArrowRight size={14} />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border-b border-border">
                  <tr>
                    <th className="p-4">Colaborador / Puesto</th>
                    <th className="p-4 text-right">Sueldo Mensual</th>
                    <th className="p-4 text-right">Base {frequency}</th>
                    <th className="p-4 text-right">Bonos ($)</th>
                    <th className="p-4 text-right">Deducciones ($)</th>
                    <th className="p-4 text-right">Neto a Pagar</th>
                    <th className="p-4 text-center">Último Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payableEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400">
                        <CreditCard size={32} className="mx-auto opacity-30 mb-2" />
                        <p className="font-bold text-foreground">No hay colaboradores activos para liquidar</p>
                        <p className="text-[11px]">Los espacios físicos y canchas quedan automáticamente excluidos.</p>
                      </td>
                    </tr>
                  ) : (
                    payableEmployees.map((emp) => {
                      const monthlySalary = Number(emp.metadata?.base_salary || emp.metadata?.salary || 0);
                      const basePeriod = getProportionalBase(emp);
                      const net = calculateNetSalary(emp);
                      const lastPaid = (emp.metadata?.last_payroll_date as string) || null;

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-4">
                            <span className="font-bold text-foreground block">{emp.name}</span>
                            <span className="text-[11px] text-slate-400">
                              {(emp.metadata?.role_title as string) || 'Colaborador'}
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-slate-500">
                            ${monthlySalary.toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            ${basePeriod.toFixed(2)}
                          </td>
                          <td className="p-4 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={bonuses[emp.id] === undefined || bonuses[emp.id] === 0 ? '' : bonuses[emp.id]}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setBonuses({ ...bonuses, [emp.id]: val });
                              }}
                              className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-right text-xs font-mono font-bold outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={deductions[emp.id] === undefined || deductions[emp.id] === 0 ? '' : deductions[emp.id]}
                              onChange={(e) => {
                                const val = e.target.value === '' ? 0 : Number(e.target.value);
                                setDeductions({ ...deductions, [emp.id]: val });
                              }}
                              className="w-20 bg-background border border-border rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-red-500 outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="p-4 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ${net.toFixed(2)} USD
                          </td>
                          <td className="p-4 text-center">
                            {lastPaid ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Pagado el {lastPaid}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">Sin pagos previos</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {payableEmployees.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  <ShieldCheck size={16} className="text-emerald-500" />
                  <span>Se emitirá un recibo individual por cada colaborador para su comprobación contable.</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 font-bold uppercase tracking-wider">Total a Desembolsar:</span>
                  <span className="text-lg font-black text-foreground font-mono">
                    ${calculatePayrollTotal().toFixed(2)} USD
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* VISTA: HISTORIAL DE COMPROBANTES DE PAGO */
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <h3 className="text-sm font-black text-foreground">Historial de Recibos de Nómina Emitidos</h3>
              <p className="text-xs text-slate-400">
                Comprobantes de pago con fecha de corte, colaborador y montos liquidados
              </p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="p-2 rounded-xl text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Actualizar recibos"
            >
              <RefreshCw size={16} className={isLoadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          {isLoadingHistory ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <RefreshCw size={24} className="mx-auto animate-spin opacity-50" />
              <p className="text-xs">Cargando comprobantes...</p>
            </div>
          ) : historySlips.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl text-slate-400 space-y-2">
              <FileText size={32} className="mx-auto opacity-30" />
              <p className="text-xs font-bold text-foreground">No hay comprobantes de nómina emitidos aún</p>
              <p className="text-[11px] text-slate-500">
                Cuando proceses una nómina en la pestaña anterior, aquí quedará guardada cada constancia de pago con su fecha de corte.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold border-b border-border">
                  <tr>
                    <th className="p-3">N° Recibo</th>
                    <th className="p-3">Colaborador</th>
                    <th className="p-3">Período</th>
                    <th className="p-3">Frecuencia</th>
                    <th className="p-3">Pagado Hasta</th>
                    <th className="p-3 text-right">Monto Total</th>
                    <th className="p-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historySlips.map((slip) => {
                    const meta = slip.metadata || {};
                    return (
                      <tr key={slip.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {slip.document_number || `PAY-${slip.id.slice(0, 6)}`}
                        </td>
                        <td className="p-3 font-bold text-foreground">
                          {meta.employee_name || 'Colaborador'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {meta.period_name || 'Nómina'}
                        </td>
                        <td className="p-3 capitalize text-slate-500">
                          {meta.salary_period || 'quincenal'}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                          {meta.paid_through_date || new Date(slip.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                          ${Number(slip.total_amount || 0).toFixed(2)} USD
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => setSelectedSlip(slip)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mx-auto"
                          >
                            <Eye size={13} />
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Visualizador de Recibo de Pago (Printable) */}
      {selectedSlip && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="font-black text-foreground text-sm">Comprobante Oficial de Pago</h4>
                  <p className="text-[11px] font-mono text-slate-400">
                    {selectedSlip.document_number || selectedSlip.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSlip(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stub Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                    Estado de Liquidación
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                    PAGADO & ASENTADO
                  </span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-slate-400 font-bold">Fecha de Emisión</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300">
                    {new Date(selectedSlip.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-border">
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Colaborador</span>
                  <span className="font-black text-foreground text-sm">
                    {selectedSlip.metadata?.employee_name || 'Colaborador'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 text-[10px] font-bold uppercase">Período de Nómina</span>
                  <span className="font-bold text-foreground">
                    {selectedSlip.metadata?.period_name || 'Nómina'} ({selectedSlip.metadata?.salary_period || 'quincenal'})
                  </span>
                </div>
              </div>

              <div className="pb-4 border-b border-border">
                <span className="block text-slate-400 text-[10px] font-bold uppercase mb-1">
                  Liquidado y Pagado Hasta
                </span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                  {selectedSlip.metadata?.paid_through_date || 'N/A'}
                </span>
              </div>

              {/* Desglose de Pagos */}
              <div className="space-y-2">
                <h5 className="font-bold text-foreground uppercase text-[10px] tracking-wider">
                  Desglose de Haberes
                </h5>
                <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                  <span>Sueldo Base ({selectedSlip.metadata?.salary_period || 'período'}):</span>
                  <span className="font-mono font-bold">
                    ${Number(selectedSlip.metadata?.base_salary || selectedSlip.total_amount).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between py-1 text-emerald-600 dark:text-emerald-400">
                  <span>Bonificaciones Adicionales:</span>
                  <span className="font-mono font-bold">
                    +${Number(selectedSlip.metadata?.bonuses || 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between py-1 text-red-500">
                  <span>Deducciones / Retenciones:</span>
                  <span className="font-mono font-bold">
                    -${Number(selectedSlip.metadata?.deductions || 0).toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between py-2 border-t border-border font-black text-sm text-foreground">
                  <span>Total Neto Percibido:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    ${Number(selectedSlip.total_amount || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Procesado por: {selectedSlip.metadata?.processed_by || actor?.email || 'Administrador'}</span>
                <span>ID: {selectedSlip.id.slice(0, 8)}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border bg-card flex items-center justify-end gap-2">
              <Button
                type="button"
                onClick={() => window.print()}
                className="btn-haptic text-xs font-bold flex items-center gap-1.5"
              >
                <Printer size={14} />
                Imprimir Recibo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
