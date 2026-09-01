'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { calculateAgingReport } from '@/lib/core/accounting/agingEngine';
import { processFXRevaluation } from '@/lib/core/accounting/fxRevaluationEngine';
import { DEFAULT_CHART_OF_ACCOUNTS } from '@/lib/core/accounting/chartOfAccounts';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import {
  FiscalPeriodFilter,
  JournalEntry,
  JournalLine,
  JournalEntriesResult,
  TrialBalanceRow,
  TrialBalanceResult,
  IncomeStatementReport,
  IncomeStatementResult
} from '@/types/accounting';

export async function getAgingReportAction(
  tenantId: string,
  actor: KernelActor,
  type: 'customer' | 'supplier' = 'customer'
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'read');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas consultas contables. Reintenta en breve.' };
    }

    const security = await validateKernelAccess(actor, tenantId, 'contabilidad');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a reportes contables.' };
    }

    return await calculateAgingReport(tenantId, type);
  } catch (err: unknown) {
    console.error('[getAgingReportAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, data: [], summary: { total: 0, overdue: 0 } };
  }
}

export async function getChartOfAccountsAction(tenantId: string, actor: KernelActor) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'contabilidad');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado al Plan Contable.' };
    }

    return { success: true, accounts: DEFAULT_CHART_OF_ACCOUNTS };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message, accounts: [] };
  }
}

export async function runFXRevaluationAction(
  tenantId: string,
  actor: KernelActor,
  totalUSDReceivables: number,
  historicalRate: number
) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'contabilidad');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Permisos insuficientes para revaluación cambiaria.' };
    }

    return await processFXRevaluation(tenantId, totalUSDReceivables, historicalRate);
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Retrieves NIIF General Journal entries for a given tenant and period,
 * with automatic fallback synthesis from operational documents if needed.
 */
export async function getJournalEntriesAction(
  tenantId: string,
  filter?: FiscalPeriodFilter,
  actor?: ActionActor
): Promise<JournalEntriesResult> {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        throw new Error(securityCheck.error || 'Acceso denegado.');
      }
    }
    if (!tenantId) return { success: true, data: [] };

    // 1. Primary Attempt: Query 'journal_entries' joined with 'journal_entry_lines'
    let query = supabaseAdmin
      .from('journal_entries')
      .select('*, lines:journal_entry_lines(*)')
      .eq('tenant_id', tenantId)
      .order('entry_date', { ascending: false });

    if (filter?.startDate) {
      query = query.gte('entry_date', filter.startDate);
    }
    if (filter?.endDate) {
      query = query.lte('entry_date', filter.endDate);
    }

    const { data: dbEntries, error } = await query;
    const entriesList = dbEntries as unknown[] | null;

    if (!error && entriesList && entriesList.length > 0) {
      const formatted: JournalEntry[] = entriesList.map((e: unknown) => ({
        id: e.id,
        tenant_id: e.tenant_id,
        document_id: e.document_id,
        entry_number: e.entry_number || `AS-${e.id.slice(0, 6)}`,
        entry_date: e.entry_date,
        description: e.description || 'Asiento Contable NIIF',
        total_debit: Number(e.total_debit || 0),
        total_credit: Number(e.total_credit || 0),
        status: e.status || 'posted',
        lines: (e.lines || []).map((l: unknown) => ({
          id: l.id,
          journal_entry_id: l.journal_entry_id,
          account_code: l.account_code,
          account_name: l.account_name || getAccountName(l.account_code),
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description,
        })),
        created_at: e.created_at,
      }));

      return { success: true, data: filterEntries(formatted, filter), totalCount: formatted.length };
    }

    // 2. Fallback: Synthesize NIIF Journal Entries from 'documents' table
    if (!error || isMissingTableError(error) || (entriesList && entriesList.length === 0)) {
      let docQuery = supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('issue_date', { ascending: false });

      if (filter?.startDate) docQuery = docQuery.gte('issue_date', filter.startDate);
      if (filter?.endDate) docQuery = docQuery.lte('issue_date', filter.endDate);

      const { data: docs } = await docQuery;

      const synthesized: JournalEntry[] = [];
      let entryIdx = 1;

      (docs || []).forEach((doc: unknown) => {
        const subtotal = Number(doc.subtotal_amount || doc.total_amount || 0);
        const tax = Number(doc.tax_amount || 0);
        const total = Number(doc.total_amount || subtotal + tax);
        if (total === 0) return;

        const dateStr = doc.issue_date || doc.created_at || new Date().toISOString();
        const lines: JournalLine[] = [];

        if (doc.type === 'invoice' || doc.type === 'sale') {
          lines.push({
            account_code: '1.1.02.01',
            account_name: 'Clientes Nacionales (AR)',
            debit: total,
            credit: 0,
            description: `Cobro Cuentas por Cobrar ${doc.document_number}`,
          });
          lines.push({
            account_code: '4.1.01',
            account_name: 'Ventas de Productos',
            debit: 0,
            credit: subtotal,
            description: `Ingresos por Venta ${doc.document_number}`,
          });
          if (tax > 0) {
            lines.push({
              account_code: '2.1.02.01',
              account_name: 'Débito Fiscal IVA por Pagar',
              debit: 0,
              credit: tax,
              description: `IVA Débito Fiscal ${doc.document_number}`,
            });
          }
        } else if (doc.type === 'purchase' || doc.type === 'purchase_order') {
          lines.push({
            account_code: '5.1',
            account_name: 'Costo de Ventas',
            debit: subtotal,
            credit: 0,
            description: `Gasto/Compra ${doc.document_number}`,
          });
          if (tax > 0) {
            lines.push({
              account_code: '2.1.02.01',
              account_name: 'Débito Fiscal IVA por Pagar',
              debit: tax,
              credit: 0,
              description: `IVA Crédito Fiscal ${doc.document_number}`,
            });
          }
          lines.push({
            account_code: '2.1.01.01',
            account_name: 'Proveedores Nacionales (AP)',
            debit: 0,
            credit: total,
            description: `Pasivo por Pagar Proveedor ${doc.document_number}`,
          });
        } else {
          lines.push({
            account_code: '1.1.01.01',
            account_name: 'Caja Principal (Efectivo)',
            debit: total,
            credit: 0,
            description: `Ingreso Caja ${doc.document_number}`,
          });
          lines.push({
            account_code: '4.1.02',
            account_name: 'Ingresos por Servicios',
            debit: 0,
            credit: total,
            description: `Prestación de Servicios ${doc.document_number}`,
          });
        }

        const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
        const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

        synthesized.push({
          id: doc.id,
          tenant_id: tenantId,
          document_id: doc.id,
          entry_number: `NIIF-${String(entryIdx++).padStart(4, '0')}`,
          entry_date: dateStr,
          description: doc.notes || `Asiento NIIF Documento ${doc.document_number || doc.id}`,
          total_debit: Math.round(totalDebit * 100) / 100,
          total_credit: Math.round(totalCredit * 100) / 100,
          status: doc.status === 'annulled' ? 'annulled' : 'posted',
          lines,
          created_at: doc.created_at,
          source_document_ref: doc.document_number,
        });
      });

      return {
        success: true,
        data: filterEntries(synthesized, filter),
        totalCount: synthesized.length,
      };
    }

    throw new Error(error?.message || 'Error al consultar el Libro Mayor.');
  } catch (err: unknown) {
    console.error('[getJournalEntriesAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, data: [] };
  }
}

/**
 * Calculates Trial Balance (Balance de Comprobación NIIF) for tenant and period.
 */
export async function getTrialBalanceAction(
  tenantId: string,
  filter?: FiscalPeriodFilter,
  actor?: ActionActor
): Promise<TrialBalanceResult> {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return { success: false, error: securityCheck.error || 'Acceso denegado.', data: [], totals: { debit: 0, credit: 0 } };
      }
    }
    
    const journalRes = await getJournalEntriesAction(tenantId, filter, actor);
    if (!journalRes.success || !journalRes.data) {
      return { success: false, error: journalRes.error || 'Error al obtener asientos.' };
    }

    const accountTotals = new Map<string, { debit: number; credit: number }>();

    journalRes.data.forEach((entry) => {
      if (entry.status === 'annulled') return;
      entry.lines.forEach((line) => {
        const current = accountTotals.get(line.account_code) || { debit: 0, credit: 0 };
        current.debit += line.debit;
        current.credit += line.credit;
        accountTotals.set(line.account_code, current);
      });
    });

    const rows: TrialBalanceRow[] = DEFAULT_CHART_OF_ACCOUNTS.map((node) => {
      const totals = accountTotals.get(node.code) || { debit: 0, credit: 0 };
      const periodDebit = Math.round(totals.debit * 100) / 100;
      const periodCredit = Math.round(totals.credit * 100) / 100;

      let finalDebit = 0;
      let finalCredit = 0;

      if (node.type === 'asset' || node.type === 'expense') {
        const net = periodDebit - periodCredit;
        if (net >= 0) finalDebit = net;
        else finalCredit = Math.abs(net);
      } else {
        const net = periodCredit - periodDebit;
        if (net >= 0) finalCredit = net;
        else finalDebit = Math.abs(net);
      }

      return {
        account_code: node.code,
        account_name: node.name,
        account_type: node.type,
        initial_debit: 0,
        initial_credit: 0,
        period_debit: periodDebit,
        period_credit: periodCredit,
        final_debit: finalDebit,
        final_credit: finalCredit,
        isHeader: node.isHeader,
        level: node.level,
      };
    });

    const totalDebit = rows.reduce((sum, r) => sum + (r.isHeader ? 0 : r.period_debit), 0);
    const totalCredit = rows.reduce((sum, r) => sum + (r.isHeader ? 0 : r.period_credit), 0);

    return {
      success: true,
      data: rows,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
      },
    };
  } catch (err: unknown) {
    console.error('[getTrialBalanceAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Calculates Income Statement (Estado de Resultados NIIF) for tenant and period.
 */
export async function getIncomeStatementAction(
  tenantId: string,
  filter?: FiscalPeriodFilter,
  actor?: ActionActor
): Promise<IncomeStatementResult> {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return { success: false, error: securityCheck.error || 'Acceso denegado.', data: {
          period: filter || { preset: 'all' },
          revenue: { rows: [], total: 0 },
          costOfSales: { rows: [], total: 0 },
          grossProfit: 0,
          operatingExpenses: { rows: [], total: 0 },
          operatingProfit: 0,
          otherIncomeExpenses: { rows: [], total: 0 },
          netProfit: 0
        } };
      }
    }

    const trialRes = await getTrialBalanceAction(tenantId, filter, actor);
    if (!trialRes.success || !trialRes.data) {
      return { success: false, error: trialRes.error || 'Error al consultar balance.' };
    }

    const revenueRows: Array<{ code: string; name: string; amount: number }> = [];
    const costRows: Array<{ code: string; name: string; amount: number }> = [];
    const expenseRows: Array<{ code: string; name: string; amount: number }> = [];
    const otherRows: Array<{ code: string; name: string; amount: number }> = [];

    let totalRevenue = 0;
    let totalCostOfSales = 0;
    let totalOperatingExpenses = 0;
    let totalOtherIncomeExpenses = 0;

    trialRes.data.forEach((row) => {
      if (row.isHeader) return;

      if (row.account_code.startsWith('4.1')) {
        const amt = row.final_credit - row.final_debit;
        if (amt !== 0) {
          revenueRows.push({ code: row.account_code, name: row.account_name, amount: amt });
          totalRevenue += amt;
        }
      } else if (row.account_code.startsWith('4.2')) {
        const amt = row.final_credit - row.final_debit;
        if (amt !== 0) {
          otherRows.push({ code: row.account_code, name: row.account_name, amount: amt });
          totalOtherIncomeExpenses += amt;
        }
      } else if (row.account_code.startsWith('5.1')) {
        const amt = row.final_debit - row.final_credit;
        if (amt !== 0) {
          costRows.push({ code: row.account_code, name: row.account_name, amount: amt });
          totalCostOfSales += amt;
        }
      } else if (row.account_code.startsWith('5.2')) {
        const amt = row.final_debit - row.final_credit;
        if (amt !== 0) {
          expenseRows.push({ code: row.account_code, name: row.account_name, amount: amt });
          totalOperatingExpenses += amt;
        }
      }
    });

    const grossProfit = totalRevenue - totalCostOfSales;
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit + totalOtherIncomeExpenses;

    const report: IncomeStatementReport = {
      period: filter || { preset: 'all' },
      revenue: { rows: revenueRows, total: Math.round(totalRevenue * 100) / 100 },
      costOfSales: { rows: costRows, total: Math.round(totalCostOfSales * 100) / 100 },
      grossProfit: Math.round(grossProfit * 100) / 100,
      operatingExpenses: { rows: expenseRows, total: Math.round(totalOperatingExpenses * 100) / 100 },
      operatingProfit: Math.round(operatingProfit * 100) / 100,
      otherIncomeExpenses: { rows: otherRows, total: Math.round(totalOtherIncomeExpenses * 100) / 100 },
      netProfit: Math.round(netProfit * 100) / 100,
    };

    return { success: true, data: report };
  } catch (err: unknown) {
    console.error('[getIncomeStatementAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Creates a manual double-entry NIIF journal entry.
 */
export async function createJournalEntryAction(
  payload: {
    entry_date?: string;
    description: string;
    lines: Array<{
      account_code: string;
      account_name?: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  },
  tenantId: string,
  actor: KernelActor
): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas solicitudes. Reintenta en unos segundos.' };
    }

    const security = await validateKernelAccess(actor, tenantId, 'contabilidad');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado para crear asientos contables.' };
    }

    if (!payload.description || !payload.description.trim()) {
      return { success: false, error: 'La descripción del asiento contable es requerida.' };
    }

    if (!payload.lines || payload.lines.length < 2) {
      return { success: false, error: 'Un asiento contable requiere al menos 2 movimientos (débito y crédito).' };
    }

    const formattedLines = payload.lines.map((line) => ({
      account_code: line.account_code,
      account_name: line.account_name || getAccountName(line.account_code),
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      description: line.description || payload.description,
    }));

    return await createKernelJournalEntry({
      tenant_id: tenantId,
      entry_date: payload.entry_date,
      description: payload.description,
      lines: formattedLines,
    });
  } catch (err: unknown) {
    console.error('[createJournalEntryAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

// Internal helpers
function getAccountName(code: string): string {
  const match = DEFAULT_CHART_OF_ACCOUNTS.find((a) => a.code === code);
  return match?.name || `Cuenta ${code}`;
}

function filterEntries(list: JournalEntry[], filter?: FiscalPeriodFilter): JournalEntry[] {
  if (!filter) return list;
  return list.filter((e) => {
    if (filter.status && filter.status !== 'all' && e.status !== filter.status) return false;
    return true;
  });
}
