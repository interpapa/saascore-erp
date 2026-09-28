/**
 * Rendo Kernel - Financial Ledger Engine (Partida Doble NIIF / IFRS)
 * 
 * Capa inmutable para la generación de asientos contables de partida doble.
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface JournalEntryLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface JournalEntryPayload {
  tenant_id: string;
  document_id?: string;
  entry_date?: string;
  description: string;
  lines: JournalEntryLine[];
}

export async function createKernelJournalEntry(payload: JournalEntryPayload): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const totalDebit = payload.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = payload.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

    // Validación NIIF: Partida Doble Estricta (Débitos = Créditos)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Asiento contable desbalanceado: Débitos ($${totalDebit.toFixed(2)}) !== Créditos ($${totalCredit.toFixed(2)}).`);
    }

    // Intento 1: Transacción Atómica ACID vía RPC en PostgreSQL (Evita asientos huérfanos)
    try {
      const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('insert_journal_transaction', {
        p_tenant_id: payload.tenant_id,
        p_document_id: payload.document_id || null,
        p_description: payload.description,
        p_lines: payload.lines
      });

      if (!rpcErr && rpcData && (rpcData as any).success) {
        return { success: true, entryId: (rpcData as any).entry_id };
      }
    } catch {
      // Si la función RPC no existe en la base de datos, continuar con fallback
    }

    // Intento 2 (Fallback): Inserción en 2 pasos
    const { data: header, error: headerErr } = await supabaseAdmin
      .from('journal_entries')
      .insert([{
        tenant_id: payload.tenant_id,
        document_id: payload.document_id || null,
        entry_date: payload.entry_date || new Date().toISOString(),
        description: payload.description,
        total_debit: totalDebit,
        total_credit: totalCredit,
      }])
      .select('id')
      .single();

    if (headerErr) throw headerErr;

    const linesToInsert = payload.lines.map(line => ({
      journal_entry_id: header.id,
      account_code: line.account_code,
      account_name: line.account_name,
      debit: line.debit || 0,
      credit: line.credit || 0,
      description: line.description || payload.description,
    }));

    const { error: linesErr } = await supabaseAdmin
      .from('journal_entry_lines')
      .insert(linesToInsert);

    if (linesErr) {
      // Revertir encabezado si fallan las líneas
      await supabaseAdmin.from('journal_entries').delete().eq('id', header.id);
      throw linesErr;
    }

    return { success: true, entryId: header.id };
  } catch (err: unknown) {
    console.error('[LedgerKernel Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
