import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Document } from '@/lib/api/documents';
import Decimal from 'decimal.js';

import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

/**
 * Genera el Asiento Contable (Doble Partida) basado en un documento emitido.
 * Utiliza el Plan de Cuentas NIIF oficial de Rendo y matemáticas de precisión.
 */
export function buildInvoiceJournalLines(invoice: Document): JournalEntryLine[] {
  const meta = (invoice.metadata as any) || {};
  const paymentMethod = String(meta.payment_method || (invoice as any).payment_method || '').toLowerCase().trim();
  let payments = Array.isArray(meta.payments) ? meta.payments : null;
  if (!payments && meta.payment_breakdown && typeof meta.payment_breakdown === 'object') {
    const bd = meta.payment_breakdown as Record<string, number>;
    payments = Object.entries(bd)
      .filter(([_, amt]) => typeof amt === 'number' && amt > 0)
      .map(([method, amount]) => ({ method, amount }));
  }

  const getFundAccount = (method: string) => {
    const m = (method || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (m === 'credit' || m === 'credito') {
      return { account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)' };
    }
    if (['card', 'tarjeta', 'transfer', 'transferencia', 'pago_movil', 'pagomovil', 'zelle', 'pos', 'bank', 'punto'].includes(m)) {
      return { account_code: '1.1.01.02', account_name: 'Bancos e Instituciones Financieras' };
    }
    return { account_code: '1.1.01.01', account_name: 'Caja Principal (Efectivo)' };
  };

  const debitLines: JournalEntryLine[] = [];

  if (paymentMethod === 'mixed' && payments && payments.length > 0) {
    let allocatedTotal = new Decimal(0);
    for (const p of payments) {
      const pAmount = new Decimal(Number(p.amount || 0));
      if (pAmount.greaterThan(0)) {
        const acc = getFundAccount(p.method);
        allocatedTotal = allocatedTotal.plus(pAmount);
        debitLines.push({
          account_code: acc.account_code,
          account_name: acc.account_name,
          debit: pAmount.toNumber(),
          credit: 0
        });
      }
    }
    const diff = new Decimal(invoice.total_amount).minus(allocatedTotal);
    if (!diff.isZero()) {
      if (debitLines.length > 0) {
        debitLines[0].debit = new Decimal(debitLines[0].debit).plus(diff).toNumber();
      } else {
        const acc = getFundAccount(paymentMethod);
        debitLines.push({
          account_code: acc.account_code,
          account_name: acc.account_name,
          debit: invoice.total_amount,
          credit: 0
        });
      }
    }
  } else {
    const acc = getFundAccount(paymentMethod);
    debitLines.push({
      account_code: acc.account_code,
      account_name: acc.account_name,
      debit: invoice.total_amount,
      credit: 0
    });
  }

  const lines: JournalEntryLine[] = [
    ...debitLines,
    {
      account_code: '4.1.01',
      account_name: 'Ventas de Productos',
      debit: 0,
      credit: invoice.subtotal_amount
    }
  ];

  if (invoice.tax_amount > 0) {
    lines.push({
      account_code: '2.1.02.01',
      account_name: 'Débito Fiscal IVA por Pagar',
      debit: 0,
      credit: invoice.tax_amount
    });
  }

  // Detectar e insertar recargos adicionales (ej: IGTF, Comisiones)
  let surchargeTotal = new Decimal(0);
  if (meta.tax_details && Array.isArray(meta.tax_details.surcharges)) {
    meta.tax_details.surcharges.forEach((s: any) => {
      surchargeTotal = surchargeTotal.plus(new Decimal(s.amount || 0));
    });
  }

  if (surchargeTotal.greaterThan(0)) {
    lines.push({
      account_code: '2.1.02.02',
      account_name: 'Impuestos y Recargos Adicionales por Enterar',
      debit: 0,
      credit: surchargeTotal.toNumber()
    });
  }

  // Verificar balance exacto del asiento (Partida Doble Estricta)
  const totalDebit = lines.reduce((acc, line) => acc.plus(new Decimal(line.debit)), new Decimal(0));
  const totalCredit = lines.reduce((acc, line) => acc.plus(new Decimal(line.credit)), new Decimal(0));

  const diff = totalDebit.minus(totalCredit);
  if (!diff.isZero()) {
    if (diff.abs().lessThanOrEqualTo(0.02)) {
      // Absorber micro-descuadre de redondeo en la cuenta de ventas para garantizar partida doble exacta
      const salesLine = lines.find(l => l.account_code === '4.1.01');
      if (salesLine) {
        salesLine.credit = new Decimal(salesLine.credit).plus(diff).toNumber();
      }
    } else {
      throw new Error(`[CRÍTICO] Asiento contable descuadrado: Débito ${totalDebit.toFixed(2)} vs Crédito ${totalCredit.toFixed(2)}`);
    }
  }

  return lines;
}

export async function generateJournalEntryForInvoice(invoice: Document, tenantId: string) {
  const lines = buildInvoiceJournalLines(invoice);
  const totalDebit = lines.reduce((acc, line) => acc.plus(new Decimal(line.debit)), new Decimal(0));

  // Registro Primario en Ledger Kernel
  let kernelCreated = false;
  let kernelResult: { success: boolean; entryId?: string } | null = null;
  try {
    const res = await createKernelJournalEntry({
      tenant_id: tenantId,
      document_id: invoice.id,
      entry_date: invoice.issue_date || new Date().toISOString(),
      description: `Asiento contable por venta ${invoice.document_number}`,
      lines
    });
    if (res?.success) {
      kernelCreated = true;
      kernelResult = res;
    }
  } catch {
    // Si la tabla journal_entries aún no existe, el documento fallback asegura persistencia
  }

  // Si la inserción en journal_entries ya tuvo éxito, evitamos duplicar en documents
  if (kernelCreated && kernelResult) {
    return {
      id: kernelResult.entryId,
      tenant_id: tenantId,
      entity_id: invoice.entity_id,
      type: 'journal_entry',
      status: 'invoiced',
      document_number: `JE-INV-${invoice.document_number}`,
      subtotal_amount: totalDebit.toNumber(),
      tax_amount: 0,
      total_amount: totalDebit.toNumber(),
      lines
    };
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert([{
      tenant_id: tenantId,
      entity_id: invoice.entity_id,
      type: 'journal_entry',
      status: 'invoiced',
      document_number: `JE-INV-${invoice.document_number}`,
      subtotal_amount: totalDebit.toNumber(),
      tax_amount: 0,
      total_amount: totalDebit.toNumber(),
      metadata: {
        notes: `Asiento contable por venta ${invoice.document_number}`,
        source_document_id: invoice.id,
        journal_lines: lines,
        timestamp: new Date().toISOString()
      }
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creando asiento contable en documents:', error);
    throw new Error('Fallo al generar el asiento contable');
  }

  return data;
}

export async function generateJournalEntryForPayroll(payrollDoc: Document, tenantId: string) {
  // Gasto de Nómina NIIF:
  // Débito  -> 5.2.01 Sueldos y Salarios = Total
  // Crédito -> 1.1.01.01 Caja Principal = Total

  const lines: JournalEntryLine[] = [
    {
      account_code: '5.2.01',
      account_name: 'Sueldos y Salarios',
      debit: payrollDoc.total_amount,
      credit: 0
    },
    {
      account_code: '1.1.01.01',
      account_name: 'Caja Principal (Efectivo)',
      debit: 0,
      credit: payrollDoc.total_amount
    }
  ];

  // Registro Primario en Ledger Kernel
  let kernelPayrollCreated = false;
  let kernelPayrollResult: { success: boolean; entryId?: string } | null = null;
  try {
    const res = await createKernelJournalEntry({
      tenant_id: tenantId,
      document_id: payrollDoc.id,
      entry_date: payrollDoc.issue_date || new Date().toISOString(),
      description: `Pago de Nómina ${payrollDoc.document_number}`,
      lines
    });
    if (res?.success) {
      kernelPayrollCreated = true;
      kernelPayrollResult = res;
    }
  } catch {
    // Continúa con fallback de documents
  }

  // Si la inserción en journal_entries ya tuvo éxito, evitamos duplicar en documents
  if (kernelPayrollCreated && kernelPayrollResult) {
    return {
      id: kernelPayrollResult.entryId,
      tenant_id: tenantId,
      entity_id: payrollDoc.entity_id,
      type: 'journal_entry',
      status: 'invoiced',
      document_number: `JE-PR-${payrollDoc.document_number}`,
      subtotal_amount: payrollDoc.total_amount,
      tax_amount: 0,
      total_amount: payrollDoc.total_amount,
      lines
    };
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert([{
      tenant_id: tenantId,
      entity_id: payrollDoc.entity_id,
      type: 'journal_entry',
      status: 'invoiced',
      document_number: `JE-PR-${payrollDoc.document_number}`,
      subtotal_amount: payrollDoc.total_amount,
      tax_amount: 0,
      total_amount: payrollDoc.total_amount,
      metadata: {
        notes: `Pago de Nómina ${payrollDoc.document_number}`,
        source_document_id: payrollDoc.id,
        journal_lines: lines,
        timestamp: new Date().toISOString()
      }
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
