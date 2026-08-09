'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { validate3WayMatch, PurchaseOrder, GoodsReceipt, SupplierBill } from '@/lib/core/procurement/procurementEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

export interface CreatePOInput {
  supplier_id: string;
  total_amount: number;
  notes?: string;
}

export async function createPurchaseOrderAction(
  input: CreatePOInput,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas operaciones de compra.' };
    }

    const security = await validateKernelAccess(actor, tenantId, 'compras');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a compras.' };
    }

    const poNumber = `PO-${Date.now().toString().slice(-6)}`;

    const { data: doc, error } = await supabaseAdmin
      .from('documents')
      .insert([{
        tenant_id: tenantId,
        entity_id: input.supplier_id,
        type: 'purchase_order',
        status: 'draft',
        document_number: poNumber,
        total_amount: input.total_amount,
        subtotal_amount: input.total_amount,
        metadata: {
          notes: input.notes || '',
          created_by: actor.email,
        },
      }])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/compras');

    return { success: true, document: doc };
  } catch (err: any) {
    console.error('[createPurchaseOrderAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function verify3WayMatchAction(
  po: PurchaseOrder,
  receipt: GoodsReceipt,
  bill: SupplierBill,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'compras');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const matchResult = validate3WayMatch(po, receipt, bill);
    return { success: true, matchResult };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
