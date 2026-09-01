'use client';

import React, { useState } from 'react';
import { TrialBalanceRow } from '@/types/accounting';
import { EmptyState } from '@/components/core/EmptyState';
import { Scale, Search, CheckCircle2, AlertCircle } from 'lucide-react';

interface TrialBalanceTableProps {
  rows: TrialBalanceRow[];
  totals?: { debit: number; credit: number };
  isLoading?: boolean;
  onSelectAccount?: (code: string) => void;
}

export function TrialBalanceTable({
  rows = [],
  totals,
  isLoading = false,
  onSelectAccount,
}: TrialBalanceTableProps) {
  const [search, setSearch] = useState('');

  const filteredRows = rows.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      row.account_code.toLowerCase().includes(q) ||
      row.account_name.toLowerCase().includes(q)
    );
  });

  const formatCurrency = (val: number) => {
    if (val === 0) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  // Compute footer totals over non-header accounts
  const nonHeaderRows = rows.filter((r) => !r.isHeader);
  const sumPeriodDebit = totals?.debit ?? nonHeaderRows.reduce((sum, r) => sum + r.period_debit, 0);
  const sumPeriodCredit = totals?.credit ?? nonHeaderRows.reduce((sum, r) => sum + r.period_credit, 0);
  const sumFinalDebit = nonHeaderRows.reduce((sum, r) => sum + r.final_debit, 0);
  const sumFinalCredit = nonHeaderRows.reduce((sum, r) => sum + r.final_credit, 0);

  const isBalanced = Math.abs(sumPeriodDebit - sumPeriodCredit) < 0.01;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse w-full max-w-sm" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 sm:p-6 space-y-4">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código o cuenta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isBalanced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Partida Doble Cuadrada (NIIF OK)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 text-xs font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Desbalance de Comprobación
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      {filteredRows.length === 0 ? (
        <EmptyState
          icon={<Scale size={36} />}
          title={search ? 'Sin resultados' : 'Balance de Comprobación Vacío'}
          description={
            search
              ? `No se encontraron cuentas que coincidan con "${search}".`
              : 'No existen registros de movimientos en el Plan Contable para el período seleccionado.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Nombre de Cuenta NIIF</th>
                <th className="py-3 px-3 text-right">Mov. Débito</th>
                <th className="py-3 px-3 text-right">Mov. Crédito</th>
                <th className="py-3 px-3 text-right">Saldo Débito</th>
                <th className="py-3 px-3 text-right">Saldo Crédito</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredRows.map((row) => {
                const level = row.level || 1;
                const isHeader = !!row.isHeader;
                const indentPx = (level - 1) * 16;

                return (
                  <tr
                    key={row.account_code}
                    className={`transition-colors ${
                      isHeader
                        ? 'bg-slate-50/60 dark:bg-slate-800/40 font-bold text-slate-900 dark:text-white'
                        : 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/30 text-slate-700 dark:text-slate-300'
                    }`}
                    onClick={() => {
                      if (!isHeader && onSelectAccount) {
                        onSelectAccount(row.account_code);
                      }
                    }}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {row.account_code}
                    </td>
                    <td className="py-2.5 px-3">
                      <div
                        className="flex items-center gap-2"
                        style={{ paddingLeft: `${indentPx}px` }}
                      >
                        {isHeader && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0" />
                        )}
                        <span className={isHeader ? 'uppercase tracking-wide text-xs' : ''}>
                          {row.account_name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(row.period_debit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {formatCurrency(row.period_credit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(row.final_debit)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(row.final_credit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer Summary Row */}
            <tfoot>
              <tr className="border-t-2 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs">
                <td colSpan={2} className="py-3.5 px-3 uppercase tracking-wider font-extrabold text-right">
                  TOTALES DE COMPROBACIÓN NIIF:
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(sumPeriodDebit)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(sumPeriodCredit)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(sumFinalDebit)}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(sumFinalCredit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
