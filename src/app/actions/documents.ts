'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import Decimal from 'decimal.js';

export type DocumentType =
  | 'invoice'
  | 'quote'
  | 'work_order'
  | 'purchase_order'
  | 'whatsapp_log'
  | 'journal_entry'
  | 'payroll_slip';

export type DocumentStatus = 'draft' | 'in_progress' | 'invoiced' | 'annulled' | 'paid' | 'partial';

export interface DocumentLineInput {
  item_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount?: number;
}

export interface CreateDocumentActionInput {
  entity_id?: string | null;
  type: DocumentType;
  status?: DocumentStatus;
  document_number?: string | null;
  issue_date?: string;
  due_date?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  lines: DocumentLineInput[];
}

/**
 * Genera el siguiente folio fiscal o número secuencial correlativo para una empresa y tipo de documento.
 * Formato: FAC-000001, PO-000001, ORD-000001
 */
async function generateNextDocumentNumber(tenantId: string, type: DocumentType): Promise<string> {
  const prefixes: Record<string, string> = {
    invoice: 'FAC',
    quote: 'COT',
    work_order: 'ORD',
    purchase_order: 'PO',
    whatsapp_log: 'MSG',
    journal_entry: 'ASI',
    payroll_slip: 'NOM',
  };

  const prefix = prefixes[type] || 'DOC';

  try {
    const { count, error } = await supabaseAdmin
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', type);

    const nextSeq = (count || 0) + 1;
    const formattedSeq = String(nextSeq).padStart(6, '0');
    return `${prefix}-${formattedSeq}`;
  } catch (err) {
    const fallbackSeq = String(Date.now()).slice(-6);
    return `${prefix}-${fallbackSeq}`;
  }
}

export async function createDocumentAction(
  input: CreateDocumentActionInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }
    if (!tenantId) throw new Error('Empresa requerida.');

    const subtotalDecimal = input.lines.reduce(
      (acc, line) => acc.plus(new Decimal(line.unit_price).times(line.quantity)),
      new Decimal(0)
    );

    const taxDecimal = input.lines.reduce(
      (acc, line) => acc.plus(new Decimal(line.tax_amount || 0)),
      new Decimal(0)
    );

    const totalDecimal = subtotalDecimal.plus(taxDecimal);

    const finalDocNumber = input.document_number 
      ? input.document_number 
      : await generateNextDocumentNumber(tenantId, input.type);

    let insertData: any = {
      tenant_id: tenantId,
      entity_id: input.entity_id || null,
      type: input.type,
      status: input.status || 'draft',
      document_number: finalDocNumber,
      subtotal_amount: subtotalDecimal.toNumber(),
      tax_amount: taxDecimal.toNumber(),
      total_amount: totalDecimal.toNumber(),
      issue_date: input.issue_date || new Date().toISOString(),
      due_date: input.due_date || null,
      notes: input.notes || null,
      metadata: {
        ...input.metadata,
        created_by: actor.email,
      },
    };

    let { data: newDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert([insertData])
      .select()
      .single();

    if (docError && (docError.message.includes('due_date') || docError.message.includes('notes') || docError.message.includes('column'))) {
      // Fallback: If DB schema doesn't have issue_date / due_date / notes columns, save them in metadata
      delete insertData.issue_date;
      delete insertData.due_date;
      delete insertData.notes;
      insertData.metadata = {
        ...insertData.metadata,
        issue_date: input.issue_date || new Date().toISOString(),
        due_date: input.due_date || null,
        notes: input.notes || null,
      };

      const retry = await supabaseAdmin
        .from('documents')
        .insert([insertData])
        .select()
        .single();
      
      newDoc = retry.data;
      docError = retry.error;
    }

    if (docError) throw new Error('Error al crear documento: ' + docError.message);

    if (input.lines && input.lines.length > 0) {
      const linesToInsert = input.lines.map((line) => ({
        document_id: newDoc.id,
        item_id: line.item_id || null,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
        tax_amount: line.tax_amount || 0,
      }));

      const { error: linesError } = await supabaseAdmin
        .from('document_lines')
        .insert(linesToInsert);

      if (linesError) {
        await supabaseAdmin.from('documents').delete().eq('id', newDoc.id);
        throw new Error('Error al guardar líneas de documento: ' + linesError.message);
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'invoice.created',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { type: input.type, total: totalDecimal.toNumber(), doc_number: finalDocNumber },
    });

    revalidatePath('/compras');
    revalidatePath('/calendario');
    revalidatePath('/contabilidad');

    return { success: true, document: newDoc };
  } catch (err: any) {
    console.error('[createDocumentAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function getDocumentsAction(tenantId: string, type?: DocumentType, limit: number = 50) {
  try {
    if (!tenantId) return { success: true, documents: [] };

    let selectFields = `
      id, document_number, type, status, issue_date, due_date, subtotal_amount, tax_amount, total_amount, notes, metadata, created_at,
      entity:entities (id, name, type, tax_id, email, phone)
    `;

    let baseQuery = supabaseAdmin
      .from('documents')
      .select(selectFields)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (type) {
      baseQuery = baseQuery.eq('type', type);
    }

    let { data: documents, error } = await baseQuery;

    if (error && (error.message.includes('due_date') || error.message.includes('notes') || error.message.includes('column'))) {
      // Fallback: Query without due_date / issue_date / notes columns
      selectFields = `
        id, document_number, type, status, subtotal_amount, tax_amount, total_amount, metadata, created_at,
        entity:entities (id, name, type, tax_id, email, phone)
      `;
      const retryQuery = supabaseAdmin
        .from('documents')
        .select(selectFields)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(0, limit - 1);
      
      const retry = await (type ? retryQuery.eq('type', type) : retryQuery);
      
      documents = (retry.data || []).map((doc: any) => ({
        ...doc,
        issue_date: doc.metadata?.issue_date || doc.created_at,
        due_date: doc.metadata?.due_date || null,
        notes: doc.metadata?.notes || null,
      }));
      error = retry.error;
    } else if (documents) {
      // Map columns if they exist
      documents = documents.map((doc: any) => ({
        ...doc,
        issue_date: doc.issue_date || doc.metadata?.issue_date || doc.created_at,
        due_date: doc.due_date || doc.metadata?.due_date || null,
        notes: doc.notes || doc.metadata?.notes || null,
      }));
    }

    if (error) throw new Error(error.message);

    return { success: true, documents: documents || [] };
  } catch (err: any) {
    console.error('[getDocumentsAction Error]:', err.message);
    return { success: false, error: err.message, documents: [] };
  }
}

export async function updateDocumentStatusAction(
  id: string,
  status: DocumentStatus,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    const { data: updatedDoc, error } = await supabaseAdmin
      .from('documents')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar estado: ' + error.message);

    revalidatePath('/compras');
    revalidatePath('/calendario');
    revalidatePath('/contabilidad');

    return { success: true, document: updatedDoc };
  } catch (err: any) {
    console.error('[updateDocumentStatusAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}
