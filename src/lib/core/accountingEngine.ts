import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { Document } from '@/lib/api/documents';

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

/**
 * Genera el Asiento Contable (Doble Partida) basado en un documento emitido.
 * Actualmente se simula insertando un 'journal_entry' en la tabla de documentos con los débitos y créditos en la metadata.
 */
export async function generateJournalEntryForInvoice(invoice: Document, tenantId: string) {
  // Reglas de contabilidad (Chart of Accounts básico)
  // Venta (Invoice):
  // Débito -> Caja/Cuentas por Cobrar (Asset) = Total
  // Crédito -> Ingresos por Ventas (Revenue) = Subtotal
  // Crédito -> Impuestos por Pagar (Liability) = Tax

  const lines: JournalEntryLine[] = [
    {
      account_code: '1000',
      account_name: 'Cuentas por Cobrar / Caja',
      debit: invoice.total_amount,
      credit: 0
    },
    {
      account_code: '4000',
      account_name: 'Ingresos por Ventas',
      debit: 0,
      credit: invoice.subtotal_amount
    }
  ];

  if (invoice.tax_amount > 0) {
    lines.push({
      account_code: '2000',
      account_name: 'Impuestos por Pagar',
      debit: 0,
      credit: invoice.tax_amount
    });
  }

  // Verificar balance del asiento (Partida Doble)
  const totalDebit = lines.reduce((acc, line) => acc + line.debit, 0);
  const totalCredit = lines.reduce((acc, line) => acc + line.credit, 0);

  // Aceptamos una mínima diferencia de redondeo de 0.01
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Asiento contable descuadrado: Débito ${totalDebit} vs Crédito ${totalCredit}`);
  }

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert([{
      tenant_id: tenantId,
      entity_id: invoice.entity_id,
      type: 'journal_entry',
      status: 'invoiced', // Status 'invoiced' indica que el asiento está asentado
      document_number: `JE-INV-${invoice.document_number}`,
      subtotal_amount: totalDebit, // Usamos los montos para guardar el total del asiento
      tax_amount: 0,
      total_amount: totalDebit,
      notes: `Asiento contable por venta ${invoice.document_number}`,
      metadata: {
        source_document_id: invoice.id,
        journal_lines: lines,
        timestamp: new Date().toISOString()
      }
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creando asiento contable:', error);
    throw new Error('Fallo al generar el asiento contable');
  }

  return data;
}

export async function generateJournalEntryForPayroll(payrollDoc: Document, tenantId: string) {
  // Gasto de Nómina:
  // Débito -> Gasto de Sueldos y Salarios = Total
  // Crédito -> Caja / Bancos = Total

  const lines: JournalEntryLine[] = [
    {
      account_code: '5000',
      account_name: 'Gastos de Sueldos y Salarios',
      debit: payrollDoc.total_amount,
      credit: 0
    },
    {
      account_code: '1000',
      account_name: 'Bancos / Caja',
      debit: 0,
      credit: payrollDoc.total_amount
    }
  ];

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
      notes: `Pago de Nómina ${payrollDoc.document_number}`,
      metadata: {
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
