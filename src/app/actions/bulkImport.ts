'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when called outside Next.js request lifecycle
  }
}

export interface BulkImportItem {
  name: string;
  sku?: string;
  category?: string;
  base_price: number;
  cost?: number;
  stock_quantity?: number;
  type?: 'product' | 'service';
}

export async function bulkImportItemsAction(
  itemsToImport: BulkImportItem[],
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'catalogo');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Catálogo está desactivado.' };
    }

    if (!itemsToImport || itemsToImport.length === 0) {
      return { success: false, error: 'No hay ítems para importar.' };
    }

    if (itemsToImport.length > 500) {
      return { success: false, error: 'El lote de importación supera el límite máximo permitido de 500 registros por operación.' };
    }

    const validatedItems = itemsToImport.map((item) => {
      if (!item.name) throw new Error('El nombre es requerido para todos los ítems.');
      return {
        tenant_id: tenantId,
        name: item.name,
        sku: item.sku || null,
        category: item.category || 'General',
        base_price: Number(item.base_price) || 0,
        cost: Number(item.cost) || 0,
        stock: item.type !== 'service' ? (Number(item.stock_quantity) || 0) : null,
        type: item.type || 'product',
        is_active: true,
      };
    });

    // Process in batches of 50
    const batchSize = 50;
    let insertedCount = 0;

    for (let i = 0; i < validatedItems.length; i += batchSize) {
      const batch = validatedItems.slice(i, i + batchSize);
      
      let { data, error } = await supabaseAdmin
        .from('items')
        .insert(batch)
        .select();

      if (error && (error.message.includes('stock') || error.message.includes('column'))) {
        // Fallback: Si el esquema de base de datos usa stock_quantity en lugar de stock
        const fallbackData = batch.map(item => {
          const { stock, ...rest } = item;
          return { ...rest, stock_quantity: stock };
        });
        const retry = await supabaseAdmin
          .from('items')
          .insert(fallbackData)
          .select();
        
        if (retry.error) throw new Error(retry.error.message);
        data = retry.data;
      } else if (error) {
        throw new Error(error.message);
      }

      if (data) {
        insertedCount += data.length;
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'item.updated',
      target_type: 'item',
      target_id: 'bulk_import',
      metadata: { action: 'bulk_imported', count: insertedCount },
    });

    safeRevalidate('/inventario');
    safeRevalidate('/catalogo');
    
    return { success: true, count: insertedCount };

  } catch (err: any) {
    console.error('[bulkImportItemsAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
