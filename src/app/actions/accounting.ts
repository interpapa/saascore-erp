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
  } catch (err: any) {
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
  } catch (err: any) {
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
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

/**
 * Retrieves NIIF General Journal entries for a given tenant and period,
 * with automatic fallback synthesis from operational documents if needed.
 */
function getFormattedPaymentMethod(method?: string, bankName?: string): { code: string; label: string; bank?: string } {
  const m = String(method || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  let label = 'Efectivo ($ USD)';
  let code = 'cash_usd';

  if (m === 'binance' || m === 'binance_pay' || m === 'usdt' || m === 'crypto') {
    code = 'binance';
    label = 'Binance Pay (USDT)';
  } else if (m === 'zelle') {
    code = 'zelle';
    label = 'Zelle';
  } else if (m === 'pago_movil' || m === 'pagomovil') {
    code = 'pago_movil';
    label = 'Pago Móvil';
  } else if (m === 'card' || m === 'tarjeta' || m === 'pos' || m === 'punto') {
    code = 'card';
    label = 'Punto POS / Tarjeta';
  } else if (m === 'transfer' || m === 'transferencia' || m === 'bank') {
    code = 'transfer';
    label = 'Transferencia Bancaria';
  } else if (m === 'cash_ves') {
    code = 'cash_ves';
    label = 'Efectivo (Bs)';
  } else if (m === 'credit' || m === 'credito') {
    code = 'credit';
    label = 'Crédito (CxC)';
  } else if (m === 'mixed' || m === 'mixto') {
    code = 'mixed';
    label = 'Pago Dividido';
  } else if (m === 'cash' || m === 'cash_usd' || m === 'efectivo') {
    code = 'cash_usd';
    label = 'Efectivo ($ USD)';
  } else if (method) {
    code = m;
    label = method;
  }

  const cleanBank = bankName ? String(bankName).trim() : undefined;
  const fullLabel = cleanBank && !label.toLowerCase().includes(cleanBank.toLowerCase())
    ? `${label} · ${cleanBank}`
    : label;

  return { code, label: fullLabel, bank: cleanBank };
}

export async function getJournalEntriesAction(
  tenantId: string,
  filter: FiscalPeriodFilter | undefined | null,
  actor: ActionActor
): Promise<JournalEntriesResult> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      throw new Error(securityCheck.error || 'Acceso denegado.');
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
      const formatted: JournalEntry[] = entriesList.map((e: any) => {
        const methodInfo = getFormattedPaymentMethod(
          e.metadata?.payment_method || e.payment_method,
          e.metadata?.bank_name || e.bank_name
        );
        return {
          id: e.id,
          tenant_id: e.tenant_id,
          document_id: e.document_id,
          entry_number: e.entry_number || `AS-${e.id.slice(0, 6)}`,
          entry_date: e.entry_date,
          description: e.description || 'Asiento Contable NIIF',
          total_debit: Number(e.total_debit || 0),
          total_credit: Number(e.total_credit || 0),
          status: e.status || 'posted',
          lines: (e.lines || []).map((l: any) => ({
            id: l.id,
            journal_entry_id: l.journal_entry_id,
            account_code: l.account_code,
            account_name: l.account_name || getAccountName(l.account_code),
            debit: Number(l.debit || 0),
            credit: Number(l.credit || 0),
            description: l.description,
          })),
          created_at: e.created_at,
          products: Array.isArray(e.metadata?.products)
            ? e.metadata.products
            : (e.lines || []).map((l: any) => l.description).filter(Boolean),
          payment_method: methodInfo.code,
          bank_name: methodInfo.bank,
          payment_method_label: methodInfo.label,
        };
      });

      return { success: true, data: filterEntries(formatted, filter as any), totalCount: formatted.length };
    }

    // 2. Fallback: Synthesize NIIF Journal Entries from 'documents' table
    if (!error || isMissingTableError(error) || (entriesList && entriesList.length === 0)) {
      let docQuery = supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filter?.startDate) docQuery = docQuery.gte('created_at', filter.startDate);
      if (filter?.endDate) docQuery = docQuery.lte('created_at', filter.endDate);

      const { data: docs } = await docQuery;

      // Index all invoices by ID and document_number for fast linking
      const invoiceDocMap = new Map<string, any>();
      const invoiceNumMap = new Map<string, any>();
      (docs || []).forEach((d: any) => {
        if (d.type === 'invoice' || d.type === 'sale') {
          invoiceDocMap.set(d.id, d);
          if (d.document_number) invoiceNumMap.set(d.document_number, d);
        }
      });

      // Keep track of invoice IDs that have a corresponding journal_entry document
      const coveredInvoiceIds = new Set<string>();
      (docs || []).forEach((d: any) => {
        if (d.type === 'journal_entry') {
          const srcId = d.metadata?.source_document_id;
          if (srcId) coveredInvoiceIds.add(srcId);
          const srcRef = d.metadata?.source_document_ref;
          if (srcRef && invoiceNumMap.has(srcRef)) {
            coveredInvoiceIds.add(invoiceNumMap.get(srcRef).id);
          }
        }
      });

      const synthesized: JournalEntry[] = [];
      let entryIdx = 1;

      (docs || []).forEach((doc: any) => {
        // Ignorar cotizaciones y citas que no representan movimientos financieros reales
        if (doc.type === 'quote' || doc.type === 'appointment' || doc.type === 'work_order') return;

        // Normalización Multimoneda a Moneda Base Funcional NIIF (USD):
        const docRate = Number(doc.metadata?.exchange_rate || 0);
        const isDocInVES = doc.metadata?.currency === 'VES' || doc.currency === 'VES' || (doc.metadata?.is_in_ves === true);

        const rawSubtotal = Number(doc.subtotal_amount || doc.total_amount || 0);
        const rawTax = Number(doc.tax_amount || 0);
        const rawTotal = Number(doc.total_amount || rawSubtotal + rawTax);

        if (rawTotal === 0 && (!doc.metadata?.journal_lines || doc.metadata.journal_lines.length === 0)) return;

        const subtotal = (isDocInVES && docRate > 0) ? rawSubtotal / docRate : rawSubtotal;
        const tax = (isDocInVES && docRate > 0) ? rawTax / docRate : rawTax;
        const total = (isDocInVES && docRate > 0) ? rawTotal / docRate : rawTotal;

        const dateStr = doc.issue_date || doc.created_at || new Date().toISOString();
        const lines: JournalLine[] = [];

        let docPaymentMethod = '';
        let docBankName = '';
        let docMethodLabel = '';
        let linkedInvoice: any = null;

        if (doc.type === 'journal_entry' && Array.isArray(doc.metadata?.journal_lines) && doc.metadata.journal_lines.length > 0) {
          linkedInvoice = invoiceDocMap.get(doc.metadata?.source_document_id) || invoiceNumMap.get(doc.metadata?.source_document_ref);
          const rawMethod = doc.metadata?.payment_method || linkedInvoice?.metadata?.payment_method || '';
          const rawBank = doc.metadata?.bank_name || linkedInvoice?.metadata?.bank_name || '';
          const methodInfo = getFormattedPaymentMethod(rawMethod, rawBank);
          docPaymentMethod = methodInfo.code;
          docBankName = methodInfo.bank || '';
          docMethodLabel = methodInfo.label;

          // Asiento explícito registrado (Extorno, Arqueo, etc.)
          doc.metadata.journal_lines.forEach((jl: any) => {
            lines.push({
              account_code: jl.account_code,
              account_name: jl.account_name,
              debit: Number(jl.debit || 0),
              credit: Number(jl.credit || 0),
              description: jl.description || doc.notes || `Asiento ${doc.document_number}`,
            });
          });
        } else if (doc.type === 'invoice' || doc.type === 'sale') {
          // Si este invoice ya tiene un journal_entry formal en documents, evitar duplicación en el Libro Diario
          if (coveredInvoiceIds.has(doc.id)) return;

          const rawMethod = doc.metadata?.payment_method || '';
          const rawBank = doc.metadata?.bank_name || '';
          const methodInfo = getFormattedPaymentMethod(rawMethod, rawBank);
          docPaymentMethod = methodInfo.code;
          docBankName = methodInfo.bank || '';
          docMethodLabel = methodInfo.label;

          // Discriminar Venta a Crédito (AR) vs Venta Cobrada al Contado (Caja o Banco) o Pago Mixto
          const isCredit = methodInfo.code === 'credit';
          const isBinance = methodInfo.code === 'binance';
          const isZelle = methodInfo.code === 'zelle';
          const isBank = ['card', 'transfer', 'pago_movil'].includes(methodInfo.code);
          const payments = Array.isArray(doc.metadata?.payments) ? doc.metadata.payments : null;

          if (methodInfo.code === 'mixed' && payments && payments.length > 0) {
            for (const p of payments) {
              const pAmount = Number(p.amount || 0);
              if (pAmount <= 0) continue;
              const pMethod = String(p.method || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
              const pIsCredit = pMethod === 'credit' || pMethod === 'credito';
              const pIsBinance = ['binance', 'binance_pay', 'usdt', 'crypto'].includes(pMethod);
              const pIsZelle = pMethod === 'zelle';
              const pIsBank = ['card', 'tarjeta', 'transfer', 'transferencia', 'pago_movil', 'pagomovil', 'pos', 'bank', 'punto'].includes(pMethod);

              let accCode = '1.1.01.01';
              let accName = 'Caja Principal (Efectivo)';
              if (pIsCredit) {
                accCode = '1.1.02.01';
                accName = 'Clientes Nacionales (Crédito / CxC)';
              } else if (pIsBinance) {
                accCode = '1.1.01.04';
                accName = 'Billeteras Digitales y Cripto (Binance / USDT)';
              } else if (pIsZelle) {
                accCode = '1.1.01.03';
                accName = 'Cuenta Divisas (USD / Zelle)';
              } else if (pIsBank) {
                accCode = '1.1.01.02';
                accName = 'Banco y Cuentas Operativas';
              }

              lines.push({
                account_code: accCode,
                account_name: accName,
                debit: pAmount,
                credit: 0,
                description: `Cobro parcial en ${p.method || 'Caja'} ${doc.document_number}`,
              });
            }
          } else if (isCredit) {
            lines.push({
              account_code: '1.1.02.01',
              account_name: 'Clientes Nacionales (Crédito / CxC)',
              debit: total,
              credit: 0,
              description: `Venta a Crédito ${doc.document_number}`,
            });
          } else if (isBinance) {
            lines.push({
              account_code: '1.1.01.04',
              account_name: `Billeteras Digitales y Cripto (${docMethodLabel})`,
              debit: total,
              credit: 0,
              description: `Cobro en ${docMethodLabel} ${doc.document_number}`,
            });
          } else if (isZelle) {
            lines.push({
              account_code: '1.1.01.03',
              account_name: `Cuenta Divisas (${docMethodLabel})`,
              debit: total,
              credit: 0,
              description: `Cobro en ${docMethodLabel} ${doc.document_number}`,
            });
          } else {
            lines.push({
              account_code: isBank ? '1.1.01.02' : '1.1.01.01',
              account_name: isBank ? `Banco y Cuentas Operativas (${docMethodLabel})` : 'Caja Principal (Efectivo)',
              debit: total,
              credit: 0,
              description: `Cobro en ${docMethodLabel} ${doc.document_number}`,
            });
          }

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
          docPaymentMethod = 'purchase';
          docMethodLabel = 'Gasto / Compra Proveedor';
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
          docPaymentMethod = 'service';
          docMethodLabel = 'Servicios';
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

        const docProducts: string[] = [];
        const rawLines = doc.metadata?.cart_lines || linkedInvoice?.metadata?.cart_lines || doc.lines || doc.metadata?.items || [];
        if (Array.isArray(rawLines)) {
          rawLines.forEach((l: any) => {
            const pName = l.description || l.name || l.title || l.item_name;
            if (pName) {
              const qtyStr = l.quantity && Number(l.quantity) > 1 ? ` (${l.quantity}x)` : '';
              docProducts.push(`${pName}${qtyStr}`);
            }
          });
        }

        const sourceRef = linkedInvoice?.document_number || doc.metadata?.source_document_ref || doc.document_number;
        const entryDescription = doc.metadata?.notes || doc.notes || (
          doc.type === 'purchase' || doc.type === 'purchase_order' 
            ? `Compra / Gasto ${sourceRef}`
            : `Venta ${sourceRef} · ${docMethodLabel || 'Contado'}`
        );

        synthesized.push({
          id: doc.id,
          tenant_id: tenantId,
          document_id: doc.id,
          entry_number: `NIIF-${String(entryIdx++).padStart(4, '0')}`,
          entry_date: dateStr,
          description: entryDescription,
          total_debit: Math.round(totalDebit * 100) / 100,
          total_credit: Math.round(totalCredit * 100) / 100,
          status: doc.status === 'annulled' ? 'annulled' : 'posted',
          lines,
          created_at: doc.created_at,
          source_document_ref: sourceRef,
          products: docProducts,
          payment_method: docPaymentMethod || undefined,
          bank_name: docBankName || undefined,
          payment_method_label: docMethodLabel || undefined,
        });
      });

      return {
        success: true,
        data: filterEntries(synthesized, filter as any),
        totalCount: synthesized.length,
      };
    }

    throw new Error(error?.message || 'Error al consultar el Libro Mayor.');
  } catch (err: any) {
    console.error('[getJournalEntriesAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, data: [] };
  }
}

/**
 * Calculates Trial Balance (Balance de Comprobación NIIF) for tenant and period.
 */
export async function getTrialBalanceAction(
  tenantId: string,
  filter: FiscalPeriodFilter | undefined | null,
  actor: ActionActor
): Promise<TrialBalanceResult> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', data: [], totals: { debit: 0, credit: 0 } };
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
  } catch (err: any) {
    console.error('[getTrialBalanceAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Calculates Income Statement (Estado de Resultados NIIF) for tenant and period.
 */
export async function getIncomeStatementAction(
  tenantId: string,
  filter: FiscalPeriodFilter | undefined | null,
  actor: ActionActor
): Promise<IncomeStatementResult> {
  try {
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
  } catch (err: any) {
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
  } catch (err: any) {
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
