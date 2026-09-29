'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from '@/app/actions/entities';
import { DENTAL_PROCEDURES_MASTER } from './proceduresCatalog';
import { writeAuditLog } from '@/lib/core/auditLogger';

/**
 * Sincroniza automáticamente los procedimientos maestros de odontología en la tabla `items` de la empresa.
 * Se registran como servicios con categoría 'Odontología', permitiendo a la clínica editar
 * precios, nombres y códigos desde el Catálogo/Inventario general.
 */
export async function syncDentalCatalogToInventoryAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; seededCount?: number; existingCount?: number; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'odontologia');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'Módulo de odontología no activo.' };
    }

    // 1. Obtener los ítems existentes que ya pertenezcan a odontología
    const { data: existingItems, error: fetchErr } = await supabaseAdmin
      .from('items')
      .select('id, sku, name, metadata')
      .eq('tenant_id', tenantId);

    if (fetchErr) {
      console.error('[syncDentalCatalogToInventoryAction] Error consultando items:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    const existingSkus = new Set((existingItems || []).map((i) => (i.sku || '').toUpperCase()));
    const existingNames = new Set((existingItems || []).map((i) => i.name.toLowerCase().trim()));

    // 2. Identificar cuáles procedimientos de la biblioteca estándar faltan por sembrar
    const toInsert = DENTAL_PROCEDURES_MASTER.filter((proc) => {
      const skuMatch = proc.code && existingSkus.has(proc.code.toUpperCase());
      const nameMatch = existingNames.has(proc.name.toLowerCase().trim());
      return !skuMatch && !nameMatch;
    }).map((p) => ({
      tenant_id: tenantId,
      type: 'service',
      sku: p.code,
      name: p.name,
      description: `${p.categoryLabel} · Estimado: ${p.estimatedDurationMin} min · ${p.sessionsRequired > 1 ? `${p.sessionsRequired} sesiones` : '1 cita'}`,
      category: 'Odontología',
      base_price: p.defaultPriceUSD,
      cost: Math.round(p.defaultPriceUSD * 0.18 * 100) / 100, // Costo base estimado de descartables (~18% arancel)
      stock_quantity: 0,
      is_active: true,
      metadata: {
        is_dental: true,
        dental_procedure_id: p.id,
        conditionCode: p.conditionCode,
        color: p.color,
        stages: p.stages,
        sessionsRequired: p.sessionsRequired,
        duration_minutes: p.estimatedDurationMin,
        categoryKey: p.category,
      },
    }));

    let seededCount = 0;
    if (toInsert.length > 0) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('items')
        .insert(toInsert)
        .select('id');

      if (insertErr) {
        console.error('[syncDentalCatalogToInventoryAction] Error insertando items:', insertErr);
        return { success: false, error: insertErr.message };
      }
      seededCount = inserted?.length || 0;

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'dental.catalog_synced_to_inventory',
        target_type: 'items',
        metadata: { seededCount },
      });
    }

    return {
      success: true,
      seededCount,
      existingCount: (existingItems || []).length,
    };
  } catch (err: unknown) {
    console.error('[syncDentalCatalogToInventoryAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Helper para filtrar servicios dentales del inventario si el módulo no está activo en el tenant.
 */
export async function filterDentalItems<T extends { category?: string | null; metadata?: any }>(
  items: T[],
  isDentalModuleActive: boolean
): Promise<T[]> {
  if (isDentalModuleActive) return items;
  return items.filter((item) => {
    const isDentalCategory = (item.category || '').toLowerCase().includes('odontolog');
    const isDentalMeta = item.metadata?.is_dental === true;
    return !isDentalCategory && !isDentalMeta;
  });
}
