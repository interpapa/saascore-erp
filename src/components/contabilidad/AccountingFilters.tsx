'use client';

import React from 'react';
import { FiscalPeriodFilter } from '@/types/accounting';
import { BookOpen, Scale, FileText, Download, Plus, Calendar, Activity } from 'lucide-react';

export type AccountingTab = 'journal' | 'trial_balance' | 'income_statement' | 'audit';

interface AccountingFiltersProps {
  period: FiscalPeriodFilter;
  onPeriodChange: (newPeriod: FiscalPeriodFilter) => void;
  activeTab: AccountingTab;
  onTabChange: (tab: AccountingTab) => void;
  onExport: () => void;
  onNewEntry: () => void;
}

export function AccountingFilters({
  period,
  onPeriodChange,
  activeTab,
  onTabChange,
  onExport,
  onNewEntry,
}: AccountingFiltersProps) {
  // Determine select value from period object
  const getSelectedPreset = (): string => {
    if (period.preset) return period.preset;
    if (period.startDate === '2026-01-01' && period.endDate === '2026-03-31') return '2026-Q1';
    if (period.startDate === '2026-04-01' && period.endDate === '2026-06-30') return '2026-Q2';
    if (period.startDate === '2026-07-01' && period.endDate === '2026-09-30') return '2026-Q3';
    if (period.startDate === '2026-10-01' && period.endDate === '2026-12-31') return '2026-Q4';
    if (period.startDate === '2026-01-01' && period.endDate === '2026-12-31') return '2026-FY';
    return 'all';
  };

  const handleSelectPreset = (value: string) => {
    switch (value) {
      case '2026-Q1':
        onPeriodChange({ startDate: '2026-01-01', endDate: '2026-03-31', preset: 'custom' });
        break;
      case '2026-Q2':
        onPeriodChange({ startDate: '2026-04-01', endDate: '2026-06-30', preset: 'custom' });
        break;
      case '2026-Q3':
        onPeriodChange({ startDate: '2026-07-01', endDate: '2026-09-30', preset: 'custom' });
        break;
      case '2026-Q4':
        onPeriodChange({ startDate: '2026-10-01', endDate: '2026-12-31', preset: 'custom' });
        break;
      case '2026-FY':
        onPeriodChange({ startDate: '2026-01-01', endDate: '2026-12-31', preset: 'custom' });
        break;
      case 'this_month':
        onPeriodChange({ preset: 'this_month' });
        break;
      case 'last_month':
        onPeriodChange({ preset: 'last_month' });
        break;
      case 'all':
      default:
        onPeriodChange({ preset: 'all' });
        break;
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start md:self-auto overflow-x-auto w-full md:w-auto">
        <button
          onClick={() => onTabChange('journal')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'journal'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Libro Diario NIIF</span>
        </button>

        <button
          onClick={() => onTabChange('trial_balance')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'trial_balance'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Balance de Comprobación</span>
        </button>

        <button
          onClick={() => onTabChange('income_statement')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'income_statement'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Estado de Resultados</span>
        </button>

        <button
          onClick={() => onTabChange('audit')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-slate-900 text-primary shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Auditoría Contable</span>
        </button>
      </div>

      {/* Controls & CTAs */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Fiscal Period Selector */}
        <div className="relative flex items-center">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <select
            value={getSelectedPreset()}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer appearance-none"
          >
            <option value="all">Período: Todos</option>
            <option value="2026-FY">Ejercicio 2026 (Anual)</option>
            <option value="2026-Q1">2026 - Q1 (Ene - Mar)</option>
            <option value="2026-Q2">2026 - Q2 (Abr - Jun)</option>
            <option value="2026-Q3">2026 - Q3 (Jul - Sep)</option>
            <option value="2026-Q4">2026 - Q4 (Oct - Dic)</option>
            <option value="this_month">Este Mes</option>
            <option value="last_month">Mes Anterior</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/60 dark:border-slate-700/60"
          title="Exportar informe actual en CSV"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span className="hidden sm:inline">Exportar</span>
        </button>

        {/* New Entry CTA */}
        <button
          onClick={onNewEntry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 transition-all btn-haptic"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Asiento</span>
        </button>
      </div>
    </div>
  );
}
