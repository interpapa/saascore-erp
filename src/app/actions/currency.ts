'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { getExchangeRate, fetchLiveBCVRate, ExchangeRateData } from '@/lib/core/currencyEngine';

export async function getExchangeRateAction(tenantId: string): Promise<{ success: boolean; rateData: ExchangeRateData; error?: string }> {
  try {
    if (!tenantId) {
      const live = await fetchLiveBCVRate();
      return { 
        success: true, 
        rateData: live || { currency: 'VES', symbol: 'Bs.', rate: 849.56, updated_at: new Date().toISOString(), source: 'BCV' } 
      };
    }

    // 1. Verificar si el tenant ya tiene una tasa en metadata
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const metaRate = tenant?.metadata?.exchange_rate;

    // Si tiene tasa y es del día actual (o fue fijada manualmente), usarla
    if (metaRate?.rate) {
      const isToday = metaRate.updated_at && new Date(metaRate.updated_at).toDateString() === new Date().toDateString();
      if (isToday || metaRate.source === 'Manual') {
        return {
          success: true,
          rateData: {
            currency: metaRate.currency || 'VES',
            symbol: metaRate.symbol || 'Bs.',
            rate: Number(metaRate.rate) || 849.56,
            updated_at: metaRate.updated_at || new Date().toISOString(),
            source: metaRate.source || 'BCV'
          }
        };
      }
    }

    // 2. Si no tiene o es de un día anterior, consultar en vivo a la API oficial del BCV
    const liveRate = await fetchLiveBCVRate();
    if (liveRate) {
      // Guardar automáticamente en el tenant
      await supabaseAdmin
        .from('tenants')
        .update({
          metadata: {
            ...(tenant?.metadata || {}),
            exchange_rate: liveRate
          }
        })
        .eq('id', tenantId);

      return { success: true, rateData: liveRate };
    }

    // 3. Fallback a currencyEngine
    const rateData = await getExchangeRate('VES', tenantId);
    return { success: true, rateData };
  } catch (err: any) {
    return { 
      success: true, 
      rateData: { currency: 'VES', symbol: 'Bs.', rate: 849.56, updated_at: new Date().toISOString(), source: 'BCV' } 
    };
  }
}

/**
 * Fuerza la sincronización en vivo con la API oficial del BCV
 */
export async function syncLiveBCVRateAction(
  tenantId: string, 
  actor: ActionActor
): Promise<{ success: boolean; rateData?: ExchangeRateData; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const liveRate = await fetchLiveBCVRate();
    if (!liveRate) {
      return { success: false, error: 'No se pudo conectar con el servicio oficial del BCV. Revisa tu conexión a internet.' };
    }

    // Guardar en tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...(tenant?.metadata || {}),
          exchange_rate: liveRate
        }
      })
      .eq('id', tenantId);

    // Auditoría
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'exchange_rate.synced_bcv',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { live_rate: liveRate.rate, source: liveRate.source, updated_at: liveRate.updated_at }
    });

    try {
      revalidatePath('/caja');
      revalidatePath('/inventario');
      revalidatePath('/catalogo');
    } catch {
      // safe no-op
    }

    return { success: true, rateData: liveRate };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al sincronizar tasa BCV' };
  }
}

export async function updateExchangeRateAction(
  tenantId: string, 
  newRate: number, 
  source: string = 'Manual', 
  actor: ActionActor
): Promise<{ success: boolean; rateData?: ExchangeRateData; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!newRate || isNaN(newRate) || newRate <= 0) {
      return { success: false, error: 'La tasa de cambio debe ser un número positivo mayor a 0.' };
    }

    const rateData: ExchangeRateData = {
      currency: 'VES',
      symbol: 'Bs.',
      rate: Number(Number(newRate).toFixed(4)),
      updated_at: new Date().toISOString(),
      source: source || 'Manual'
    };

    // 1. Guardar en metadata de tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const existingMeta = tenant?.metadata || {};
    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...existingMeta,
          exchange_rate: rateData
        }
      })
      .eq('id', tenantId);

    // 2. Intentar guardar en tabla exchange_rates si existe
    try {
      await supabaseAdmin.from('exchange_rates').insert([{
        tenant_id: tenantId,
        currency: 'VES',
        symbol: 'Bs.',
        rate: rateData.rate,
        source: rateData.source,
        created_at: rateData.updated_at
      }]);
    } catch {
      // Ignorar
    }

    // 3. Auditoría
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'exchange_rate.updated',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { new_rate: rateData.rate, source: rateData.source }
    });

    try {
      revalidatePath('/caja');
      revalidatePath('/inventario');
      revalidatePath('/catalogo');
    } catch {
      // safe no-op
    }

    return { success: true, rateData };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al actualizar tasa de cambio' };
  }
}
