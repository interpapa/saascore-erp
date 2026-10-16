'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { 
  Subscription, 
  SubscriptionPlan, 
  SubscriptionStatus, 
  SubscriptionFrequency,
  CreateSubscriptionInput 
} from '@/types/subscriptions';

function safeRevalidate(tenantId?: string) {
  try {
    revalidatePath('/suscripciones');
    revalidatePath('/dashboard');
    if (tenantId) {
      revalidatePath(`/suscripciones`);
    }
  } catch {}
}

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'plan-mensual-general',
    tenant_id: '',
    name: 'Membresía Mensual Estándar',
    description: 'Acceso mensual regular a clases y entrenamientos.',
    frequency: 'monthly',
    price_usd: 35.00,
    grace_period_days: 5,
    max_sessions_per_cycle: null,
    is_active: true,
    color: '#6366f1'
  },
  {
    id: 'plan-pase-libre-vip',
    tenant_id: '',
    name: 'Pase Libre VIP (Full Access)',
    description: 'Acceso ilimitado a todas las disciplinas y horarios.',
    frequency: 'monthly',
    price_usd: 55.00,
    grace_period_days: 7,
    max_sessions_per_cycle: null,
    is_active: true,
    color: '#8b5cf6'
  },
  {
    id: 'plan-pack-12-clases',
    tenant_id: '',
    name: 'Pack 12 Sesiones / Clases',
    description: 'Paquete de 12 clases para consumir en 45 días.',
    frequency: 'monthly',
    price_usd: 40.00,
    grace_period_days: 5,
    max_sessions_per_cycle: 12,
    is_active: true,
    color: '#10b981'
  },
  {
    id: 'plan-trimestral-pro',
    tenant_id: '',
    name: 'Plan Trimestral (3 Meses)',
    description: 'Cuota trimestral con 15% de descuento por permanencia.',
    frequency: 'quarterly',
    price_usd: 90.00,
    grace_period_days: 7,
    max_sessions_per_cycle: null,
    is_active: true,
    color: '#f59e0b'
  }
];

function calculateNextBillingDate(startDateStr: string, frequency: SubscriptionFrequency): string {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 15);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'semiannual':
      d.setMonth(d.getMonth() + 6);
      break;
    case 'annual':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }

  return d.toISOString().slice(0, 10);
}

// ─── 1. OBTENER PLANES DE SUSCRIPCIÓN ─────────────────────────────────────────
export async function getSubscriptionPlansAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; plans: SubscriptionPlan[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', plans: [] };
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const storedPlans: SubscriptionPlan[] = tenant?.metadata?.subscription_plans || [];
    if (storedPlans.length === 0) {
      const initialized = DEFAULT_PLANS.map(p => ({ ...p, tenant_id: tenantId }));
      return { success: true, plans: initialized };
    }

    return { success: true, plans: storedPlans };
  } catch (err: unknown) {
    console.error('[getSubscriptionPlansAction Error]:', err);
    return { success: false, error: (err as Error).message, plans: [] };
  }
}

// ─── 2. GUARDAR / EDITAR PLAN DE SUSCRIPCIÓN ──────────────────────────────────
export async function saveSubscriptionPlanAction(
  tenantId: string,
  plan: Partial<SubscriptionPlan> & { name: string; price_usd: number; frequency: SubscriptionFrequency },
  actor: ActionActor
): Promise<{ success: boolean; plan?: SubscriptionPlan; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const existingMetadata = tenant?.metadata || {};
    let plans: SubscriptionPlan[] = existingMetadata.subscription_plans || DEFAULT_PLANS.map(p => ({ ...p, tenant_id: tenantId }));

    let savedPlan: SubscriptionPlan;

    if (plan.id) {
      plans = plans.map(p => {
        if (p.id === plan.id) {
          savedPlan = {
            ...p,
            ...plan,
            updated_at: new Date().toISOString()
          };
          return savedPlan;
        }
        return p;
      });
      // @ts-expect-error assigned in map
      if (!savedPlan) {
        savedPlan = {
          id: plan.id,
          tenant_id: tenantId,
          name: plan.name,
          description: plan.description || '',
          frequency: plan.frequency,
          price_usd: Number(plan.price_usd) || 0,
          grace_period_days: plan.grace_period_days || 5,
          max_sessions_per_cycle: plan.max_sessions_per_cycle || null,
          is_active: plan.is_active ?? true,
          color: plan.color || '#6366f1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        plans.push(savedPlan);
      }
    } else {
      savedPlan = {
        id: `plan-${Date.now()}`,
        tenant_id: tenantId,
        name: plan.name,
        description: plan.description || '',
        frequency: plan.frequency,
        price_usd: Number(plan.price_usd) || 0,
        grace_period_days: plan.grace_period_days || 5,
        max_sessions_per_cycle: plan.max_sessions_per_cycle || null,
        is_active: plan.is_active ?? true,
        color: plan.color || '#6366f1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      plans.push(savedPlan);
    }

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...existingMetadata,
          subscription_plans: plans
        }
      })
      .eq('id', tenantId);

    safeRevalidate(tenantId);
    return { success: true, plan: savedPlan };
  } catch (err: unknown) {
    console.error('[saveSubscriptionPlanAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 3. LISTAR SUSCRIPTORES CON SEMÁFORO DE VENCIMIENTO ────────────────────────
export async function getSubscriptionsAction(
  tenantId: string,
  filters: { status?: string; search?: string } | undefined,
  actor: ActionActor
): Promise<{ success: boolean; subscriptions: Subscription[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', subscriptions: [] };
    }

    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select(`
        id, tenant_id, type, status, total_amount, notes, metadata, created_at, updated_at, entity_id,
        entity:entities (id, name, phone, email)
      `)
      .eq('tenant_id', tenantId)
      .eq('type', 'subscription')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const todayStr = new Date().toISOString().slice(0, 10);

    const subscriptions: Subscription[] = (docs || []).map((d: any) => {
      const client = d.entity || {};
      const meta = d.metadata || {};
      let calculatedStatus: SubscriptionStatus = d.status as SubscriptionStatus;

      // Actualizar automáticamente a 'due' si la fecha de corte ya pasó y no está pausada/cancelada
      if (calculatedStatus === 'active' && meta.next_billing_date && meta.next_billing_date < todayStr) {
        calculatedStatus = 'due';
      }

      return {
        id: d.id,
        tenant_id: d.tenant_id,
        client_id: d.entity_id || meta.client_id,
        client_name: client.name || meta.client_name || 'Suscriptor General',
        client_phone: client.phone || meta.client_phone || null,
        client_email: client.email || meta.client_email || null,
        plan_id: meta.plan_id || 'general',
        plan_name: meta.plan_name || 'Plan de Membresía',
        frequency: meta.frequency || 'monthly',
        status: calculatedStatus,
        start_date: meta.start_date || d.created_at.slice(0, 10),
        next_billing_date: meta.next_billing_date || d.created_at.slice(0, 10),
        last_payment_date: meta.last_payment_date || null,
        price_usd: Number(d.total_amount) || Number(meta.price_usd) || 0,
        sessions_used: Number(meta.sessions_used) || 0,
        max_sessions: meta.max_sessions || null,
        notes: d.notes || null,
        created_at: d.created_at,
        updated_at: d.updated_at,
        metadata: meta
      };
    });

    // Filtros
    let filtered = subscriptions;
    if (filters?.status && filters.status !== 'all') {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.client_name.toLowerCase().includes(q) ||
        s.plan_name.toLowerCase().includes(q) ||
        (s.client_phone && s.client_phone.includes(q))
      );
    }

    return { success: true, subscriptions: filtered };
  } catch (err: unknown) {
    console.error('[getSubscriptionsAction Error]:', err);
    return { success: false, error: (err as Error).message, subscriptions: [] };
  }
}

// ─── 4. CREAR SUSCRIPCIÓN (SUSCRIBIR CLIENTE) ─────────────────────────────────
export async function createSubscriptionAction(
  tenantId: string,
  input: CreateSubscriptionInput,
  actor: ActionActor
): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!input.client_id) {
      return { success: false, error: 'Debes seleccionar un cliente del directorio.' };
    }

    // Obtener datos del plan
    const { plans } = await getSubscriptionPlansAction(tenantId, actor);
    const plan = plans.find(p => p.id === input.plan_id) || plans[0];
    if (!plan) {
      return { success: false, error: 'Plan de suscripción no encontrado.' };
    }

    // Obtener datos del cliente
    let clientName = input.client_name || 'Cliente';
    let clientPhone = input.client_phone;
    let clientEmail = input.client_email;

    const { data: clientEntity } = await supabaseAdmin
      .from('entities')
      .select('name, phone, email')
      .eq('id', input.client_id)
      .eq('tenant_id', tenantId)
      .single();

    if (clientEntity) {
      clientName = clientEntity.name;
      clientPhone = clientEntity.phone;
      clientEmail = clientEntity.email;
    }

    const startDate = input.start_date || new Date().toISOString().slice(0, 10);
    const nextBillingDate = calculateNextBillingDate(startDate, plan.frequency);
    const priceUSD = input.price_usd !== undefined ? Number(input.price_usd) : plan.price_usd;

    const docNumber = `SUB-${Date.now().toString().slice(-6)}`;

    const { data: newDoc, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: input.client_id,
        type: 'subscription',
        status: 'active',
        document_number: docNumber,
        subtotal_amount: priceUSD,
        tax_amount: 0,
        total_amount: priceUSD,
        notes: input.notes || null,
        metadata: {
          plan_id: plan.id,
          plan_name: plan.name,
          frequency: plan.frequency,
          start_date: startDate,
          next_billing_date: nextBillingDate,
          last_payment_date: startDate,
          price_usd: priceUSD,
          sessions_used: 0,
          max_sessions: plan.max_sessions_per_cycle,
          client_name: clientName,
          client_phone: clientPhone,
          client_email: clientEmail,
          payment_history: [
            {
              id: `pay-${Date.now()}`,
              amount_usd: priceUSD,
              date: new Date().toISOString(),
              method: 'Inicial / Alta',
              notes: 'Pago de cuota inicial al suscribirse'
            }
          ]
        }
      })
      .select()
      .single();

    if (docError) throw docError;

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.created',
      target_type: 'subscription',
      target_id: newDoc.id,
      metadata: {
        client_name: clientName,
        plan_name: plan.name,
        price_usd: priceUSD,
      }
    });

    safeRevalidate(tenantId);

    const subscription: Subscription = {
      id: newDoc.id,
      tenant_id: tenantId,
      client_id: input.client_id,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      plan_id: plan.id,
      plan_name: plan.name,
      frequency: plan.frequency,
      status: 'active',
      start_date: startDate,
      next_billing_date: nextBillingDate,
      last_payment_date: startDate,
      price_usd: priceUSD,
      notes: input.notes || null,
      created_at: newDoc.created_at,
      updated_at: newDoc.updated_at,
      metadata: newDoc.metadata
    };

    return { success: true, subscription };
  } catch (err: unknown) {
    console.error('[createSubscriptionAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 5. REGISTRAR PAGO Y RENOVAR CICLO DE SUSCRIPCIÓN ─────────────────────────
export async function recordSubscriptionPaymentAction(
  subscriptionId: string,
  payment: { amount: number; paymentMethod: string; notes?: string },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; nextBillingDate?: string; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: subDoc, error: subErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .single();

    if (subErr || !subDoc) {
      return { success: false, error: 'Suscripción no encontrada.' };
    }

    const meta = subDoc.metadata || {};
    const frequency: SubscriptionFrequency = meta.frequency || 'monthly';
    
    // Extender ciclo a partir de la fecha de corte actual (o de hoy si estaba muy vencida)
    const baseDate = meta.next_billing_date && meta.next_billing_date >= new Date().toISOString().slice(0, 10)
      ? meta.next_billing_date
      : new Date().toISOString().slice(0, 10);

    const newNextBillingDate = calculateNextBillingDate(baseDate, frequency);
    const paymentRecord = {
      id: `pay-${Date.now()}`,
      amount_usd: Number(payment.amount) || Number(subDoc.total_amount) || 0,
      date: new Date().toISOString(),
      method: payment.paymentMethod || 'Efectivo',
      notes: payment.notes || 'Renovación de cuota',
      cycle_extended_to: newNextBillingDate
    };

    const updatedHistory = [...(meta.payment_history || []), paymentRecord];

    const { error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'active',
        metadata: {
          ...meta,
          status: 'active',
          next_billing_date: newNextBillingDate,
          last_payment_date: new Date().toISOString().slice(0, 10),
          payment_history: updatedHistory
        }
      })
      .eq('id', subscriptionId);

    if (updateErr) throw updateErr;

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'subscription_payment',
      target_id: subscriptionId,
      metadata: {
        payment_amount: payment.amount,
        method: payment.paymentMethod,
        new_billing_date: newNextBillingDate
      }
    });

    safeRevalidate(tenantId);
    return { success: true, nextBillingDate: newNextBillingDate };
  } catch (err: unknown) {
    console.error('[recordSubscriptionPaymentAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 6. CAMBIAR ESTADO DE LA SUSCRIPCIÓN (PAUSAR / CANCELAR / ACTIVAR) ────────
export async function updateSubscriptionStatusAction(
  subscriptionId: string,
  newStatus: SubscriptionStatus,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: subDoc } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .single();

    const currentMeta = subDoc?.metadata || {};

    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        status: newStatus,
        metadata: {
          ...currentMeta,
          status: newStatus,
          status_changed_at: new Date().toISOString()
        }
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'subscription_status',
      target_id: subscriptionId,
      metadata: { new_status: newStatus }
    });

    safeRevalidate(tenantId);
    return { success: true };
  } catch (err: unknown) {
    console.error('[updateSubscriptionStatusAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 7. CAMBIAR PLAN DE SUSCRIPCIÓN (UPGRADE / DOWNGRADE) ─────────────────────
export async function changeSubscriptionPlanAction(
  subscriptionId: string,
  newPlanId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { plans } = await getSubscriptionPlansAction(tenantId, actor);
    const newPlan = plans.find(p => p.id === newPlanId);
    if (!newPlan) {
      return { success: false, error: 'Plan seleccionado no existe.' };
    }

    const { data: subDoc } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('id', subscriptionId)
      .eq('tenant_id', tenantId)
      .single();

    const currentMeta = subDoc?.metadata || {};

    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        total_amount: newPlan.price_usd,
        metadata: {
          ...currentMeta,
          plan_id: newPlan.id,
          plan_name: newPlan.name,
          frequency: newPlan.frequency,
          price_usd: newPlan.price_usd,
          max_sessions: newPlan.max_sessions_per_cycle
        }
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'subscription_plan_change',
      target_id: subscriptionId,
      metadata: { new_plan_id: newPlan.id, new_plan_name: newPlan.name }
    });

    safeRevalidate(tenantId);
    return { success: true };
  } catch (err: unknown) {
    console.error('[changeSubscriptionPlanAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}
