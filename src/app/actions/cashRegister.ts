'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { revalidatePath } from 'next/cache';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export interface CashMovement {
  id: string;
  type: 'in' | 'out';
  amount_usd: number;
  amount_ves: number;
  reason: string;
  created_at: string;
  actor_email: string;
  document_id?: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  openedBy: string;
  initialAmount: number;        // Total inicial equivalente en USD
  initialAmountUSD?: number;   // Billetes en $ ingresados
  initialAmountVES?: number;   // Billetes en Bs ingresados
  exchangeRate?: number;       // Tasa BCV aplicada
  initialTotalUSD?: number;    // Fondo inicial total unificado en USD
  initialTotalVES?: number;    // Fondo inicial total unificado en Bs
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  
  // Movimientos de Caja Chica (Egresos e Ingresos)
  cash_movements?: CashMovement[];
  netMovementsUSD?: number;
  netMovementsVES?: number;

  // Totales esperados en gaveta (UNIFICADOS)
  expectedCash?: number;        // Total unificado esperado en USD
  expectedTotalUSD?: number;   // Total unificado esperado en USD
  expectedTotalVES?: number;   // Total unificado esperado en Bs
  
  // Desglose de ventas en efectivo durante la sesión
  salesCashInSession?: number; // Total ventas efectivo unificado en USD
  salesCashUSD?: number;       // Ventas cobradas en billetes $
  salesCashVES?: number;       // Ventas cobradas en billetes Bs
  totalSalesInUSD?: number;    // Ventas efectivo totales convertidas a USD
  totalSalesInVES?: number;    // Ventas efectivo totales convertidas a Bs
  
  // Conteo Físico Real (Arqueo Z)
  countedCash?: number;        // Total unificado contado en USD
  countedCashUSD?: number;     // Billetes $ contados
  countedCashVES?: number;     // Billetes Bs contados
  countedTotalUSD?: number;    // Total contado físico equivalente en USD
  countedTotalVES?: number;    // Total contado físico equivalente en Bs
  
  // Diferencia del arqueo (UNIFICADA)
  difference?: number;         // Diferencia en USD (unificada)
  differenceUSD?: number;      // Diferencia en USD (unificada)
  differenceVES?: number;      // Diferencia en Bs (unificada)
  notes?: string;
}

export async function getCashSessionStatusAction(tenantId: string, actor: ActionActor) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'caja');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Caja POS está desactivado.' };
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

    const rate = Number(openSession.exchangeRate) || Number(tenant.metadata?.exchange_rate?.rate) || 849.56;

    // Calcular las ventas en efectivo durante la sesión
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('total_amount, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'invoice')
      .gte('created_at', openSession.openedAt);

    let salesCashUSD = 0;
    let salesCashVES = 0;
    const sessionStart = new Date(openSession.openedAt).getTime();

    if (documents) {
      for (const doc of documents) {
        const payments = doc.metadata?.payments;
        if (Array.isArray(payments) && payments.length > 0) {
          for (const payment of payments) {
            const paymentTime = new Date(payment.timestamp || doc.created_at).getTime();
            if (paymentTime >= sessionStart) {
              const method = (payment.method || '').toLowerCase();
              if (method.includes('bs') || method.includes('ves') || method.includes('bolivar')) {
                salesCashVES += Number(payment.amount_local || payment.amount || 0);
              } else if (method.includes('efectivo') || method.includes('cash')) {
                salesCashUSD += Number(payment.amount || 0);
              }
            }
          }
        } else {
          // Venta directa con un solo método de pago
          const method = (doc.metadata?.payment_method || '').toLowerCase();
          const docTime = new Date(doc.created_at).getTime();
          if (docTime >= sessionStart) {
            if (method.includes('bs') || method.includes('ves') || method.includes('bolivar') || method === 'cash_ves') {
              const docRate = Number(doc.metadata?.exchange_rate) || rate;
              const localAmount = Number(doc.metadata?.total_local) || (Number(doc.total_amount || 0) * docRate);
              salesCashVES += localAmount;
            } else if (method.includes('efectivo') || method.includes('cash')) {
              salesCashUSD += Number(doc.total_amount || 0);
            }
          }
        }
      }
    }

    // Cálculo Unificado del Fondo Inicial
    const initialUSD = openSession.initialAmountUSD !== undefined ? openSession.initialAmountUSD : openSession.initialAmount;
    const initialVES = openSession.initialAmountVES || 0;
    const initialTotalUSD = openSession.initialTotalUSD ?? (initialUSD + (rate > 0 ? initialVES / rate : 0));
    const initialTotalVES = openSession.initialTotalVES ?? ((initialUSD * rate) + initialVES);

    // Cálculo Unificado de Ventas en Efectivo
    const totalSalesInUSD = salesCashUSD + (rate > 0 ? salesCashVES / rate : 0);
    const totalSalesInVES = (salesCashUSD * rate) + salesCashVES;

    // Cálculo de Movimientos de Caja Chica (Egresos e Ingresos)
    const movements: CashMovement[] = openSession.cash_movements || [];
    let netMovementsUSD = 0;
    let netMovementsVES = 0;

    for (const mov of movements) {
      const movUSD = Number(mov.amount_usd) || 0;
      const movVES = Number(mov.amount_ves) || (movUSD * rate);
      if (mov.type === 'in') {
        netMovementsUSD += movUSD + (rate > 0 ? movVES / rate : 0);
        netMovementsVES += (movUSD * rate) + movVES;
      } else {
        netMovementsUSD -= (movUSD + (rate > 0 ? movVES / rate : 0));
        netMovementsVES -= ((movUSD * rate) + movVES);
      }
    }

    // Total Esperado en Gaveta (UNIFICADO: Fondo + Ventas + Movimientos)
    const expectedTotalUSD = initialTotalUSD + totalSalesInUSD + netMovementsUSD;
    const expectedTotalVES = initialTotalVES + totalSalesInVES + netMovementsVES;

    return { 
      success: true, 
      session: {
        ...openSession,
        exchangeRate: rate,
        initialAmount: initialTotalUSD,
        initialAmountUSD: initialUSD,
        initialAmountVES: initialVES,
        initialTotalUSD,
        initialTotalVES,
        salesCashUSD,
        salesCashVES,
        totalSalesInUSD,
        totalSalesInVES,
        salesCashInSession: totalSalesInUSD,
        cash_movements: movements,
        netMovementsUSD,
        netMovementsVES,
        expectedCash: expectedTotalUSD,
        expectedTotalUSD,
        expectedTotalVES
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function openCashSessionAction(
  initialAmount: number, 
  tenantId: string, 
  actor: ActionActor,
  initialAmountVES?: number,
  sessionRate?: number
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'caja');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Caja POS está desactivado.' };
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

    const safeUSD = isNaN(Number(initialAmount)) || Number(initialAmount) < 0 ? 0 : Number(initialAmount);
    const safeVES = isNaN(Number(initialAmountVES)) || Number(initialAmountVES) < 0 ? 0 : Number(initialAmountVES);
    const rate = Number(sessionRate) > 0 ? Number(sessionRate) : (Number(tenant.metadata?.exchange_rate?.rate) || 849.56);

    // Suma Unificada de la Base Inicial
    const initialTotalUSD = safeUSD + (rate > 0 ? safeVES / rate : 0);
    const initialTotalVES = (safeUSD * rate) + safeVES;

    const newSession: CashSession = {
      id: `CS-${Date.now()}`,
      openedAt: new Date().toISOString(),
      openedBy: actor.email,
      initialAmount: initialTotalUSD,
      initialAmountUSD: safeUSD,
      initialAmountVES: safeVES,
      exchangeRate: rate,
      initialTotalUSD,
      initialTotalVES,
      cash_movements: [],
      expectedCash: initialTotalUSD,
      expectedTotalUSD: initialTotalUSD,
      expectedTotalVES: initialTotalVES,
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
      metadata: { 
        session_id: newSession.id, 
        initial_usd: safeUSD,
        initial_ves: safeVES,
        initial_total_usd: initialTotalUSD,
        initial_total_ves: initialTotalVES,
        rate
      }
    });

    try {
      revalidatePath('/caja');
      revalidatePath('/pos');
    } catch {
      // safe no-op
    }

    return { success: true, session: newSession };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Registra un egreso (gasto menor) o ingreso de cambio en la gaveta,
 * creando además el documento de compra / egreso contable.
 */
export async function recordCashMovementAction(
  tenantId: string,
  type: 'in' | 'out',
  amountUSD: number,
  amountVES: number,
  reason: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if ((!amountUSD && !amountVES) || (amountUSD <= 0 && amountVES <= 0)) {
      return { success: false, error: 'Ingresa un monto válido mayor a 0.' };
    }

    if (!reason?.trim()) {
      return { success: false, error: 'Debes indicar el motivo o concepto del movimiento.' };
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
    const openSessionIndex = sessions.findIndex(s => s.status === 'open');

    if (openSessionIndex === -1) {
      return { success: false, error: 'No hay una caja abierta para registrar movimientos de efectivo.' };
    }

    const openSession = sessions[openSessionIndex];
    const rate = openSession.exchangeRate || Number(tenant.metadata?.exchange_rate?.rate) || 849.56;

    const safeUSD = Number(amountUSD) || 0;
    const safeVES = Number(amountVES) || (safeUSD * rate);

    const movement: CashMovement = {
      id: `MOV-${Date.now()}`,
      type,
      amount_usd: safeUSD,
      amount_ves: safeVES,
      reason: reason.trim(),
      created_at: new Date().toISOString(),
      actor_email: actor.email
    };

    // Si es una salida (egreso / gasto menor), crear documento de compra en el módulo de compras
    if (type === 'out') {
      try {
        const { data: purchaseDoc } = await supabaseAdmin
          .from('documents')
          .insert([{
            tenant_id: tenantId,
            entity_id: null,
            type: 'purchase_order',
            status: 'paid',
            document_number: `GAS-${Date.now().toString().slice(-6)}`,
            subtotal_amount: safeUSD,
            tax_amount: 0,
            total_amount: safeUSD,
            notes: `Caja Chica POS: ${reason.trim()}`,
            metadata: {
              category: 'caja_chica',
              movement_id: movement.id,
              session_id: openSession.id,
              amount_ves: safeVES,
              exchange_rate: rate,
              paid_by: actor.email,
              payment_method: 'cash'
            }
          }])
          .select('id')
          .single();

        if (purchaseDoc?.id) {
          movement.document_id = purchaseDoc.id;
        }
      } catch (docErr) {
        console.warn('Advertencia al registrar gasto en compras:', docErr);
      }
    }

    const currentMovements = openSession.cash_movements || [];
    currentMovements.push(movement);
    openSession.cash_movements = currentMovements;
    sessions[openSessionIndex] = openSession;

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...tenant.metadata,
          cash_sessions: sessions
        }
      })
      .eq('id', tenantId);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: type === 'out' ? 'cash_movement.expense' : 'cash_movement.income',
      target_type: 'tenant',
      target_id: tenantId,
      metadata: { 
        session_id: openSession.id, 
        type, 
        amount_usd: safeUSD, 
        amount_ves: safeVES, 
        reason 
      }
    });

    try {
      revalidatePath('/caja');
      revalidatePath('/compras');
    } catch {
      // safe no-op
    }

    return { success: true, movement };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al registrar movimiento de efectivo.' };
  }
}

export async function closeCashSessionAction(
  sessionId: string, 
  countedCash: number, 
  notes: string, 
  tenantId: string, 
  actor: ActionActor,
  countedCashVES?: number
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'caja');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Caja POS está desactivado.' };
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
    const rate = Number(session.exchangeRate) || Number(tenant.metadata?.exchange_rate?.rate) || 849.56;

    // Calcular las ventas en efectivo
    const { data: documents } = await supabaseAdmin
      .from('documents')
      .select('total_amount, metadata, created_at, status')
      .eq('tenant_id', tenantId)
      .eq('type', 'invoice')
      .neq('status', 'annulled')
      .neq('status', 'voided')
      .gte('created_at', session.openedAt);

    let salesCashUSD = 0;
    let salesCashVES = 0;
    const sessionStart = new Date(session.openedAt).getTime();

    if (documents) {
      for (const doc of documents) {
        const payments = doc.metadata?.payments;
        if (Array.isArray(payments) && payments.length > 0) {
          for (const payment of payments) {
            const paymentTime = new Date(payment.timestamp || doc.created_at).getTime();
            if (paymentTime >= sessionStart) {
              const method = (payment.method || '').toLowerCase();
              if (method.includes('bs') || method.includes('ves') || method.includes('bolivar')) {
                salesCashVES += Number(payment.amount_local || payment.amount || 0);
              } else if (method.includes('efectivo') || method.includes('cash')) {
                salesCashUSD += Number(payment.amount || 0);
              }
            }
          }
        } else {
          // Venta directa con un solo método de pago
          const method = (doc.metadata?.payment_method || '').toLowerCase();
          const docTime = new Date(doc.created_at).getTime();
          if (docTime >= sessionStart) {
            if (method.includes('bs') || method.includes('ves') || method.includes('bolivar') || method === 'cash_ves') {
              const docRate = Number(doc.metadata?.exchange_rate) || rate;
              const localAmount = Number(doc.metadata?.total_local) || (Number(doc.total_amount || 0) * docRate);
              salesCashVES += localAmount;
            } else if (method.includes('efectivo') || method.includes('cash')) {
              salesCashUSD += Number(doc.total_amount || 0);
            }
          }
        }
      }
    }

    // Totales de Ventas Unificados
    const totalSalesInUSD = salesCashUSD + (rate > 0 ? salesCashVES / rate : 0);
    const totalSalesInVES = (salesCashUSD * rate) + salesCashVES;

    // Fondo Inicial Unificado
    const initialUSD = session.initialAmountUSD !== undefined ? session.initialAmountUSD : session.initialAmount;
    const initialVES = session.initialAmountVES || 0;
    const initialTotalUSD = session.initialTotalUSD ?? (initialUSD + (rate > 0 ? initialVES / rate : 0));
    const initialTotalVES = session.initialTotalVES ?? ((initialUSD * rate) + initialVES);

    // Movimientos de Caja Chica
    const movements: CashMovement[] = session.cash_movements || [];
    let netMovementsUSD = 0;
    let netMovementsVES = 0;
    for (const mov of movements) {
      const mUSD = Number(mov.amount_usd) || 0;
      const mVES = Number(mov.amount_ves) || (mUSD * rate);
      if (mov.type === 'in') {
        netMovementsUSD += mUSD + (rate > 0 ? mVES / rate : 0);
        netMovementsVES += (mUSD * rate) + mVES;
      } else {
        netMovementsUSD -= (mUSD + (rate > 0 ? mVES / rate : 0));
        netMovementsVES -= ((mUSD * rate) + mVES);
      }
    }

    // Total Esperado en Gaveta (UNIFICADO)
    const expectedTotalUSD = initialTotalUSD + totalSalesInUSD + netMovementsUSD;
    const expectedTotalVES = initialTotalVES + totalSalesInVES + netMovementsVES;

    // Conteo Real Físico Ingresado
    const safeCountedUSD = isNaN(Number(countedCash)) ? 0 : Number(countedCash);
    const safeCountedVES = isNaN(Number(countedCashVES)) ? 0 : Number(countedCashVES);

    // Total Físico Contado (UNIFICADO a la tasa de cambio)
    const countedTotalUSD = safeCountedUSD + (rate > 0 ? safeCountedVES / rate : 0);
    const countedTotalVES = (safeCountedUSD * rate) + safeCountedVES;

    // Diferencia Unificada
    const differenceUSD = countedTotalUSD - expectedTotalUSD;
    const differenceVES = countedTotalVES - expectedTotalVES;

    sessions[sessionIndex] = {
      ...session,
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: actor.email,
      exchangeRate: rate,
      
      // Fondo Inicial
      initialAmount: initialTotalUSD,
      initialAmountUSD: initialUSD,
      initialAmountVES: initialVES,
      initialTotalUSD,
      initialTotalVES,

      // Movimientos
      cash_movements: movements,
      netMovementsUSD,
      netMovementsVES,

      // Ventas
      salesCashUSD,
      salesCashVES,
      totalSalesInUSD,
      totalSalesInVES,
      salesCashInSession: totalSalesInUSD,

      // Esperado
      expectedCash: expectedTotalUSD,
      expectedTotalUSD,
      expectedTotalVES,

      // Contado Real
      countedCash: countedTotalUSD,
      countedCashUSD: safeCountedUSD,
      countedCashVES: safeCountedVES,
      countedTotalUSD,
      countedTotalVES,

      // Diferencias
      difference: differenceUSD,
      differenceUSD,
      differenceVES,
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
      throw new Error('Error al cerrar la caja: ' + updateError.message);
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
        counted_usd: safeCountedUSD,
        counted_ves: safeCountedVES,
        counted_total_usd: countedTotalUSD,
        expected_total_usd: expectedTotalUSD,
        difference_usd: differenceUSD,
        rate
      }
    });

    // Si hay descuadre y Contabilidad está activa, registrar asiento contable de faltante o sobrante
    if (Math.abs(differenceUSD) >= 0.01) {
      try {
        const contabilidadCheck = await assertModuleEnabled(tenantId, 'contabilidad');
        if (contabilidadCheck.authorized) {
          const isSurplus = differenceUSD > 0;
          const absDiff = Math.abs(differenceUSD);
          const lines = isSurplus ? [
            {
              account_code: '1.1.01.01',
              account_name: 'Caja Principal (Efectivo)',
              debit: absDiff,
              credit: 0
            },
            {
              account_code: '4.2.01',
              account_name: 'Otros Ingresos - Sobrante de Caja POS',
              debit: 0,
              credit: absDiff
            }
          ] : [
            {
              account_code: '5.2.01',
              account_name: 'Otros Gastos - Faltante de Caja POS',
              debit: absDiff,
              credit: 0
            },
            {
              account_code: '1.1.01.01',
              account_name: 'Caja Principal (Efectivo)',
              debit: 0,
              credit: absDiff
            }
          ];

          await supabaseAdmin.from('documents').insert([{
            tenant_id: tenantId,
            entity_id: tenantId,
            type: 'invoice',
            status: 'invoiced',
            document_number: `JE-ARQ-${sessionId.slice(-6)}`,
            subtotal_amount: absDiff,
            tax_amount: 0,
            total_amount: absDiff,
            metadata: {
              actual_type: 'journal_entry',
              notes: `Asiento por Arqueo de Caja Sesión ${sessionId}: ${isSurplus ? 'Sobrante' : 'Faltante'} de $${absDiff.toFixed(2)} USD`,
              session_id: sessionId,
              difference_usd: differenceUSD,
              journal_lines: lines,
              timestamp: new Date().toISOString()
            }
          }]);
        }
      } catch (accountingErr) {
        console.warn('[closeCashSessionAction] Advertencia al generar asiento de arqueo:', accountingErr);
      }
    }

    try {
      revalidatePath('/caja');
      revalidatePath('/pos');
    } catch {
      // safe no-op
    }

    return { 
      success: true, 
      session: sessions[sessionIndex] 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCashSessionsHistoryAction(tenantId: string, actor: ActionActor) {
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
    return { 
      success: true, 
      sessions: sessions.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()) 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Anula una venta facturada, reingresando el stock al inventario,
 * ajustando la deuda en CRM si fue a crédito y generando el extorno contable.
 */
export async function voidSaleAction(
  invoiceId: string,
  reason: string,
  tenantId: string,
  actor: ActionActor
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'caja');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Caja POS está desactivado.' };
    }

    if (!invoiceId || !reason?.trim()) {
      return { success: false, error: 'Debes especificar la factura y el motivo de anulación.' };
    }

    // 1. Obtener la factura
    const { data: invoice, error: fetchErr } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !invoice) {
      return { success: false, error: 'Factura no encontrada.' };
    }

    if (invoice.status === 'annulled' || invoice.status === 'voided') {
      return { success: false, error: 'Esta factura ya fue anulada previamente.' };
    }

    // 2. Reversión de inventario para productos físicos
    const lines = (invoice.metadata?.cart_lines as any[]) || [];
    for (const line of lines) {
      if (line.item_id && isValidUUID(line.item_id) && !isTemporaryId(line.item_id)) {
        const qty = Number(line.quantity) || 0;
        if (qty > 0) {
          try {
            const { data: item } = await supabaseAdmin
              .from('items')
              .select('id, type, stock, stock_quantity')
              .eq('id', line.item_id)
              .eq('tenant_id', tenantId)
              .maybeSingle();

            if (item && item.type !== 'service') {
              const currentStock = item.stock !== undefined && item.stock !== null ? Number(item.stock) : Number(item.stock_quantity || 0);
              const restoredStock = currentStock + qty;
              const updatePayload = item.stock !== undefined ? { stock: restoredStock } : { stock_quantity: restoredStock };
              await supabaseAdmin
                .from('items')
                .update(updatePayload)
                .eq('id', item.id)
                .eq('tenant_id', tenantId);
            }
          } catch (stockErr) {
            console.warn('[voidSaleAction] Error restaurando stock del ítem:', line.item_id, stockErr);
          }
        }
      }
    }

    // 3. Si la venta fue a crédito, rebajar la deuda del cliente en CRM
    const paymentMethod = invoice.metadata?.payment_method;
    const isCredit = paymentMethod === 'credit';
    const payments = (invoice.metadata?.payments as any[]) || [];
    const creditAmountInBreakdown = payments
      .filter((p: any) => p.method === 'credit')
      .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    const totalCreditToRevert = isCredit ? Number(invoice.total_amount || 0) : creditAmountInBreakdown;

    if (totalCreditToRevert > 0 && invoice.entity_id) {
      try {
        const { data: client } = await supabaseAdmin
          .from('entities')
          .select('id, metadata')
          .eq('id', invoice.entity_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (client) {
          const currentDebt = Number(client.metadata?.total_debt || 0);
          const newDebt = Math.max(0, currentDebt - totalCreditToRevert);
          await supabaseAdmin
            .from('entities')
            .update({
              metadata: { ...(client.metadata || {}), total_debt: newDebt },
              updated_at: new Date().toISOString()
            })
            .eq('id', client.id)
            .eq('tenant_id', tenantId);
        }
      } catch (debtErr) {
        console.warn('[voidSaleAction] Error rebajando deuda en CRM:', debtErr);
      }
    }

    // 4. Extorno contable si Contabilidad está activa
    try {
      const contabilidadCheck = await assertModuleEnabled(tenantId, 'contabilidad');
      if (contabilidadCheck.authorized) {
        const invTotal = Number(invoice.total_amount || 0);
        const invSubtotal = Number(invoice.subtotal_amount || invTotal);
        const invTax = Number(invoice.tax_amount || 0);

        const extornoLines = [
          {
            account_code: '4.1.01',
            account_name: 'Devoluciones y Anulaciones en Ventas',
            debit: invSubtotal,
            credit: 0
          }
        ];
        if (invTax > 0) {
          extornoLines.push({
            account_code: '2.1.02.01',
            account_name: 'Débito Fiscal IVA Anulado',
            debit: invTax,
            credit: 0
          });
        }
        extornoLines.push({
          account_code: isCredit ? '1.1.02.01' : '1.1.01.01',
          account_name: isCredit ? 'Clientes Nacionales (AR)' : 'Caja Principal (Efectivo)',
          debit: 0,
          credit: invTotal
        });

        await supabaseAdmin.from('documents').insert([{
          tenant_id: tenantId,
          entity_id: invoice.entity_id,
          type: 'invoice',
          status: 'invoiced',
          document_number: `JE-EXT-${invoice.document_number}`,
          subtotal_amount: invTotal,
          tax_amount: 0,
          total_amount: invTotal,
          metadata: {
            actual_type: 'journal_entry',
            notes: `Extorno por Anulación de Factura ${invoice.document_number}: ${reason.trim()}`,
            source_document_id: invoice.id,
            reversal_of: invoice.document_number,
            journal_lines: extornoLines,
            timestamp: new Date().toISOString()
          }
        }]);
      }
    } catch (extornoErr) {
      console.warn('[voidSaleAction] Advertencia en extorno contable:', extornoErr);
    }

    // 5. Actualizar estado de la factura a 'annulled'
    const updatedMetadata = {
      ...(invoice.metadata || {}),
      annulled_at: new Date().toISOString(),
      annulled_by: actor.email,
      annul_reason: reason.trim(),
    };

    const { data: updatedDoc, error: updateErr } = await supabaseAdmin
      .from('documents')
      .update({
        status: 'annulled',
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 6. Auditoría
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'invoice.cancelled',
      target_type: 'document',
      target_id: invoiceId,
      metadata: {
        document_number: invoice.document_number,
        total_amount: invoice.total_amount,
        reason: reason.trim(),
        items_restocked: lines.length,
      }
    });

    try {
      revalidatePath('/caja');
      revalidatePath('/inventario');
      revalidatePath('/contabilidad');
      revalidatePath('/clientes');
    } catch {
      // safe no-op
    }

    return { success: true, document: updatedDoc };
  } catch (err: any) {
    console.error('[voidSaleAction Error]:', err.message);
    return { success: false, error: err.message || 'Error al anular la venta.' };
  }
}

