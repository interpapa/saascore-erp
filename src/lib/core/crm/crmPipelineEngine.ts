/**
 * SaaSCore ERP - Motor de Pipeline Kanban & CRM
 * 
 * Gestiona el ciclo de vida de oportunidades de venta, probabilidades de cierre
 * por etapa y cálculo del Embudo de Ventas Ponderado (Weighted Pipeline).
 */

export type PipelineStage = 'lead' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface CRMOpportunity {
  id: string;
  tenantId: string;
  customerId: string;
  title: string;
  expectedAmount: number;
  stage: PipelineStage;
  probability: number; // 0 - 100%
  expectedCloseDate?: string;
  createdAt: string;
}

export const STAGE_PROBABILITIES: Record<PipelineStage, number> = {
  lead: 10,
  qualification: 35,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

/**
 * Calcula el valor ponderado de una oportunidad según su etapa en el pipeline.
 * Ejemplo: $10,000 en negociación (80%) = $8,000 de forecast.
 */
export function calculateWeightedOpportunityValue(opportunity: CRMOpportunity): number {
  if (opportunity.stage === 'lost') return 0;
  const prob = opportunity.probability ?? STAGE_PROBABILITIES[opportunity.stage] ?? 0;
  return Number(((opportunity.expectedAmount * prob) / 100).toFixed(2));
}

/**
 * Resume el total de pipeline y forecast ponderado de una lista de oportunidades.
 */
export function summarizePipeline(opportunities: CRMOpportunity[]): {
  totalPipeline: number;
  weightedForecast: number;
  byStage: Record<PipelineStage, { count: number; totalAmount: number }>;
} {
  let totalPipeline = 0;
  let weightedForecast = 0;

  const byStage: Record<PipelineStage, { count: number; totalAmount: number }> = {
    lead: { count: 0, totalAmount: 0 },
    qualification: { count: 0, totalAmount: 0 },
    proposal: { count: 0, totalAmount: 0 },
    negotiation: { count: 0, totalAmount: 0 },
    won: { count: 0, totalAmount: 0 },
    lost: { count: 0, totalAmount: 0 },
  };

  for (const opp of opportunities) {
    if (opp.stage !== 'lost') {
      totalPipeline += opp.expectedAmount;
      weightedForecast += calculateWeightedOpportunityValue(opp);
    }
    byStage[opp.stage].count += 1;
    byStage[opp.stage].totalAmount += opp.expectedAmount;
  }

  return {
    totalPipeline: Number(totalPipeline.toFixed(2)),
    weightedForecast: Number(weightedForecast.toFixed(2)),
    byStage,
  };
}
