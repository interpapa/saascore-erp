/**
 * SaaSCore ERP - Motor de Suscripciones Recurrentes & MRR (SaaS/B2B Engine)
 * 
 * Gestiona contratos recurrentes, ciclo de renovación automático y métricas de
 * Ingreso Recurrente Mensual (MRR - Monthly Recurring Revenue) y Anual (ARR).
 */

import Decimal from 'decimal.js';

export type BillingInterval = 'monthly' | 'quarterly' | 'annual';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface SubscriptionContract {
  id: string;
  tenantId: string;
  customerId: string;
  planName: string;
  recurringAmount: number;
  interval: BillingInterval;
  status: SubscriptionStatus;
  nextBillingDate: string; // ISO Date
}

/**
 * Normaliza cualquier contrato a su equivalente de Ingreso Recurrente Mensual (MRR).
 * Ejemplo: $1,200/año -> MRR = $100/mes.
 */
export function calculateMRR(recurringAmount: number, interval: BillingInterval): number {
  const amt = new Decimal(recurringAmount);
  switch (interval) {
    case 'annual':
      return amt.div(12).toDecimalPlaces(2).toNumber();
    case 'quarterly':
      return amt.div(3).toDecimalPlaces(2).toNumber();
    case 'monthly':
    default:
      return amt.toDecimalPlaces(2).toNumber();
  }
}

/**
 * Calcula las métricas agregadas de MRR y ARR para un conjunto de contratos activos.
 */
export function summarizeSubscriptions(subscriptions: SubscriptionContract[]): {
  totalMRR: number;
  totalARR: number;
  activeCount: number;
} {
  let mrrSum = new Decimal(0);
  let activeCount = 0;

  for (const sub of subscriptions) {
    if (sub.status === 'active' || sub.status === 'trialing') {
      const mrr = calculateMRR(sub.recurringAmount, sub.interval);
      mrrSum = mrrSum.plus(mrr);
      activeCount += 1;
    }
  }

  const totalMRR = mrrSum.toDecimalPlaces(2).toNumber();
  const totalARR = mrrSum.times(12).toDecimalPlaces(2).toNumber();

  return { totalMRR, totalARR, activeCount };
}
