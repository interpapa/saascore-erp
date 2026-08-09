'use client';

import React from 'react';
import { IncomeStatementReport } from '@/types/accounting';
import { EmptyState } from '@/components/core/EmptyState';
import { FileText, TrendingUp, TrendingDown, DollarSign, PieChart, Layers } from 'lucide-react';

interface IncomeStatementCardProps {
  report?: IncomeStatementReport;
  isLoading?: boolean;
}

export function IncomeStatementCard({ report, isLoading = false }: IncomeStatementCardProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <EmptyState
        icon={<FileText size={36} />}
        title="Sin información de resultados"
        description="No se pudo procesar el Estado de Resultados para el período seleccionado."
      />
    );
  }

  const {
    revenue,
    costOfSales,
    grossProfit,
    operatingExpenses,
    operatingProfit,
    otherIncomeExpenses,
    netProfit,
  } = report;

  const grossMarginPct = revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0;
  const netMarginPct = revenue.total > 0 ? (netProfit / revenue.total) * 100 : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary" />
            Estado de Resultados NIIF (P&L)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Resumen operacional de ingresos, costos y utilidad neta
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
            Margen Bruto: <span className="text-primary">{grossMarginPct.toFixed(1)}%</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
            Margen Neto: <span className={netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{netMarginPct.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* 1. Ingresos Operacionales */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              (+) Ingresos Operacionales
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(revenue.total)}</span>
          </div>

          {revenue.rows.length > 0 && (
            <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              {revenue.rows.map((row) => (
                <div key={row.code} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    <strong className="font-mono text-slate-500 mr-2">{row.code}</strong> {row.name}
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Costos de Ventas */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              (-) Costo de Ventas
            </span>
            <span className="font-mono text-amber-600 dark:text-amber-400">{formatCurrency(costOfSales.total)}</span>
          </div>

          {costOfSales.rows.length > 0 && (
            <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              {costOfSales.rows.map((row) => (
                <div key={row.code} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    <strong className="font-mono text-slate-500 mr-2">{row.code}</strong> {row.name}
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. Margen Bruto Card */}
        <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 flex items-center justify-between font-extrabold text-sm text-blue-900 dark:text-blue-200">
          <span>(=) MARGEN BRUTO</span>
          <span className="font-mono text-base">{formatCurrency(grossProfit)}</span>
        </div>

        {/* 4. Gastos Operativos */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
          <div className="flex items-center justify-between font-bold text-sm text-slate-900 dark:text-white">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              (-) Gastos Operativos y Administrativos
            </span>
            <span className="font-mono text-rose-600 dark:text-rose-400">{formatCurrency(operatingExpenses.total)}</span>
          </div>

          {operatingExpenses.rows.length > 0 && (
            <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
              {operatingExpenses.rows.map((row) => (
                <div key={row.code} className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>
                    <strong className="font-mono text-slate-500 mr-2">{row.code}</strong> {row.name}
                  </span>
                  <span className="font-mono font-semibold">{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Utilidad Operativa */}
        <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between font-bold text-xs text-slate-800 dark:text-slate-200">
          <span>(=) UTILIDAD OPERATIVA</span>
          <span className="font-mono text-sm">{formatCurrency(operatingProfit)}</span>
        </div>

        {/* 6. Otros Ingresos / Gastos */}
        {otherIncomeExpenses.rows.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/30 space-y-2">
            <div className="flex items-center justify-between font-bold text-xs text-slate-700 dark:text-slate-300">
              <span>(+/-) Otros Ingresos / Pérdida en Cambio (FX)</span>
              <span className="font-mono">{formatCurrency(otherIncomeExpenses.total)}</span>
            </div>
            <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1 text-xs">
              {otherIncomeExpenses.rows.map((row) => (
                <div key={row.code} className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span>
                    <strong className="font-mono mr-2">{row.code}</strong> {row.name}
                  </span>
                  <span className="font-mono">{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. Utilidad Neta Hero Banner */}
        <div
          className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all shadow-md ${
            netProfit >= 0
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-500/40'
              : 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-500/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              {netProfit >= 0 ? <TrendingUp className="w-6 h-6 text-white" /> : <TrendingDown className="w-6 h-6 text-white" />}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/80">UTILIDAD / PÉRDIDA NETA DEL EJERCICIO</p>
              <p className="text-xs text-white/70">Resultado final según normativa NIIF / IFRS</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black font-mono tracking-tight">{formatCurrency(netProfit)}</p>
            <p className="text-xs text-white/80 mt-0.5">Margen Neto: {netMarginPct.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
