'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountingKPIs } from '@/components/contabilidad/AccountingKPIs';
import { AccountingFilters, AccountingTab } from '@/components/contabilidad/AccountingFilters';
import { GeneralJournalTable } from '@/components/contabilidad/GeneralJournalTable';
import { TrialBalanceTable } from '@/components/contabilidad/TrialBalanceTable';
import { IncomeStatementCard } from '@/components/contabilidad/IncomeStatementCard';
import { CreateJournalEntryModal } from '@/components/contabilidad/CreateJournalEntryModal';
import { useToast } from '@/components/core/ToastProvider';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { getAuditLogsAction } from '@/app/actions/audit';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';
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
import { exportToCSV } from '@/lib/core/exportToCSV';
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
  
  // Audit Logs States
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

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

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

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
    router.replace(`?${params.toString()}`);
  }, [period, router]);

  const fetchAccountingData = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!currentTenant?.id) return;
      const [journalRes, trialRes, incomeRes] = await Promise.all([
        getJournalEntriesAction(currentTenant.id, period),
        getTrialBalanceAction(currentTenant.id, period),
        getIncomeStatementAction(currentTenant.id, period),
      ]);

      if (journalRes.success) setJournalEntries(journalRes.data || []);
      if (trialRes.success) {
        setTrialBalance(trialRes.data || []);
        setTrialTotals(trialRes.totals || { debit: 0, credit: 0 });
      }
      if (incomeRes.success) setIncomeStatement(incomeRes.data);
    } catch (err) {
      console.error('Error cargando contabilidad:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id, period]);

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingAudit(true);
      // Obtener logs de auditoría contable
      const res = await getAuditLogsAction(currentTenant.id, 'document', 40);
      if (res.success) {
        const accountingLogs = res.logs.filter(
          (l: any) => l.action.includes('journal_entry') || l.action.includes('invoice')
        );
        setAuditLogs(accountingLogs.length > 0 ? accountingLogs : res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría contable:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    fetchAccountingData();
  }, [fetchAccountingData]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleCreateJournalEntry = async (payload: any) => {
    if (!currentTenant?.id) return;
    try {
      setIsSubmittingEntry(true);
      const res = await createJournalEntryAction(payload, currentTenant.id, actor);
      if (res.success) {
        toast({ variant: 'success', title: 'Asiento contable registrado', description: 'El asiento diario se ha ingresado con éxito.' });
        setIsCreateModalOpen(false);
        fetchAccountingData();
      } else {
        toast({ variant: 'error', title: 'Error al registrar asiento', description: res.error });
      }
    } catch (error: any) {
      toast({ variant: 'error', title: 'Error de servidor', description: error.message });
    } finally {
      setIsSubmittingEntry(false);
    }
  };

  const handleExportCSV = () => {
    try {
      if (activeTab === 'journal') {
        exportToCSV(
          `libro_diario_${new Date().toISOString().slice(0, 10)}`,
          [
            { header: 'ID Asiento', accessor: (r: any) => r.id },
            { header: 'Fecha', accessor: (r: any) => new Date(r.date).toLocaleDateString() },
            { header: 'Número Doc', accessor: (r: any) => r.document_number || '' },
            { header: 'Referencia', accessor: (r: any) => r.reference || '' },
            { header: 'Concepto / Glosa', accessor: (r: any) => r.concept },
          ],
          journalEntries
        );
      } else if (activeTab === 'trial_balance') {
        exportToCSV(
          `balance_comprobacion_${new Date().toISOString().slice(0, 10)}`,
          [
            { header: 'Código Cuenta', accessor: (r: any) => r.account_code },
            { header: 'Nombre Cuenta', accessor: (r: any) => r.account_name },
            { header: 'Tipo', accessor: (r: any) => r.account_type },
            { header: 'Mov. Débito ($)', accessor: (r: any) => r.period_debit },
            { header: 'Mov. Crédito ($)', accessor: (r: any) => r.period_credit },
            { header: 'Saldo Débito ($)', accessor: (r: any) => r.final_debit },
            { header: 'Saldo Crédito ($)', accessor: (r: any) => r.final_credit },
          ],
          trialBalance
        );
      } else if (activeTab === 'income_statement' && incomeStatement) {
        const rows = [
          { concepto: 'Ingresos Operacionales', monto: incomeStatement.revenue.total },
          { concepto: 'Costo de Ventas', monto: incomeStatement.costOfSales.total },
          { concepto: 'Margen Bruto', monto: incomeStatement.grossProfit },
          { concepto: 'Gastos Operativos', monto: incomeStatement.operatingExpenses.total },
          { concepto: 'Utilidad Operativa', monto: incomeStatement.operatingProfit },
          { concepto: 'Otros Ingresos/Gastos', monto: incomeStatement.otherIncomeExpenses.total },
          { concepto: 'Utilidad Neta', monto: incomeStatement.netProfit },
        ];
        exportToCSV(
          `estado_resultados_${new Date().toISOString().slice(0, 10)}`,
          [
            { header: 'Concepto', accessor: (r: any) => r.concepto },
            { header: 'Monto ($)', accessor: (r: any) => r.monto },
          ],
          rows
        );
      }

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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
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
          className="btn-base btn-secondary btn-sm flex items-center gap-2"
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

      {activeTab === 'audit' && (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-h3 font-bold text-foreground font-sans">Bitácora Contable NIIF</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Historial cronológico de asientos diarios creados, facturación y operaciones de mayor.</p>
          </div>
          <AuditTrailSection logs={auditLogs} isLoading={isLoadingAudit} />
        </div>
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
