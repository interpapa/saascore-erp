'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';

export interface CashSession {
  id: string;
  openedAt: string;
  openedBy: string;
  initialAmount: number;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  countedCash?: number;
  expectedCash?: number;
  salesCashInSession?: number;
  difference?: number;
  notes?: string;
}

export async function getCashSessionStatusAction(tenantId: string, actor?: ActionActor) {
  try {
    if (actor) {
      const securityCheck = await validateUserTenantAccess(actor, tenantId);
      if (!securityCheck.authorized) {
        return { success: false, error: securityCheck.error || 'Acceso denegado.' };
      }
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error('Empresa no encontrada.');
    }

    const sessions: CashSession[] = tenant.metadata?.cash_sessions || [];
    const openSession = sessions.find(s => s.status === 'open');

    if (!openSession) {
      return { success: true, session: null };
    }

    // Calcular las ventas en efectivo durante la sesión
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('tenant_id', tenantId);

    let salesCashInSession = 0;
    const sessionStart = new Date(openSession.openedAt).getTime();

    if (documents) {
      for (const doc of documents) {
        const payments = doc.metadata?.payments || [];
        for (const payment of payments) {
          const paymentTime = new Date(payment.timestamp).getTime();
          const isCash = payment.method?.toLowerCase().includes('efectivo') || payment.method?.toLowerCase().includes('cash');
          if (isCash && paymentTime >= sessionStart) {
            salesCashInSession += (payment.amount || 0);
          }
        }
      }
    }

    return { 
      success: true, 
      session: {
        ...openSession,
        expectedCash: openSession.initialAmount + salesCashInSession,
        salesCashInSession
      }
    };
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function openCashSessionAction(initialAmount: number, tenantId: string, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error('Empresa no encontrada.');
    }

    const sessions: CashSession[] = tenant.metadata?.cash_sessions || [];
    const hasOpen = sessions.some(s => s.status === 'open');
    if (hasOpen) {
      throw new Error('Ya existe una caja abierta. Debe cerrarla primero.');
    }

    const newSession: CashSession = {
      id: `CS-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openedBy: actor.email,
      initialAmount,
      status: 'open'
    };

    sessions.push(newSession);

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...tenant.metadata,
          cash_sessions: sessions
        }
      })
      .eq('id', tenantId);

    if (updateError) {
      throw new Error('Error al abrir la caja.');
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'cash_session.opened',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { session_id: newSession.id, initial_amount: initialAmount }
    });

    revalidatePath('/caja');
    revalidatePath('/pos');

    return { success: true, session: newSession };
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}

export async function closeCashSessionAction(
  sessionId: string, 
  countedCash: number, 
  notes: string, 
  tenantId: string, 
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    if (error || !tenant) {
      throw new Error('Empresa no encontrada.');
    }

    const sessions: CashSession[] = tenant.metadata?.cash_sessions || [];
    const sessionIndex = sessions.findIndex(s => s.id === sessionId && s.status === 'open');

    if (sessionIndex === -1) {
      throw new Error('Sesión de caja no encontrada o ya está cerrada.');
    }

    const session = sessions[sessionIndex];

    // Calcular las ventas en efectivo
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('metadata')
      .eq('tenant_id', tenantId);

    let salesCashInSession = 0;
    const sessionStart = new Date(session.openedAt).getTime();

    if (documents) {
      for (const doc of documents) {
        const payments = doc.metadata?.payments || [];
        for (const payment of payments) {
          const paymentTime = new Date(payment.timestamp).getTime();
          const isCash = payment.method?.toLowerCase().includes('efectivo') || payment.method?.toLowerCase().includes('cash');
          if (isCash && paymentTime >= sessionStart) {
            salesCashInSession += (payment.amount || 0);
          }
        }
      }
    }

    const expectedCash = session.initialAmount + salesCashInSession;
    const difference = countedCash - expectedCash;

    sessions[sessionIndex] = {
      ...session,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: actor.email,
      countedCash,
      expectedCash,
      difference,
      notes
    };

    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...tenant.metadata,
          cash_sessions: sessions
        }
      })
      .eq('id', tenantId);

    if (updateError) {
      throw new Error('Error al cerrar la caja.');
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'cash_session.closed',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { 
        session_id: sessionId, 
        counted_cash: countedCash, 
        expected_cash: expectedCash,
        difference,
        notes 
      }
    });

    revalidatePath('/caja');
    revalidatePath('/pos');

    return { success: true, session: sessions[sessionIndex] };
  } catch (error: unknown) {
    return { success: false, error: error.message };
  }
}
