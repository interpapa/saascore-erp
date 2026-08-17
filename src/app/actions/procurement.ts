'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { validate3WayMatch, PurchaseOrder, GoodsReceipt, SupplierBill } from '@/lib/core/procurement/procurementEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

import { createDocumentAction } from '@/app/actions/documents';

export interface CreatePOInput {
  supplier_id: string;
  total_amount: number;
  notes?: string;
  lines?: Array<{
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>;
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

    const res = await createDocumentAction(
      {
        type: 'purchase_order',
        status: 'draft',
        entity_id: input.supplier_id || null,
        notes: input.notes || null,
        metadata: {
          total_amount: input.total_amount,
        },
        lines: (input.lines || []).map(l => ({
          item_id: l.item_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_amount: 0,
        })),
      },
      tenantId,
      actor as any
    );

    if (!res.success) {
      return { success: false, error: res.error || 'No se pudo crear la orden de compra.' };
    }

    revalidatePath('/compras');
    return { success: true, document: res.document };
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
