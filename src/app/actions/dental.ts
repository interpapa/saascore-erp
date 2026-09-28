'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';

export interface ToothCondition {
  code: string;    // 'caries' | 'obturacion' | 'endodoncia' | 'corona' | 'implante' | 'ausente' | 'fractura' | 'custom'
  faces?: string[]; // ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal/incisal']
  label?: string;  // Para condiciones personalizadas
  notes?: string;
  color?: string;  // Para condiciones personalizadas
}

export interface ToothData {
  number: string;  // FDI notation: '11'-'48' adultos, '51'-'85' infantiles
  conditions: ToothCondition[];
  isSupernumerary?: boolean;
  notes?: string;
}

export interface DentalChart {
  mode: 'adult' | 'child' | 'mixed';
  teeth: Record<string, ToothData>;  // key = FDI number
  supernumeraryTeeth: ToothData[];   // piezas extra
  generalNotes?: string;
  lastUpdated: string;
}

export interface DentalTreatmentPlan {
  id: string;
  title: string;
  teeth: string[];       // FDI numbers involucrados
  procedures: Array<{
    toothNumber: string;
    conditionCode: string;
    procedure: string;   // Descripción libre del procedimiento
    estimatedCost: number;
    completed: boolean;
  }>;
  totalCost: number;
  notes?: string;
  createdAt: string;
}

/**
 * Guarda o actualiza el odontograma de un cliente.
 */
export async function saveDentalChartAction(
  entityId: string,
  chart: DentalChart,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'odontologia');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error };
    }

    // Buscar si ya existe un odontograma para este cliente
    const { data: existing } = await supabaseAdmin
      .from('entity_records')
      .select('id')
      .eq('entity_id', entityId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_chart')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const chartData = { ...chart, lastUpdated: new Date().toISOString() };

    if (existing?.id) {
      // Actualizar odontograma existente
      const { error: updateErr } = await supabaseAdmin
        .from('entity_records')
        .update({ metadata: chartData })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId);

      if (updateErr) return { success: false, error: updateErr.message };

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'dental_chart.updated',
        target_type: 'entity',
        target_id: entityId,
      });

      return { success: true, recordId: existing.id };
    } else {
      // Crear nuevo odontograma
      const { data: newRecord, error: insertErr } = await supabaseAdmin
        .from('entity_records')
        .insert({
          entity_id: entityId,
          tenant_id: tenantId,
          record_type: 'dental_chart',
          title: 'Odontograma',
          content: 'Odontograma digital del paciente.',
          metadata: chartData,
        })
        .select('id')
        .single();

      if (insertErr || !newRecord) return { success: false, error: insertErr?.message || 'Error al crear el odontograma.' };

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'dental_chart.created',
        target_type: 'entity',
        target_id: entityId,
      });

      return { success: true, recordId: newRecord.id };
    }
  } catch (err: unknown) {
    console.error('[saveDentalChartAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene el odontograma más reciente de un cliente.
 */
export async function getDentalChartAction(
  entityId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; chart?: DentalChart; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('entity_id', entityId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_chart')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) return { success: true, chart: undefined };

    return { success: true, chart: data.metadata as DentalChart };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Convierte el odontograma / plan de tratamiento en una Orden de Trabajo (Kanban).
 */
export async function createTreatmentKanbanFromChartAction(
  entityId: string,
  entityName: string,
  treatmentPlan: DentalTreatmentPlan,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const steps = treatmentPlan.procedures.map((proc, idx) => ({
      id: `step-dental-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${proc.toothNumber ? `[D${proc.toothNumber}] ` : ''}${proc.procedure}`,
      order: idx + 1,
      completed: proc.completed,
      completed_at: null,
    }));

    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: entityId,
        type: 'work_order',
        status: 'presupuestado',
        document_number: `OT-DENTAL-${Date.now().toString().slice(-6)}`,
        issue_date: new Date().toISOString(),
        metadata: {
          title: treatmentPlan.title || `Plan de Tratamiento — ${entityName}`,
          priority: 'medium',
          process_mode: 'step_by_step',
          pipeline: 'dental',
          steps,
          total_amount: treatmentPlan.totalCost,
          paid_amount: 0,
          source: 'dental_chart',
          treatment_plan_id: treatmentPlan.id,
          notes: treatmentPlan.notes || '',
        },
      })
      .select('id')
      .single();

    if (docErr || !newDoc) return { success: false, error: docErr?.message || 'Error al crear la orden de trabajo.' };

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'dental_chart.kanban_created',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { entityId, treatmentPlanId: treatmentPlan.id },
    });

    return { success: true, documentId: newDoc.id };
  } catch (err: unknown) {
    console.error('[createTreatmentKanbanFromChartAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}
