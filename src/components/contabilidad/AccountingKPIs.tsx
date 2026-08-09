'use client';

import React from 'react';
import { TrialBalanceRow, IncomeStatementReport } from '@/types/accounting';
import { DollarSign, Wallet, Scale, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AccountingKPIsProps {
  trialBalance?: TrialBalanceRow[];
  incomeStatement?: IncomeStatementReport;
  isLoading?: boolean;
}

export function AccountingKPIs({ trialBalance = [], incomeStatement, isLoading = false }: AccountingKPIsProps) {
  // Skeleton loader when fetching data
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="w-28 h-7 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Calculate totals from non-header accounts
  const nonHeaderRows = trialBalance.filter((r) => !r.isHeader);

  const totalActivos = nonHeaderRows
    .filter((r) => r.account_type === 'asset')
    .reduce((sum, r) => sum + (r.final_debit - r.final_credit), 0);

  const totalPasivos = nonHeaderRows
    .filter((r) => r.account_type === 'liability')
    .reduce((sum, r) => sum + (r.final_credit - r.final_debit), 0);

  const totalPatrimonio = nonHeaderRows
    .filter((r) => r.account_type === 'equity')
    .reduce((sum, r) => sum + (r.final_credit - r.final_debit), 0);

  const utilidadNeta = incomeStatement?.netProfit ?? 0;

  const periodDebitTotal = nonHeaderRows.reduce((sum, r) => sum + r.period_debit, 0);
  const periodCreditTotal = nonHeaderRows.reduce((sum, r) => sum + r.period_credit, 0);

  const isBalanced = Math.abs(periodDebitTotal - periodCreditTotal) < 0.01;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* 1. Total Activos */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:border-emerald-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Activos
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalActivos)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Caja, bancos e inventario</p>
        </div>
      </div>

      {/* 2. Total Pasivos */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:border-amber-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Pasivos
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalPasivos)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Proveedores e impuestos</p>
        </div>
      </div>

      {/* 3. Patrimonio */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:border-blue-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Patrimonio
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(totalPatrimonio)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Capital y acumulados</p>
        </div>
      </div>

      {/* 4. Utilidad Neta */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all hover:border-indigo-500/30">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Utilidad Neta
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              utilidadNeta >= 0
                ? 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                : 'bg-rose-100 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <p
            className={`text-2xl font-black tracking-tight ${
              utilidadNeta >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(utilidadNeta)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Resultado del ejercicio</p>
        </div>
      </div>

      {/* 5. Estado Libro NIIF Badge */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Cuadre NIIF
          </span>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isBalanced
                ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          {isBalanced ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Asientos Balanceados (NIIF Ok)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Desbalance Detectado</span>
            </div>
          )}
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-mono">
            Débitos = Créditos
          </p>
        </div>
      </div>
    </div>
  );
}
