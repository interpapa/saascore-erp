'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { checkPermission, UserRole } from '@/lib/rbac';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { eventBus } from '@/lib/core/events/eventBus';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import Decimal from 'decimal.js';

export async function recordDocumentPayment(
  documentId: string,
  paymentAmount: number,
  paymentMethod: string,
  tenantId: string,
  actor: ActionActor,
  referenceNumber?: string
) {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    // 1. RBAC Verification
    if (!checkPermission(actor.role, 'finanzas')) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'permission.denied',
        target_type: 'payment',
        metadata: { reason: 'Intento de registrar abono sin permisos de finanzas' }
      });
      return { success: false, error: 'Acceso denegado: No tienes permisos para registrar abonos.' };
    }

    if (!documentId || !isValidUUID(documentId) || isTemporaryId(documentId) || paymentAmount <= 0 || !tenantId) {
      throw new Error('Monto o datos de pago inválidos (ID de documento inválido o temporal).');
    }

    // 2. Fetch Document
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .single();

    if (docError || !document) throw new Error('Documento no encontrado');

    const totalAmount = new Decimal(document.total_amount || 0);
    const existingPayments = document.metadata?.paid_amount || 0;
    const currentPaidDecimal = new Decimal(existingPayments);
    const paymentAmountDecimal = new Decimal(paymentAmount);

    const newTotalPaidDecimal = currentPaidDecimal.plus(paymentAmountDecimal);

    if (newTotalPaidDecimal.greaterThan(totalAmount)) {
      throw new Error(`El abono ($${paymentAmount}) excede el saldo pendiente ($${totalAmount.minus(currentPaidDecimal)})`);
    }

    const remainingBalanceDecimal = totalAmount.minus(newTotalPaidDecimal);
    const isFullyPaid = remainingBalanceDecimal.equals(0);
    const newStatus = isFullyPaid ? 'paid' : 'partial';

    const paymentRecord = {
      id: `PAY-${Date.now().toString().slice(-6)}`,
      amount: paymentAmountDecimal.toNumber(),
      method: paymentMethod,
      reference: referenceNumber || 'N/A',
      processed_by: actor.email,
      timestamp: new Date().toISOString()
    };

    const updatedPaymentsList = [...(document.metadata?.payments || []), paymentRecord];

    // 3. Update Document
    const { data: updatedDoc, error: updateError } = await supabaseAdmin
      .from('documents')
      .update({
        status: newStatus,
        metadata: {
          ...document.metadata,
          paid_amount: newTotalPaidDecimal.toNumber(),
          remaining_balance: remainingBalanceDecimal.toNumber(),
          payments: updatedPaymentsList
        }
      })
      .eq('id', documentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Sincronización de Cuentas por Cobrar en el CRM: rebajar total_debt de la entidad
    if (document.entity_id && isValidUUID(document.entity_id) && !isTemporaryId(document.entity_id)) {
      try {
        const { data: entityRecord } = await supabaseAdmin
          .from('entities')
          .select('id, metadata')
          .eq('id', document.entity_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (entityRecord) {
          const currentDebt = Number(entityRecord.metadata?.total_debt || 0);
          const newDebt = Math.max(0, currentDebt - paymentAmountDecimal.toNumber());
          await supabaseAdmin
            .from('entities')
            .update({
              metadata: {
                ...(entityRecord.metadata || {}),
                total_debt: newDebt,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('id', entityRecord.id)
            .eq('tenant_id', tenantId);
        }
      } catch (entityDebtErr) {
        console.warn('[payments.ts] Advertencia al actualizar saldo de deuda del cliente:', entityDebtErr);
      }
    }

    // 4. Accounting Journal Entry for Payment (Partida Doble NIIF)
    try {
      await createKernelJournalEntry({
        tenant_id: tenantId,
        document_id: documentId,
        entry_date: new Date().toISOString(),
        description: `Abono/Pago recibido a Factura ${document.document_number} [Ref: ${referenceNumber || 'N/A'}]`,
        lines: [
          { account_code: '1.1.01.01', account_name: 'Caja Principal (Efectivo)', debit: paymentAmountDecimal.toNumber(), credit: 0 },
          { account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)', debit: 0, credit: paymentAmountDecimal.toNumber() }
        ]
      });
    } catch (journalErr) {
      console.warn('Abono guardado pero falló el asiento contable en ledgerKernel:', journalErr);
    }

    // 5. Audit Logging
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'payment.recorded',
      target_type: 'document',
      target_id: documentId,
      metadata: {
        amount_paid: paymentAmountDecimal.toNumber(),
        remaining_balance: remainingBalanceDecimal.toNumber(),
        status: newStatus,
        payment_method: paymentMethod
      }
    });

    return { 
      success: true, 
      document: updatedDoc, 
      remainingBalance: remainingBalanceDecimal.toNumber(),
      isFullyPaid 
    };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR (recordDocumentPayment):', error.message);
    return { success: false, error: error.message };
  }
}
