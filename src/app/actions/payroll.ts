'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { generateJournalEntryForPayroll } from '@/lib/core/accountingEngine';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { checkPermission, UserRole } from '@/lib/rbac';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { eventBus } from '@/lib/core/events/eventBus';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { ActionActor } from './entities';

export interface PayrollOptions {
  periodName?: string;
  frequency?: 'semanal' | 'quincenal' | 'mensual';
  paidThroughDate?: string;
  bonuses?: Record<string, number>;
  deductions?: Record<string, number>;
}

export async function processPayroll(
  tenantId: string,
  employees: any[],
  actor: ActionActor,
  options?: PayrollOptions
) {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 0: Autenticación Zero-Trust & Aislamiento Multi-Tenant
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado al módulo de nómina.' };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 1: Verificación de Módulo Activo (Estilo Odoo 17)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const moduleCheck = await assertModuleEnabled(tenantId, 'equipo');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de Personal & Nómina está desactivado.' };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 1: Verificación de Permisos en Servidor (RBAC)
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SEGURIDAD CRÍTICA: Cargar salarios y estado REALES desde la Base de Datos
    // Cero confianza en los datos financieros enviados por el cliente
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const employeeIds = employees.map((e: any) => e.id).filter(Boolean);
    if (employeeIds.length === 0) {
      throw new Error('Identificadores de empleados inválidos');
    }

    const { data: dbEmployees, error: dbEmpErr } = await supabaseAdmin
      .from('entities')
      .select('id, name, type, status, metadata, tenant_id')
      .eq('tenant_id', tenantId)
      .in('id', employeeIds);

    if (dbEmpErr || !dbEmployees) {
      console.error('[processPayroll] Error consultando entidades de nómina:', dbEmpErr);
      throw new Error('Fallo al validar los colaboradores oficiales en la base de datos.');
    }

    const dbEmployeeMap = new Map<string, any>(dbEmployees.map((e: any) => [e.id, e]));

    const payrollResults = [];
    const contabilidadCheck = await assertModuleEnabled(tenantId, 'contabilidad');
    const frequency = options?.frequency || 'quincenal';
    const periodName = options?.periodName || (frequency === 'semanal' ? 'Semanal' : frequency === 'mensual' ? 'Mensual' : 'Quincenal');
    const paidThroughDate = options?.paidThroughDate || new Date().toISOString().split('T')[0];

    for (const empInput of employees) {
      const emp = dbEmployeeMap.get(empInput.id);
      if (!emp) continue;
      if (emp.type && emp.type !== 'employee') continue;
      if (emp.status !== 'active') continue;
      // Blindaje Odoo: Canchas, cabinas y activos físicos NUNCA reciben nómina
      if (emp.is_resource || emp.metadata?.is_resource || emp.metadata?.resource_type === 'space') {
        continue;
      }

      const rawSalary = Number(emp.metadata?.salary ?? emp.metadata?.base_salary ?? 0);
      const monthlySalary = (!isNaN(rawSalary) && rawSalary > 0) ? rawSalary : 0;
      if (monthlySalary <= 0) continue;

      // Cálculo proporcional según periodicidad
      let basePeriodPay = monthlySalary / 2;
      if (frequency === 'mensual') basePeriodPay = monthlySalary;
      else if (frequency === 'semanal') basePeriodPay = monthlySalary / 4;

      let bonus = Number(options?.bonuses?.[emp.id] || 0);
      if (isNaN(bonus) || bonus < 0) bonus = 0;

      let ded = Number(options?.deductions?.[emp.id] || 0);
      if (isNaN(ded) || ded < 0) ded = 0;

      const netPay = Math.max(0, Math.round((basePeriodPay + bonus - ded) * 100) / 100);

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
          subtotal_amount: netPay,
          tax_amount: 0,
          total_amount: netPay,
          metadata: {
            notes: `Pago ${frequency} — ${emp.name} (${periodName})`,
            period_name: periodName,
            salary_period: frequency,
            paid_through_date: paidThroughDate,
            base_salary: basePeriodPay,
            bonuses: bonus,
            deductions: ded,
            employee_name: emp.name,
            processed_by: actor.email,
            timestamp: new Date().toISOString()
          }
        }])
        .select()
        .single();

      if (docError) {
        console.error('Error generando nómina para', emp.name, docError);
        payrollResults.push({ employee: emp.name, amount: netPay, status: 'error' });
        continue;
      }

      // Actualizar fecha del último pago del colaborador
      try {
        await supabaseAdmin
          .from('entities')
          .update({
            metadata: {
              ...(emp.metadata || {}),
              last_payroll_date: paidThroughDate,
              last_payroll_period: periodName
            }
          })
          .eq('id', emp.id)
          .eq('tenant_id', tenantId);
      } catch {
        // Fallback silencioso en caso de bloqueo
      }

      // Generar asiento contable SOLO si Contabilidad está activa
      if (contabilidadCheck.authorized) {
        try {
          await generateJournalEntryForPayroll(payrollDoc as any, tenantId);
          payrollResults.push({ employee: emp.name, amount: netPay, status: 'success' });
        } catch (_err) {
          payrollResults.push({ employee: emp.name, amount: netPay, status: 'accounting_error' });
        }
      } else {
        payrollResults.push({ employee: emp.name, amount: netPay, status: 'success' });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Registro de Auditoría & Evento de Dominio
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const totalPaid = payrollResults
      .filter(r => r.status === 'success' || r.status === 'accounting_error')
      .reduce((sum, r) => sum + r.amount, 0);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'payroll.processed',
      target_type: 'payroll_batch',
      metadata: {
        period_name: periodName,
        frequency,
        paid_through_date: paidThroughDate,
        employees_processed: payrollResults.length,
        total_paid: totalPaid,
        results: payrollResults
      }
    });

    // Emisión de evento desacoplado al EventBus
    await eventBus.emit('payroll.processed', {
      payrollId: `PAY-BATCH-${Date.now()}`,
      tenantId,
      actorId: actor.email,
      periodStart: paidThroughDate,
      periodEnd: paidThroughDate,
      totalDisbursed: totalPaid,
      employeeCount: payrollResults.filter(r => r.status === 'success').length,
      timestamp: new Date().toISOString(),
    });

    return { success: true, processed: payrollResults.length, details: payrollResults };

  } catch (error: any) {
    console.error('SERVER ACTION ERROR (payroll):', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Consulta el historial de comprobantes de pago de nómina emitidos para la empresa.
 */
export async function getPayrollHistoryAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; slips: any[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', slips: [] };
    }

    const { data, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('type', 'payroll_slip')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return { success: true, slips: data || [] };
  } catch (error: any) {
    console.error('[getPayrollHistoryAction Error]:', error.message);
    return { success: false, error: error.message, slips: [] };
  }
}
