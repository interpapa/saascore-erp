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

    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const summary = summarizePipeline(opportunities);
    return { success: true, summary };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getMRRMetricsAction(
  subscriptions: SubscriptionContract[],
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const metrics = summarizeSubscriptions(subscriptions);
    return { success: true, metrics };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function generateB2BPortalLinkAction(
  customerId: string,
  tenantId: string,
  actor: KernelActor
) {
  try {
    const security = await validateKernelAccess(actor, tenantId);
    if (!security.authorized) {
      return { success: false, error: security.error || 'Acceso denegado.' };
    }

    const token = createB2BPortalToken(customerId, tenantId);
    const link = `/portal/${token}`;

    return { success: true, token, link };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
