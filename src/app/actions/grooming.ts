'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import { PetSize, PetCoat, PetTemperament } from '@/lib/grooming/groomingCatalog';

export interface GroomingInspection {
  mattingLevel: 'none' | 'mild' | 'severe';
  parasitesDetected: boolean;
  analGlandsExpressed: boolean;
  earsCleaned: boolean;
  nailsClipped: boolean;
  teethBrushed: boolean;
  skinWartsNotes?: string;
}

export interface GroomingOrder {
  id: string;
  petName: string;
  species: 'dog' | 'cat';
  breed: string;
  size: PetSize;
  coatType: PetCoat;
  temperament: PetTemperament;
  ownerName: string;
  ownerPhone?: string | null;
  ownerId?: string | null;
  stage: 'reception' | 'bathing' | 'drying' | 'haircut' | 'ready_for_pickup' | 'completed' | 'cancelled';
  inspection: GroomingInspection;
  services: Array<{ name: string; priceUSD: number }>;
  totalUSD: number;
  pickupNotified: boolean;
  createdAt: string;
  notes?: string;
}

/**
 * Obtiene las órdenes activas en el salón de peluquería canina
 */
export async function getGroomingOrdersAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; orders?: GroomingOrder[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'grooming');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('record_type', 'pet_grooming_order')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: true });

    if (error) return { success: false, error: error.message };

    const orders: GroomingOrder[] = (data || []).map((row) => {
      const meta = (row.metadata || {}) as any;
      return {
        id: row.id,
        petName: meta.petName || 'Mascota',
        species: meta.species || 'dog',
        breed: meta.breed || 'Mestizo',
        size: meta.size || 'small',
        coatType: meta.coatType || 'short',
        temperament: meta.temperament || 'docile',
        ownerName: meta.ownerName || 'Tutor',
        ownerPhone: meta.ownerPhone,
        ownerId: row.entity_id,
        stage: meta.stage || 'reception',
        inspection: meta.inspection || {
          mattingLevel: 'none',
          parasitesDetected: false,
          analGlandsExpressed: false,
          earsCleaned: false,
          nailsClipped: false,
          teethBrushed: false,
          skinWartsNotes: ''
        },
        services: meta.services || [],
        totalUSD: Number(meta.totalUSD || 0),
        pickupNotified: Boolean(meta.pickupNotified),
        createdAt: row.created_at,
        notes: meta.notes
      };
    });

    return { success: true, orders };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Registra una nueva orden de servicio de estética canina
 */
export async function createGroomingOrderAction(
  input: {
    petName: string;
    species: 'dog' | 'cat';
    breed: string;
    size: PetSize;
    coatType: PetCoat;
    temperament: PetTemperament;
    ownerName: string;
    ownerPhone?: string | null;
    ownerId?: string | null;
    inspection: GroomingInspection;
    services: Array<{ name: string; priceUSD: number }>;
    notes?: string;
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; order?: GroomingOrder; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'grooming');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const totalUSD = input.services.reduce((sum, s) => sum + s.priceUSD, 0);
    const safeOwnerId = input.ownerId && isValidUUID(input.ownerId) && !isTemporaryId(input.ownerId) 
      ? input.ownerId 
      : null;

    const metadata = {
      ...input,
      stage: 'reception',
      totalUSD,
      pickupNotified: false
    };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .insert({
        tenant_id: tenantId,
        entity_id: safeOwnerId,
        record_type: 'pet_grooming_order',
        title: `Peluquería: ${input.petName} (${input.breed})`,
        content: `Tutor: ${input.ownerName}, Servicios: ${input.services.length}`,
        metadata
      })
      .select('id, created_at')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Error al crear la orden de grooming.' };

    const order: GroomingOrder = {
      id: data.id,
      ...input,
      ownerId: safeOwnerId,
      stage: 'reception',
      totalUSD,
      pickupNotified: false,
      createdAt: data.created_at
    };

    return { success: true, order };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Actualiza la etapa del perro en la estética (Bañera, Secado, Corte, Listo para retiro)
 */
export async function updateGroomingStageAction(
  orderId: string,
  newStage: GroomingOrder['stage'],
  updates: Partial<GroomingOrder>,
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
      .eq('id', orderId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !record) return { success: false, error: 'Orden no encontrada.' };

    const currentMeta = (record.metadata || {}) as any;
    const updatedMeta = {
      ...currentMeta,
      ...updates,
      stage: newStage,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entity_records')
      .update({ metadata: updatedMeta })
      .eq('id', orderId)
      .eq('tenant_id', tenantId);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Despacha la orden de pet grooming hacia Caja POS
 */
export async function sendGroomingOrderToCashierAction(
  order: GroomingOrder,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; documentId?: string; documentNumber?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const docNumber = `GROOM-${Date.now().toString().slice(-6)}`;
    const safeOwnerId = order.ownerId && isValidUUID(order.ownerId) && !isTemporaryId(order.ownerId) 
      ? order.ownerId 
      : null;

    const docMetadata = {
      title: `Grooming — ${order.petName} (${order.ownerName})`,
      source: 'grooming',
      pipeline: 'grooming',
      payment_status: 'pending_cashier',
      pet: {
        name: order.petName,
        breed: order.breed,
        size: order.size
      },
      items: order.services.map(s => ({
        procedureName: s.name,
        cost: s.priceUSD
      })),
      total_charge: order.totalUSD,
      created_by: actor.email
    };

    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeOwnerId,
        type: 'quotation',
        status: 'draft',
        document_number: docNumber,
        subtotal_amount: order.totalUSD,
        tax_amount: 0,
        total_amount: order.totalUSD,
        metadata: docMetadata
      })
      .select('id, document_number')
      .single();

    if (docErr || !newDoc) return { success: false, error: docErr?.message || 'Error al despachar orden a caja.' };

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'grooming_order.dispatched_to_cashier',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { petName: order.petName, total: order.totalUSD }
    });

    return { success: true, documentId: newDoc.id, documentNumber: newDoc.document_number };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
