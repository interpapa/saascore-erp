'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateJournalEntryForPayroll } from '@/lib/core/accountingEngine';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { checkPermission, UserRole } from '@/lib/rbac';

interface PayrollActor {
  email: string;
  role: UserRole;
}

export async function processPayroll(
  tenantId: string,
  employees: any[],
  actor: PayrollActor
) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 1: Verificación de Permisos en Servidor (RBAC)
    // Solo owner y superadmin pueden ejecutar nóminas
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (!checkPermission(actor.role, 'equipo')) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'permission.denied',
        target_type: 'payroll',
        metadata: { reason: 'Rol sin permiso de equipo intentó ejecutar nómina' }
      });
      return { success: false, error: 'Acceso denegado: Solo el Gerente o el Dueño pueden procesar la nómina.' };
    }

    if (!employees || employees.length === 0) {
      throw new Error('No hay empleados para procesar nómina');
    }

    const payrollResults = [];

    for (const emp of employees) {
      if (emp.status !== 'active') continue;

      const monthlySalary = Number(emp.metadata?.salary) || 0;
      if (monthlySalary <= 0) continue;

      const biweeklyPay = monthlySalary / 2;

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Insertar recibo de pago con cliente ADMIN (no ANON)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      const { data: payrollDoc, error: docError } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: emp.id,
          type: 'payroll_slip',
          status: 'invoiced',
          document_number: `PAY-${Date.now().toString().slice(-6)}-${emp.id.slice(0,4).toUpperCase()}`,
          subtotal_amount: biweeklyPay,
          tax_amount: 0,
          total_amount: biweeklyPay,
          notes: `Pago quincenal — ${emp.name}`,
          metadata: {
            salary_period: 'biweekly',
            processed_by: actor.email,
            timestamp: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (docError) {
        console.error('Error generando nómina para', emp.name, docError);
        payrollResults.push({ employee: emp.name, amount: biweeklyPay, status: 'error' });
        continue;
      }

      // Generar asiento contable por el gasto de nómina
      try {
        await generateJournalEntryForPayroll(payrollDoc as any, tenantId);
        payrollResults.push({ employee: emp.name, amount: biweeklyPay, status: 'success' });
      } catch (err) {
        payrollResults.push({ employee: emp.name, amount: biweeklyPay, status: 'accounting_error' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Registro de Auditoría
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalPaid = payrollResults
      .filter(r => r.status === 'success')
      .reduce((sum, r) => sum + r.amount, 0);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'payroll.processed',
      target_type: 'payroll_batch',
      metadata: {
        employees_processed: payrollResults.length,
        total_paid: totalPaid,
        results: payrollResults
      }
    });

    return { success: true, processed: payrollResults.length, details: payrollResults };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR (payroll):', error.message);
    return { success: false, error: error.message };
  }
}
