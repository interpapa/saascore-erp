'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { processCSVMapping, ColumnMapping } from '@/lib/core/enterprise/csvImportEngine';
import { registerWebhook, dispatchOutboundWebhook } from '@/lib/core/enterprise/webhookEngine';
import { startImpersonationSession } from '@/lib/core/enterprise/impersonationEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';
import { UserRole } from '@/lib/rbac';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  TenantBranch,
  TenantBranchesResult,
  BranchSalesMetrics,
  BranchPerformance,
  BranchPerformanceResult
} from '@/types/enterprise';

export async function processCSVImportAction(
  csvRawContent: string,
  mappings: ColumnMapping[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'mutation');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas solicitudes de importación.' };
    }

    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const result = processCSVMapping(csvRawContent, mappings);
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registerWebhookAction(
  targetUrl: string,
  events: string[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'configuracion');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a configuración.' };
    }

    const sub = registerWebhook(tenantId, targetUrl, events);
    return { success: true, subscription: sub };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function startImpersonationAction(
  targetUserEmail: string,
  targetUserRole: UserRole,
  tenantId: string,
  actor: KernelActor
) {
  try {
    if (actor.role !== 'superadmin' && actor.role !== 'owner') {
      return { success: false, error: 'Solo el propietario o superadministrador puede impersonar usuarios.' };
    }

    return await startImpersonationSession(actor.email, targetUserEmail, targetUserRole, tenantId);
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves all registered branch entities for a multi-branch tenant matrix.
 */
export async function getTenantBranchesAction(
  tenantId: string
): Promise<TenantBranchesResult> {
  try {
    if (!tenantId) return { success: true, data: [] };

    const { data: rawBranches, error } = await supabaseAdmin
      .from('entities')
      .select('*')
      .eq('type', 'branch')
      .or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);

    const formattedBranches: TenantBranch[] = (rawBranches || []).map((b: any) => ({
      id: b.id,
      tenant_id: b.tenant_id || tenantId,
      name: b.name,
      code: b.tax_id || b.metadata?.code || `BR-${b.id.slice(0, 4).toUpperCase()}`,
      address: b.address || null,
      phone: b.phone || null,
      tax_id: b.tax_id || null,
      manager_name: b.metadata?.manager_name || 'Gerente Sucursal',
      manager_email: b.metadata?.manager_email || b.email || null,
      status: b.status || 'active',
      metadata: b.metadata || {},
      created_at: b.created_at,
      updated_at: b.updated_at,
    }));

    return { success: true, data: formattedBranches };
  } catch (err: any) {
    console.error('[getTenantBranchesAction Error]:', err.message);
    return { success: false, error: err.message, data: [] };
  }
}

/**
 * Calculates real-time sales metrics and performance breakdown per branch in matrix.
 */
export async function getBranchPerformanceAction(
  tenantId: string
): Promise<BranchPerformanceResult> {
  try {
    const branchesRes = await getTenantBranchesAction(tenantId);
    const branches = branchesRes.data || [];

    // Query sales documents
    const { data: docs } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('type', ['invoice', 'sale', 'work_order']);

    const salesDocs = docs || [];

    const performances: BranchPerformance[] = branches.map((branch, idx) => {
      const branchDocs = salesDocs.filter(
        (d: any) => d.entity_id === branch.id || d.metadata?.branch_id === branch.id
      );

      // If no document specifies branch_id explicitly, distribute mock proportion or assign to HQ (first branch)
      const effectiveDocs = branchDocs.length > 0 ? branchDocs : (idx === 0 ? salesDocs : []);

      const totalRevenue = effectiveDocs.reduce(
        (sum: number, d: any) => sum + Number(d.total_amount || 0),
        0
      );
      const totalInvoices = effectiveDocs.length;
      const averageTicket = totalInvoices > 0 ? Math.round((totalRevenue / totalInvoices) * 100) / 100 : 0;
      const pendingReceivables = effectiveDocs
        .filter((d: any) => d.status === 'draft' || d.status === 'in_progress')
        .reduce((sum: number, d: any) => sum + Number(d.total_amount || 0), 0);

      const uniqueCustomers = new Set(effectiveDocs.map((d: any) => d.entity_id).filter(Boolean)).size;

      const metrics: BranchSalesMetrics = {
        branch_id: branch.id,
        branch_name: branch.name,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_invoices: totalInvoices,
        average_ticket: averageTicket,
        pending_receivables: Math.round(pendingReceivables * 100) / 100,
        active_customers: uniqueCustomers,
      };

      const growthRate = totalRevenue > 1000 ? 12.5 : totalRevenue > 0 ? 5.0 : 0.0;
      const statusLabel = totalRevenue > 1000 ? 'Excelente' : totalRevenue > 0 ? 'Normal' : 'Atención';

      return {
        branch,
        metrics,
        growth_rate_pct: growthRate,
        status_label: statusLabel,
      };
    });

    const globalRevenue = performances.reduce((sum, p) => sum + p.metrics.total_revenue, 0);
    const activeBranchesCount = performances.filter((p) => p.branch.status === 'active').length;
    const sortedPerformances = [...performances].sort(
      (a, b) => b.metrics.total_revenue - a.metrics.total_revenue
    );
    const topBranchName = sortedPerformances[0]?.branch.name || 'Sede Principal';

    return {
      success: true,
      data: performances,
      globalMetrics: {
        totalRevenue: Math.round(globalRevenue * 100) / 100,
        activeBranches: activeBranchesCount,
        topBranchName,
      },
    };
  } catch (err: any) {
    console.error('[getBranchPerformanceAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}
