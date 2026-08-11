'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountingKPIs } from '@/components/contabilidad/AccountingKPIs';
import { AccountingFilters, AccountingTab } from '@/components/contabilidad/AccountingFilters';
import { GeneralJournalTable } from '@/components/contabilidad/GeneralJournalTable';
import { TrialBalanceTable } from '@/components/contabilidad/TrialBalanceTable';
import { IncomeStatementCard } from '@/components/contabilidad/IncomeStatementCard';
import { CreateJournalEntryModal, CreateJournalEntryPayload } from '@/components/contabilidad/CreateJournalEntryModal';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import {
  getJournalEntriesAction,
  getTrialBalanceAction,
  getIncomeStatementAction,
  createJournalEntryAction,
} from '@/app/actions/accounting';
import {
  JournalEntry,
  TrialBalanceRow,
  IncomeStatementReport,
  FiscalPeriodFilter,
} from '@/types/accounting';
import { RefreshCw } from 'lucide-react';

export default function ContabilidadPage() {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Primary Data States
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [trialTotals, setTrialTotals] = useState<{ debit: number; credit: number }>({ debit: 0, credit: 0 });
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatementReport | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Tabs
  const [period, setPeriod] = useState<FiscalPeriodFilter & { year?: number; month?: number }>(() => {
    if (typeof window === 'undefined') return { preset: 'all' };
    const params = new URLSearchParams(window.location.search);
    const preset = params.get('preset') || 'all';
    const yearVal = params.get('year');
    const monthVal = params.get('month');
    return {
      preset: preset as any,
      year: yearVal ? parseInt(yearVal, 10) : undefined,
      month: monthVal ? parseInt(monthVal, 10) : undefined,
    };
  });
  const [activeTab, setActiveTab] = useState<AccountingTab>('journal');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);

  // Sync period filter to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (period.preset) {
      params.set('preset', period.preset);
    } else {
      params.delete('preset');
    }
    if (period.year) {
      params.set('year', String(period.year));
    } else {
      params.delete('year');
    }
    if (period.month) {
      params.set('month', String(period.month));
    } else {
      params.delete('month');
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [period, router]);

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  // Fetch Financial Data
  const fetchAccountingData = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoading(true);
      const [journalRes, trialRes, incomeRes] = await Promise.all([
        getJournalEntriesAction(currentTenant.id, period),
        getTrialBalanceAction(currentTenant.id, period),
        getIncomeStatementAction(currentTenant.id, period),
      ]);

      if (journalRes?.success) setJournalEntries(journalRes.data || []);
      if (trialRes?.success) {
        setTrialBalance(trialRes.data || []);
        setTrialTotals(trialRes.totals || { debit: 0, credit: 0 });
      }
      if (incomeRes?.success) setIncomeStatement(incomeRes.data);
    } catch (err: any) {
      console.error('[ContabilidadPage Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, period]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoading(false);
    }, 2500);

    fetchAccountingData();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [fetchAccountingData]);

  // Handler for Create Journal Entry
  const handleCreateJournalEntry = async (payload: CreateJournalEntryPayload) => {
    if (!currentTenant) {
      toast({ variant: 'error', title: 'Sin empresa activa' });
      return;
    }

    try {
      setIsSubmittingEntry(true);
      const res = await createJournalEntryAction(payload, currentTenant.id, actor);

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Asiento Contable Creado',
          description: `Se registró exitosamente el asiento NIIF: "${payload.description}".`,
        });
        setIsCreateModalOpen(false);
        // Refresh financial ledgers
        await fetchAccountingData();
      } else {
        toast({
          variant: 'error',
          title: 'Error al crear asiento',
          description: res.error || 'No se pudo registrar el asiento contable.',
        });
      }
    } catch (err: any) {
      toast({
        variant: 'error',
        title: 'Error inesperado',
        description: err.message || 'Ocurrió un error al procesar el asiento contable.',
      });
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  // Export Action Handler
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';

      if (activeTab === 'journal') {
        csvContent += 'Asiento,Fecha,Descripcion,RefDoc,DebitoTotal,CreditoTotal,Estado\n';
        journalEntries.forEach((e) => {
          csvContent += `"${e.entry_number || e.id}","${e.entry_date}","${e.description}","${e.source_document_ref || ''}",${e.total_debit},${e.total_credit},"${e.status}"\n`;
        });
      } else if (activeTab === 'trial_balance') {
        csvContent += 'Codigo,NombreCuenta,Tipo,MovDebito,MovCredito,SaldoFinalDebito,SaldoFinalCredito\n';
        trialBalance.forEach((r) => {
          csvContent += `"${r.account_code}","${r.account_name}","${r.account_type}",${r.period_debit},${r.period_credit},${r.final_debit},${r.final_credit}\n`;
        });
      } else if (activeTab === 'income_statement' && incomeStatement) {
        csvContent += 'Concepto,MontoUSD\n';
        csvContent += `"Ingresos Operacionales",${incomeStatement.revenue.total}\n`;
        csvContent += `"Costo de Ventas",${incomeStatement.costOfSales.total}\n`;
        csvContent += `"Margen Bruto",${incomeStatement.grossProfit}\n`;
        csvContent += `"Gastos Operativos",${incomeStatement.operatingExpenses.total}\n`;
        csvContent += `"Utilidad Operativa",${incomeStatement.operatingProfit}\n`;
        csvContent += `"Otros Ingresos/Gastos",${incomeStatement.otherIncomeExpenses.total}\n`;
        csvContent += `"Utilidad Neta",${incomeStatement.netProfit}\n`;
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `contabilidad_niif_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        variant: 'success',
        title: 'Exportación completada',
        description: `Se descargó el archivo CSV de ${activeTab === 'journal' ? 'Libro Diario' : activeTab === 'trial_balance' ? 'Balance de Comprobación' : 'Estado de Resultados'}.`,
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Error de exportación',
        description: 'No se pudo generar el archivo CSV.',
      });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">
            Contabilidad NIIF / IFRS
          </h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
            Libro Mayor, Balance de Comprobación y Estado de Resultados
          </p>
        </div>

        <button
          onClick={() => fetchAccountingData()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 self-start sm:self-auto"
          title="Recargar datos contables"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Real-time KPI Summary Metrics */}
      <AccountingKPIs
        trialBalance={trialBalance}
        incomeStatement={incomeStatement}
        isLoading={isLoading}
      />

      {/* Filters & Tab Switcher */}
      <AccountingFilters
        period={period}
        onPeriodChange={setPeriod}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onExport={handleExportCSV}
        onNewEntry={() => setIsCreateModalOpen(true)}
      />

      {/* Main Tab Views */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {selectedAccount && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-semibold w-fit border border-primary/20">
              <span>Filtrado por cuenta: {selectedAccount}</span>
              <button
                onClick={() => setSelectedAccount(null)}
                className="hover:text-primary-focus ml-1 font-bold text-sm leading-none"
              >
                ×
              </button>
            </div>
          )}
          <GeneralJournalTable
            entries={selectedAccount
              ? journalEntries.filter((e) => e.lines?.some((l) => l.account_code.startsWith(selectedAccount)))
              : journalEntries
            }
            isLoading={isLoading}
            onNewEntry={() => setIsCreateModalOpen(true)}
          />
        </div>
      )}

      {activeTab === 'trial_balance' && (
        <TrialBalanceTable
          rows={trialBalance}
          totals={trialTotals}
          isLoading={isLoading}
          onSelectAccount={(code) => {
            setSelectedAccount(code);
            setActiveTab('journal');
          }}
        />
      )}

      {activeTab === 'income_statement' && (
        <IncomeStatementCard
          report={incomeStatement}
          isLoading={isLoading}
        />
      )}

      {/* Create Journal Entry Modal */}
      <CreateJournalEntryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateJournalEntry}
        isSubmitting={isSubmittingEntry}
      />
    </div>
  );
}
