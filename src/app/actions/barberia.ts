'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export interface BarberQueueItem {
  id: string;
  clientName: string;
  clientId?: string | null;
  phone?: string | null;
  barberId: string;
  barberName: string;
  services: Array<{ name: string; priceUSD: number; category?: string }>;
  status: 'waiting' | 'in_chair' | 'completed' | 'cancelled';
  arrivalTime: string;
  startedTime?: string | null;
  completedTime?: string | null;
  tipUSD: number;
  barberCommissionPercent: number;
  notes?: string;
}

/**
 * Obtiene la lista de turnos / cola de espera de la barbería para hoy
 */
export async function getBarberQueueAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; queue?: BarberQueueItem[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'barberia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('record_type', 'barber_chair_session')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    const queue: BarberQueueItem[] = (data || []).map((row) => {
      const meta = (row.metadata || {}) as any;
      return {
        id: row.id,
        clientName: meta.clientName || 'Cliente Walk-in',
        clientId: row.entity_id,
        phone: meta.phone,
        barberId: meta.barberId || 'staff-1',
        barberName: meta.barberName || 'Barbero de Turno',
        services: meta.services || [],
        status: meta.status || 'waiting',
        arrivalTime: row.created_at,
        startedTime: meta.startedTime,
        completedTime: meta.completedTime,
        tipUSD: Number(meta.tipUSD || 0),
        barberCommissionPercent: Number(meta.barberCommissionPercent || 50),
        notes: meta.notes
      };
    });

    return { success: true, queue };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Registra un cliente de paso (Walk-in) en la cola de espera de la barbería
 */
export async function addWalkInToQueueAction(
  input: {
    clientName: string;
    clientId?: string | null;
    phone?: string | null;
    barberId: string;
    barberName: string;
    services: Array<{ name: string; priceUSD: number }>;
    barberCommissionPercent?: number;
    notes?: string;
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; queueItem?: BarberQueueItem; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'barberia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const safeClientId = input.clientId && isValidUUID(input.clientId) && !isTemporaryId(input.clientId) 
      ? input.clientId 
      : null;

    const metadata = {
      clientName: input.clientName,
      phone: input.phone,
      barberId: input.barberId,
      barberName: input.barberName,
      services: input.services,
      status: 'waiting',
      tipUSD: 0,
      barberCommissionPercent: input.barberCommissionPercent || 50,
      notes: input.notes
    };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .insert({
        tenant_id: tenantId,
        entity_id: safeClientId,
        record_type: 'barber_chair_session',
        title: `Turno Barbería: ${input.clientName}`,
        content: `Atención con ${input.barberName}`,
        metadata
      })
      .select('id, created_at')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Error al agregar a la cola.' };

    const queueItem: BarberQueueItem = {
      id: data.id,
      clientName: input.clientName,
      clientId: safeClientId,
      phone: input.phone,
      barberId: input.barberId,
      barberName: input.barberName,
      services: input.services,
      status: 'waiting',
      arrivalTime: data.created_at,
      tipUSD: 0,
      barberCommissionPercent: input.barberCommissionPercent || 50,
      notes: input.notes
    };

    return { success: true, queueItem };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Actualiza el estado de un turno en la barbería (ej. pasar a la silla o completar)
 */
export async function updateQueueStatusAction(
  queueId: string,
  newStatus: 'waiting' | 'in_chair' | 'completed' | 'cancelled',
  updates: Partial<BarberQueueItem>,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const { data: record, error: fetchErr } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('id', queueId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !record) return { success: false, error: 'Turno no encontrado.' };

    const currentMeta = (record.metadata || {}) as any;
    const updatedMeta = {
      ...currentMeta,
      ...updates,
      status: newStatus,
      ...(newStatus === 'in_chair' && !currentMeta.startedTime ? { startedTime: new Date().toISOString() } : {}),
      ...(newStatus === 'completed' && !currentMeta.completedTime ? { completedTime: new Date().toISOString() } : {}),
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entity_records')
      .update({ metadata: updatedMeta })
      .eq('id', queueId)
      .eq('tenant_id', tenantId);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Despacha el ticket de barbería a Caja POS para cobro con comisiones desglosadas
 */
export async function sendBarberOrderToCashierAction(
  order: {
    clientName: string;
    clientId?: string | null;
    barberId: string;
    barberName: string;
    services: Array<{ name: string; priceUSD: number }>;
    tipUSD: number;
    barberCommissionPercent: number;
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; documentId?: string; documentNumber?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const servicesSubtotal = order.services.reduce((sum, s) => sum + s.priceUSD, 0);
    const barberCommissionUSD = (servicesSubtotal * order.barberCommissionPercent) / 100;
    const totalToPayUSD = servicesSubtotal + (order.tipUSD || 0);

    const docNumber = `BARB-${Date.now().toString().slice(-6)}`;
    const safeClientId = order.clientId && isValidUUID(order.clientId) && !isTemporaryId(order.clientId) 
      ? order.clientId 
      : null;

    const docMetadata = {
      title: `Barbería — ${order.clientName} (${order.barberName})`,
      source: 'barberia',
      pipeline: 'barberia',
      payment_status: 'pending_cashier',
      barber: {
        id: order.barberId,
        name: order.barberName,
        commissionPercent: order.barberCommissionPercent,
        commissionAmountUSD: barberCommissionUSD,
        tipUSD: order.tipUSD || 0
      },
      items: order.services.map(s => ({
        procedureName: s.name,
        cost: s.priceUSD
      })),
      tip: order.tipUSD || 0,
      total_charge: totalToPayUSD,
      created_by: actor.email
    };

    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeClientId,
        type: 'quotation',
        status: 'draft',
        document_number: docNumber,
        subtotal_amount: servicesSubtotal,
        tax_amount: 0,
        total_amount: totalToPayUSD,
        metadata: docMetadata
      })
      .select('id, document_number')
      .single();

    if (docErr || !newDoc) return { success: false, error: docErr?.message || 'Error al despachar orden a caja.' };

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'barber_order.dispatched_to_cashier',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { clientName: order.clientName, total: totalToPayUSD }
    });

    return { success: true, documentId: newDoc.id, documentNumber: newDoc.document_number };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
