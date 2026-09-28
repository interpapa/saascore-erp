'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import { revalidatePath } from 'next/cache';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Graceful no-op when called outside Next.js request lifecycle
  }
}

export interface ActionActor {
  email: string;
  role: UserRole;
  token?: string;
}

export type EntityType = 'customer' | 'supplier' | 'employee' | 'lead' | 'branch';

export interface CreateEntityInput {
  type: EntityType;
  name: string;
  email?: string | null;
  phone?: string | null;
  tax_id?: string | null;
  address?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

export async function createEntityAction(
  input: CreateEntityInput,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.name) {
      throw new Error('Empresa y Nombre son campos requeridos.');
    }

    const { data: newEntity, error } = await supabaseAdmin
      .from('entities')
      .insert([
        {
          tenant_id: tenantId,
          type: input.type,
          name: input.name,
          email: input.email || null,
          phone: input.phone || null,
          tax_id: input.tax_id || null,
          address: input.address || null,
          status: input.status || 'active',
          metadata: input.metadata || {},
        },
      ])
      .select()
      .single();

    if (error) throw new Error('Error al guardar en la base de datos: ' + error.message);

    // Audit Log
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: newEntity.id,
      metadata: { action: 'created', type: input.type, name: input.name },
    });

    safeRevalidate('/clientes');
    safeRevalidate('/compras');
    safeRevalidate('/equipo');
    safeRevalidate('/franquicias');

    return { success: true, entity: newEntity };
  } catch (err: any) {
    console.error('[createEntityAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function updateEntityAction(
  id: string,
  updates: Partial<CreateEntityInput>,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    const { data: updatedEntity, error } = await supabaseAdmin
      .from('entities')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) throw new Error('Error al actualizar entidad: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: id,
      metadata: { action: 'updated', updates },
    });

    safeRevalidate('/clientes');
    safeRevalidate('/compras');
    safeRevalidate('/equipo');
    safeRevalidate('/franquicias');

    return { success: true, entity: updatedEntity };
  } catch (err: any) {
    console.error('[updateEntityAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function deleteEntityAction(
  id: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // Soft delete: marcar deleted_at en lugar de destruir la fila
    const { error } = await supabaseAdmin
      .from('entities')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw new Error('Error al eliminar entidad: ' + error.message);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: id,
      metadata: { action: 'soft_deleted' },
    });

    safeRevalidate('/clientes');
    safeRevalidate('/compras');
    safeRevalidate('/equipo');
    safeRevalidate('/franquicias');

    return { success: true };
  } catch (err: any) {
    console.error('[deleteEntityAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

export async function getEntitiesAction(tenantId: string, type: EntityType | undefined, limit: number = 50, actor: ActionActor) {
  try {
    if (!tenantId) return { success: true, entities: [] };
    if (!actor) return { success: false, error: 'Actor requerido para validación de seguridad.', entities: [] };

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', entities: [] };
    }

    let query = supabaseAdmin
      .from('entities')
      .select('id, tenant_id, type, name, email, phone, tax_id, address, status, metadata, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(0, limit - 1);

    if (type) {
      query = query.eq('type', type);
    }

    const { data: entities, error } = await query;

    if (error) throw new Error(error.message);

    return { success: true, entities: entities || [] };
  } catch (err: any) {
    console.error('[getEntitiesAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, entities: [] };
  }
}

export async function adjustCustomerDebtAction(
  tenantId: string,
  entityId: string,
  amount: number,
  concept: string,
  actor: ActionActor
): Promise<{ success: boolean; newDebt?: number; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !entityId) {
      return { success: false, error: 'ID de entidad y tenant son requeridos.' };
    }

    const { data: entity, error: fetchErr } = await supabaseAdmin
      .from('entities')
      .select('metadata, name')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !entity) {
      return { success: false, error: 'No se encontró el contacto.' };
    }

    const currentDebt = Number(entity.metadata?.total_debt || 0);
    const newDebt = Math.max(0, currentDebt + amount);

    const updatedMetadata = {
      ...(entity.metadata || {}),
      total_debt: newDebt,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entities')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    if (updateErr) throw updateErr;

    // Registrar en auditoría
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: amount > 0 ? 'entity.updated' : 'payment.recorded',
      target_type: 'entity',
      target_id: entityId,
      metadata: {
        action: amount > 0 ? 'debt_added' : 'debt_reduced',
        amount_changed: amount,
        previous_debt: currentDebt,
        new_debt: newDebt,
        concept: concept || (amount > 0 ? 'Cargo manual de deuda' : 'Abono manual'),
        client_name: entity.name,
      },
    });

    // Si el módulo de contabilidad está activo, generar el asiento contable correspondiente
    try {
      const contabilidadCheck = await assertModuleEnabled(tenantId, 'contabilidad');
      if (contabilidadCheck.authorized && Math.abs(amount) > 0) {
        const absAmount = Math.abs(amount);
        const lines = amount > 0 ? [
          {
            account_code: '1.1.02.01',
            account_name: 'Clientes Nacionales (AR)',
            debit: absAmount,
            credit: 0
          },
          {
            account_code: '4.2.01',
            account_name: 'Otros Ingresos / Ajustes por Cobrar',
            debit: 0,
            credit: absAmount
          }
        ] : [
          {
            account_code: '1.1.01.01',
            account_name: 'Caja Principal (Efectivo)',
            debit: absAmount,
            credit: 0
          },
          {
            account_code: '1.1.02.01',
            account_name: 'Clientes Nacionales (AR)',
            debit: 0,
            credit: absAmount
          }
        ];

        let kernelCreated = false;
        try {
          const res = await createKernelJournalEntry({
            tenant_id: tenantId,
            entry_date: new Date().toISOString(),
            description: `Asiento por ajuste de deuda (${entity.name}): ${concept || (amount > 0 ? 'Cargo manual' : 'Abono manual')}`,
            lines
          });
          if (res?.success) kernelCreated = true;
        } catch {
          // Fallback a documents
        }

        if (!kernelCreated) {
          await supabaseAdmin.from('documents').insert([{
            tenant_id: tenantId,
            entity_id: entityId,
            type: 'journal_entry',
            status: 'invoiced',
            document_number: `JE-DEBT-${Date.now().toString().slice(-6)}`,
            subtotal_amount: absAmount,
            tax_amount: 0,
            total_amount: absAmount,
            notes: `Asiento por ajuste de deuda (${entity.name}): ${concept || (amount > 0 ? 'Cargo manual' : 'Abono manual')}`,
            metadata: {
              action: amount > 0 ? 'debt_increase' : 'debt_payment',
              client_id: entityId,
              client_name: entity.name,
              amount: absAmount,
              journal_lines: lines,
              timestamp: new Date().toISOString()
            }
          }]);
        }
      }
    } catch (accountingErr) {
      console.warn('[adjustCustomerDebtAction] Advertencia al generar asiento de ajuste:', accountingErr);
    }

    safeRevalidate('/clientes');
    safeRevalidate('/contabilidad');
    return { success: true, newDebt };
  } catch (err: any) {
    console.error('[adjustCustomerDebtAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Registra un abono/pago de deuda de cliente en CRM y genera el asiento contable de partida doble:
 * Débito a Caja Principal (1.1.01.01) o Bancos (1.1.01.02) y Crédito a Cuentas por Cobrar / Clientes Nacionales (1.1.02.01).
 */
export async function recordClientPaymentAction(
  tenantId: string,
  entityId: string,
  amount: number,
  actorOrConcept: ActionActor | string,
  conceptOrActor?: string | ActionActor,
  paymentMethod: string = 'cash'
): Promise<{ success: boolean; newDebt?: number; journalEntryId?: string; error?: string }> {
  try {
    let actor: ActionActor;
    let concept = 'Abono a deuda de cliente';
    let method = (paymentMethod || 'cash').toLowerCase().trim();

    const knownMethods = ['cash', 'efectivo', 'card', 'tarjeta', 'transfer', 'transferencia', 'pago_movil', 'pagomovil', 'zelle', 'pos', 'bank', 'punto'];

    if (typeof actorOrConcept === 'object' && actorOrConcept !== null && 'email' in actorOrConcept) {
      actor = actorOrConcept;
      if (typeof conceptOrActor === 'string' && conceptOrActor.trim().length > 0) {
        const candidate = conceptOrActor.toLowerCase().trim().replace(/[\s-]+/g, '_');
        if (knownMethods.includes(candidate) && paymentMethod === 'cash') {
          method = candidate;
        } else {
          concept = conceptOrActor.trim();
        }
      }
    } else {
      concept = typeof actorOrConcept === 'string' && actorOrConcept.trim().length > 0 ? actorOrConcept.trim() : 'Abono a deuda de cliente';
      actor = conceptOrActor as ActionActor;
    }

    if (!actor) {
      return { success: false, error: 'Actor requerido para validación de seguridad.' };
    }

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const cleanAmount = Math.round(Number(amount) * 100) / 100;
    if (!tenantId || !entityId || isNaN(cleanAmount) || cleanAmount <= 0) {
      return { success: false, error: 'Monto mayor a 0, ID de cliente y empresa son requeridos.' };
    }

    const { data: entity, error: fetchErr } = await supabaseAdmin
      .from('entities')
      .select('metadata, name')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !entity) {
      return { success: false, error: 'No se encontró el cliente.' };
    }

    const currentDebt = Math.round(Number(entity.metadata?.total_debt || 0) * 100) / 100;
    const newDebt = Math.max(0, Math.round((currentDebt - cleanAmount) * 100) / 100);

    const updatedMetadata = {
      ...(entity.metadata || {}),
      total_debt: newDebt,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entities')
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    if (updateErr) throw updateErr;

    // Registrar en auditoría
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'payment.recorded',
      target_type: 'entity',
      target_id: entityId,
      metadata: {
        action: 'debt_payment',
        amount_paid: cleanAmount,
        previous_debt: currentDebt,
        new_debt: newDebt,
        concept: concept || 'Abono a deuda de cliente',
        payment_method: method,
        client_name: entity.name,
      },
    });

    // Partida Doble Estricta NIIF: Débito a Caja 1.1.01.01 (o Bancos 1.1.01.02) y Crédito a AR 1.1.02.01
    const m = (method || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    const fundCode = ['card', 'tarjeta', 'transfer', 'transferencia', 'pago_movil', 'pagomovil', 'zelle', 'pos', 'bank', 'punto'].includes(m)
      ? '1.1.01.02'
      : '1.1.01.01';
    const fundName = fundCode === '1.1.01.02' ? 'Bancos e Instituciones Financieras' : 'Caja Principal (Efectivo)';

    const lines = [
      {
        account_code: fundCode,
        account_name: fundName,
        debit: cleanAmount,
        credit: 0
      },
      {
        account_code: '1.1.02.01',
        account_name: 'Clientes Nacionales (AR)',
        debit: 0,
        credit: cleanAmount
      }
    ];

    let entryId: string | undefined = undefined;
    try {
      const kernelRes = await createKernelJournalEntry({
        tenant_id: tenantId,
        entry_date: new Date().toISOString(),
        description: `Abono de deuda (${entity.name}): ${concept}`,
        lines
      });
      if (kernelRes?.success) {
        entryId = kernelRes.entryId;
      }
    } catch {
      // Fallback a documents si tabla journal_entries no existe
    }

    if (!entryId) {
      try {
        const { data: docEntry } = await supabaseAdmin.from('documents').insert([{
          tenant_id: tenantId,
          entity_id: entityId,
          type: 'journal_entry',
          status: 'invoiced',
          document_number: `JE-PAY-${Date.now().toString().slice(-6)}`,
          subtotal_amount: amount,
          tax_amount: 0,
          total_amount: amount,
          notes: `Asiento por abono a deuda (${entity.name}): ${concept}`,
          metadata: {
            action: 'debt_payment',
            client_id: entityId,
            client_name: entity.name,
            amount,
            journal_lines: lines,
            timestamp: new Date().toISOString()
          }
        }]).select('id').single();
        entryId = docEntry?.id;
      } catch (docErr) {
        console.warn('[recordClientPaymentAction] Advertencia fallback document entry:', docErr);
      }
    }

    safeRevalidate('/clientes');
    safeRevalidate('/contabilidad');
    return { success: true, newDebt, journalEntryId: entryId };
  } catch (err: any) {
    console.error('[recordClientPaymentAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}


