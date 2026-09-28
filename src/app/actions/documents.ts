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
  metadata?: Record<string, unknown>;
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
    // 1. Buscar el último documento emitido de este tipo para obtener su correlativo numérico real
    const { data: lastDoc } = await supabaseAdmin
      .from('documents')
      .select('document_number')
      .eq('tenant_id', tenantId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let nextSeq = 1;
    if (lastDoc?.document_number) {
      const match = lastDoc.document_number.match(/(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    } else {
      const { count } = await supabaseAdmin
        .from('documents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', type);
      nextSeq = (count || 0) + 1;
    }

    const formattedSeq = String(nextSeq).padStart(6, '0');
    return `${prefix}-${formattedSeq}`;
  } catch (_err) {
    const fallbackSeq = `${String(Date.now()).slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
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

    const insertData: any = {
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
        lines: input.lines || [],
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
        lines: input.lines || [],
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
        // Fallback resiliente: Si document_lines no está disponible, las líneas ya viven en metadata.lines
        console.warn('Nota: Tabla document_lines no disponible; líneas preservadas en documents.metadata.lines');
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
    console.error('[createDocumentAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function getDocumentsAction(tenantId: string, type: DocumentType | undefined, limit: number = 50, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', documents: [] };
    }

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
        lines: doc.metadata?.lines || doc.metadata?.cart_lines || [],
      }));
      error = retry.error;
    } else if (documents) {
      // Map columns if they exist
      documents = documents.map((doc: any) => ({
        ...doc,
        issue_date: doc.issue_date || doc.metadata?.issue_date || doc.created_at,
        due_date: doc.due_date || doc.metadata?.due_date || null,
        notes: doc.notes || doc.metadata?.notes || null,
        lines: doc.metadata?.lines || doc.metadata?.cart_lines || [],
      }));
    }

    if (error) throw new Error(error.message);

    return { success: true, documents: documents || [] };
  } catch (err: any) {
    console.error('[getDocumentsAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, documents: [] };
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

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

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
    console.error('[updateDocumentStatusAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Recibe la mercancía de una Orden de Compra e incrementa el stock de inventario automáticamente.
 */
export async function receivePurchaseOrderAction(
  poId: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!poId || !tenantId) throw new Error('ID de orden y Empresa requeridos.');

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: po, error: poErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', poId)
      .eq('tenant_id', tenantId)
      .single();

    if (poErr || !po) {
      return { success: false, error: 'Orden de compra no encontrada.' };
    }

    if (po.status === 'received' || po.status === 'completed') {
      return { success: false, error: 'Esta orden ya fue marcada como recibida.' };
    }

    // Extraer líneas desde metadata.lines o cart_lines
    const lines: Array<{ item_id?: string | null; quantity: number; description?: string }> =
      po.metadata?.lines || po.metadata?.cart_lines || [];

    // Incrementar stock en items si el producto es físico
    for (const line of lines) {
      if (line.item_id && !line.item_id.startsWith('custom-')) {
        try {
          const { data: itemData } = await supabaseAdmin
            .from('items')
            .select('id, stock, name')
            .eq('id', line.item_id)
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (itemData) {
            const currentStock = Number(itemData.stock || 0);
            const addedQty = Number(line.quantity || 0);
            const newStock = currentStock + addedQty;

            await supabaseAdmin
              .from('items')
              .update({ stock: newStock })
              .eq('id', line.item_id)
              .eq('tenant_id', tenantId);

            try {
              await supabaseAdmin
                .from('inventory_logs')
                .insert([{
                  item_id: line.item_id,
                  tenant_id: tenantId,
                  change: addedQty,
                  previous_stock: currentStock,
                  new_stock: newStock,
                  reason: `Recepción de Orden ${po.document_number}`,
                  created_at: new Date().toISOString(),
                }]);
            } catch {
              // inventory_logs opcional
            }
          }
        } catch (stockErr: any) {
          console.warn(`[receivePurchaseOrderAction]: Error al actualizar stock de ${line.item_id}:`, stockErr.message);
        }
      }
    }

    const updatedMetadata = {
      ...(po.metadata || {}),
      received_at: new Date().toISOString(),
      received_by: actor.email,
    };

    const { data: updatedDoc, error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'received',
        metadata: updatedMetadata,
      })
      .eq('id', poId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'purchase_order.received',
      target_type: 'document',
      target_id: po.id,
      metadata: { doc_number: po.document_number, lines_count: lines.length },
    });

    revalidatePath('/compras');
    revalidatePath('/inventario');
    revalidatePath('/catalogo');

    return { success: true, document: updatedDoc };
  } catch (err: any) {
    console.error('[receivePurchaseOrderAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Persiste la validación tripartita 3-Way Match en la orden de compra.
 */
export async function updatePurchaseOrderMatchAction(
  poId: string,
  data: {
    billNumber: string;
    goodsReceiptAmt: number;
    billAmt: number;
    statusMessage?: string;
  },
  tenantId: string,
  actor: ActionActor
) {
  try {
    if (!poId || !tenantId) throw new Error('ID de orden y Empresa requeridos.');

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: po, error: poErr } = await supabaseAdmin
      .from('documents')
      .select('id, metadata')
      .eq('id', poId)
      .eq('tenant_id', tenantId)
      .single();

    if (poErr || !po) {
      return { success: false, error: 'Orden de compra no encontrada.' };
    }

    const updatedMetadata = {
      ...(po.metadata || {}),
      three_way_match: {
        verified_at: new Date().toISOString(),
        verified_by: actor.email,
        supplier_bill_number: data.billNumber,
        goods_receipt_amount: data.goodsReceiptAmt,
        supplier_bill_amount: data.billAmt,
        match_status: data.statusMessage || 'Conciliado con éxito',
      },
    };

    const { data: updatedDoc, error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({
        metadata: updatedMetadata,
      })
      .eq('id', poId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath('/compras');
    return { success: true, document: updatedDoc };
  } catch (err: any) {
    console.error('[updatePurchaseOrderMatchAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}


/**
 * Marca o desmarca un paso de proceso en una orden de trabajo (Kanban por pasos).
 * ProcessStep vive en document.metadata.steps[].
 */
export async function toggleProcessStepAction(
  documentId: string,
  stepId: string,
  isCompleted: boolean,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; allCompleted?: boolean; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // Leer documento actual
    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !doc) {
      return { success: false, error: 'Documento no encontrado.' };
    }

    const meta = (typeof doc.metadata === 'object' && doc.metadata !== null)
      ? { ...doc.metadata as Record<string, unknown> }
      : {};

    const steps = Array.isArray(meta.steps) ? [...meta.steps as Array<Record<string, unknown>>] : [];
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    if (stepIndex === -1) {
      return { success: false, error: 'Paso no encontrado.' };
    }

    steps[stepIndex] = { ...steps[stepIndex], completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null };
    meta.steps = steps;

    const { error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({ metadata: meta })
      .eq('id', documentId)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    const allCompleted = steps.every((s) => s.completed === true);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'document.step_toggled',
      target_type: 'document',
      target_id: documentId,
      metadata: { stepId, isCompleted, allCompleted },
    });

    return { success: true, allCompleted };
  } catch (err: unknown) {
    console.error('[toggleProcessStepAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda las plantillas de pasos reutilizables de un negocio en los metadatos del tenant.
 * Las plantillas se almacenan en tenant.metadata.step_templates[].
 */
export async function saveStepTemplateAction(
  templateName: string,
  steps: Array<{ title: string; description?: string }>,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant, error: fetchErr } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (fetchErr || !tenant) {
      return { success: false, error: 'Empresa no encontrada.' };
    }

    const currentMeta = (typeof tenant.metadata === 'object' && tenant.metadata !== null)
      ? { ...tenant.metadata as Record<string, unknown> }
      : {};

    const existingTemplates = Array.isArray(currentMeta.step_templates)
      ? currentMeta.step_templates as Array<Record<string, unknown>>
      : [];

    const newTemplate = {
      id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: templateName,
      steps: steps.map((s, idx) => ({ ...s, order: idx + 1 })),
      created_at: new Date().toISOString(),
    };

    const updatedTemplates = [...existingTemplates, newTemplate];
    currentMeta.step_templates = updatedTemplates;

    const { error: updateErr } = await supabaseAdmin
      .from('tenants')
      .update({ metadata: currentMeta })
      .eq('id', tenantId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene las plantillas de pasos reutilizables guardadas para un tenant.
 */
export async function getStepTemplatesAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; templates?: Array<{ id: string; name: string; steps: Array<{ title: string; description?: string; order: number }> }>; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      return { success: false, error: 'Empresa no encontrada.' };
    }

    const meta = (typeof tenant.metadata === 'object' && tenant.metadata !== null)
      ? tenant.metadata as Record<string, unknown>
      : {};

    const templates = Array.isArray(meta.step_templates) ? meta.step_templates : [];

    return { success: true, templates: templates as Array<{ id: string; name: string; steps: Array<{ title: string; description?: string; order: number }> }> };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
