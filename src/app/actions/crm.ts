'use server';

import { validateKernelAccess, KernelActor } from '@/lib/core/kernel/tenantSecurityKernel';
import { summarizePipeline, CRMOpportunity } from '@/lib/core/crm/crmPipelineEngine';
import { summarizeSubscriptions, SubscriptionContract } from '@/lib/core/crm/subscriptionEngine';
import { createB2BPortalToken } from '@/lib/core/crm/b2bPortalEngine';
import { checkRateLimit } from '@/lib/core/rateLimiter';

export async function getCRMPipelineSummaryAction(
  opportunities: CRMOpportunity[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const rateCheck = checkRateLimit(actor.email, 'read');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Demasiadas peticiones al CRM.' };
    }

    const security = await validateKernelAccess(actor, tenantId, 'clientes');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado al CRM.' };
    }

    const summary = summarizePipeline(opportunities);
    return { success: true, summary };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getMRRMetricsAction(
  subscriptions: SubscriptionContract[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'clientes');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado a métricas de clientes.' };
    }

    const metrics = summarizeSubscriptions(subscriptions);
    return { success: true, metrics };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateB2BPortalLinkAction(
  customerId: string,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId, 'clientes');
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado al portal B2B.' };
    }

    const token = createB2BPortalToken(customerId, tenantId);
    const link = `/portal/${token}`;

    return { success: true, token, link };
  } catch (err: any) {
    return { success: false, error: (err as Error).message };
  }
}
