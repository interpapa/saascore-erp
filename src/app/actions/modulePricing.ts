'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

import { DEFAULT_CONFIGS } from '@/lib/modulePricingDefaults';
import type { BarberPricingConfig, GroomingPricingConfig, DentalPricingConfig } from '@/lib/modulePricingDefaults';

/**
 * Obtiene la configuración de precios y tarifas paramétricas del módulo
 */
export async function getModulePricingConfigAction<T = any>(
  tenantId: string,
  moduleType: 'barberia' | 'grooming' | 'odontologia',
  actor: ActionActor
): Promise<{ success: boolean; config?: T; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const recordType = `module_config_${moduleType}`;

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('tenant_id', tenantId)
      .eq('record_type', recordType)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[getModulePricingConfigAction Error]:', error);
    }

    if (data?.metadata) {
      const merged = {
        ...DEFAULT_CONFIGS[moduleType],
        ...(data.metadata as any),
      };
      return { success: true, config: merged as T };
    }

    return { success: true, config: DEFAULT_CONFIGS[moduleType] as T };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda la configuración de tarifas y precios del módulo
 */
export async function saveModulePricingConfigAction(
  tenantId: string,
  moduleType: 'barberia' | 'grooming' | 'odontologia',
  config: Record<string, any>,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const recordType = `module_config_${moduleType}`;

    const { data: existing } = await supabaseAdmin
      .from('entity_records')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('record_type', recordType)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from('entity_records')
        .update({ metadata: config })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabaseAdmin
        .from('entity_records')
        .insert({
          tenant_id: tenantId,
          record_type: recordType,
          title: `Configuración de Tarifas — ${moduleType}`,
          content: `Parámetros y precios de ${moduleType}`,
          metadata: config,
        });

      if (error) return { success: false, error: error.message };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'module_pricing.updated',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { module: moduleType },
    });

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Actualiza rápidamente el precio de un ítem/servicio en el catálogo general
 */
export async function quickUpdateItemPriceAction(
  itemId: string,
  tenantId: string,
  newPriceUSD: number,
  actor: ActionActor,
  fallbackItemData?: { name: string; category?: string; type?: string; metadata?: any }
): Promise<{ success: boolean; error?: string; updatedItemId?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (newPriceUSD < 0) return { success: false, error: 'El precio no puede ser negativo.' };

    const isRealUUID = isValidUUID(itemId) && !isTemporaryId(itemId);

    if (isRealUUID) {
      const { error } = await supabaseAdmin
        .from('items')
        .update({ base_price: newPriceUSD })
        .eq('id', itemId)
        .eq('tenant_id', tenantId);

      if (!error) {
        return { success: true, updatedItemId: itemId };
      }
    }

    // Si el ítem proviene del catálogo maestro en memoria y no existe aún en la tabla items del tenant,
    // lo insertamos para que quede registrado y guardado permanentemente en la base de datos
    if (fallbackItemData?.name) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('items')
        .insert({
          tenant_id: tenantId,
          type: (fallbackItemData.type as any) || 'service',
          name: fallbackItemData.name,
          category: fallbackItemData.category || 'Servicio',
          base_price: newPriceUSD,
          cost: 0,
          is_active: true,
          metadata: fallbackItemData.metadata || {},
        })
        .select('id')
        .single();

      if (insertErr) {
        return { success: false, error: insertErr.message };
      }

      return { success: true, updatedItemId: inserted.id };
    }

    return { success: false, error: 'No se pudo identificar el ítem para actualizar su precio.' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Crea un nuevo servicio directamente desde el módulo específico
 */
export async function quickCreateModuleServiceAction(
  tenantId: string,
  input: {
    name: string;
    priceUSD: number;
    category: string;
    description?: string;
    durationMin?: number;
    moduleType: 'barberia' | 'grooming' | 'odontologia';
  },
  actor: ActionActor
): Promise<{ success: boolean; service?: any; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!input.name || !input.name.trim()) {
      return { success: false, error: 'El nombre del servicio es obligatorio.' };
    }
    if (input.priceUSD < 0) {
      return { success: false, error: 'El precio no puede ser negativo.' };
    }

    const { data, error } = await supabaseAdmin
      .from('items')
      .insert({
        tenant_id: tenantId,
        type: 'service',
        name: input.name.trim(),
        category: input.category || 'Servicio',
        description: input.description || null,
        base_price: input.priceUSD,
        cost: 0,
        is_active: true,
        metadata: {
          vertical: input.moduleType,
          durationMin: input.durationMin || 30,
          category: input.category,
        },
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'module_service.created',
      target_type: 'item',
      target_id: data.id,
      metadata: { name: input.name, price: input.priceUSD, module: input.moduleType },
    });

    return { success: true, service: data };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
