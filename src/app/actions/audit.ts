'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';

/**
 * Server Action para leer los logs de auditoría de un Tenant.
 * Filtrado opcional por tipo de recurso.
 */
export async function getAuditLogsAction(
  tenantId: string,
  targetType: string | undefined | null,
  limit: number | undefined,
  actor: ActionActor
): Promise<{ success: boolean; logs: unknown[]; error?: string }> {
  const actualLimit = limit || 40;
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, logs: [], error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId) {
      return { success: false, logs: [], error: 'El Tenant ID es requerido.' };
    }

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(actualLimit);

    if (targetType) {
      query = query.eq('target_type', targetType);
    }

    let logs: any[] = [];
    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      logs = [...data];
    } else {
      // 1. Fallback a tenants.metadata.audit_logs
      try {
        const { data: tenant } = await supabaseAdmin
          .from('tenants')
          .select('metadata')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenant?.metadata?.audit_logs && Array.isArray(tenant.metadata.audit_logs)) {
          let filtered = tenant.metadata.audit_logs;
          if (targetType) {
            filtered = filtered.filter(
              (l: any) => l.target_type === targetType || l.action?.includes(targetType)
            );
          }
          logs.push(...filtered);
        }
      } catch (fallbackErr) {
        console.warn('[getAuditLogsAction] Fallback tenant metadata error:', fallbackErr);
      }

      // 2. Si es para RRHH / Personal ('entity') o general, sintetizar trazabilidad de nóminas y empleados
      if (!targetType || targetType === 'entity') {
        try {
          const { data: payrollDocs } = await supabaseAdmin
            .from('documents')
            .select('id, created_at, total_amount, metadata')
            .eq('tenant_id', tenantId)
            .in('type', ['payroll_slip', 'payroll'])
            .order('created_at', { ascending: false })
            .limit(20);

          if (payrollDocs && payrollDocs.length > 0) {
            for (const doc of payrollDocs) {
              logs.push({
                id: `syn-payroll-${doc.id}`,
                created_at: doc.created_at,
                actor_email: actor.email,
                actor_role: actor.role,
                action: 'payroll.processed',
                target_type: 'entity',
                target_id: doc.id,
                metadata: {
                  period: doc.metadata?.period_name || 'Nómina',
                  amount: doc.total_amount,
                  employee_name: doc.metadata?.employee_name,
                  frequency: doc.metadata?.frequency,
                  paid_through_date: doc.metadata?.paid_through_date,
                },
              });
            }
          }

          const { data: empEntities } = await supabaseAdmin
            .from('entities')
            .select('id, name, created_at, updated_at, metadata')
            .eq('tenant_id', tenantId)
            .eq('type', 'employee')
            .order('updated_at', { ascending: false })
            .limit(10);

          if (empEntities && empEntities.length > 0) {
            for (const emp of empEntities) {
              logs.push({
                id: `syn-emp-${emp.id}`,
                created_at: emp.updated_at || emp.created_at,
                actor_email: actor.email,
                actor_role: actor.role,
                action: 'entity.updated',
                target_type: 'entity',
                target_id: emp.id,
                metadata: {
                  name: emp.name,
                  role: emp.metadata?.role || 'Colaborador',
                },
              });
            }
          }

          // Sintetizar clientes/contactos si no hay logs relacionales directos
          const { data: custEntities } = await supabaseAdmin
            .from('entities')
            .select('id, name, created_at, updated_at, metadata')
            .eq('tenant_id', tenantId)
            .eq('type', 'customer')
            .order('updated_at', { ascending: false })
            .limit(20);

          if (custEntities && custEntities.length > 0) {
            for (const cust of custEntities) {
              logs.push({
                id: `syn-cust-${cust.id}`,
                created_at: cust.updated_at || cust.created_at,
                actor_email: actor.email,
                actor_role: actor.role,
                action: 'entity.updated',
                target_type: 'entity',
                target_id: cust.id,
                metadata: {
                  action: 'created_or_updated',
                  name: cust.name,
                  details: `Ficha de contacto gestionada: ${cust.name}`,
                },
              });
            }
          }
        } catch (synthErr) {
          console.warn('[getAuditLogsAction] Synthesis error:', synthErr);
        }
      }
    }

    // Ordenar descendente por fecha y limitar
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const finalLogs = logs.slice(0, actualLimit);

    return { success: true, logs: finalLogs };
  } catch (err: any) {
    console.error('[getAuditLogsAction Exception]:', err);
    return { success: false, logs: [], error: (err as Error).message };
  }
}
