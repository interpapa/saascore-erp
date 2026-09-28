'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

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

    if (!isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: false, error: 'No se puede guardar el odontograma de un paciente temporal no guardado en la base de datos.' };
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

    if (!isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: true, chart: undefined };
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

    const safeEntityId = (entityId && isValidUUID(entityId) && !isTemporaryId(entityId)) ? entityId : null;

    let { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeEntityId,
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

    if (docErr && (docErr.message.includes('type') || docErr.message.includes('check') || docErr.message.includes('constraint'))) {
      // Fallback: Si el esquema de base de datos restringe type
      const retry = await supabaseAdmin
        .from('documents')
        .insert({
          tenant_id: tenantId,
          entity_id: safeEntityId,
          type: 'quotation',
          status: 'presupuestado',
          document_number: `OT-DENTAL-${Date.now().toString().slice(-6)}`,
          issue_date: new Date().toISOString(),
          metadata: {
            actual_type: 'work_order',
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
      newDoc = retry.data;
      docErr = retry.error;
    }

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

/**
 * Obtiene un resumen general del módulo dental:
 * - Pacientes con odontograma
 * - Órdenes de trabajo del pipeline dental
 * - Estadísticas generales
 */
export async function getDentalOverviewAction(
  tenantId: string,
  actor: ActionActor
): Promise<{
  success: boolean;
  charts?: Array<{
    id: string;
    entityId: string;
    entityName: string;
    entityPhone?: string;
    lastUpdated: string;
    teethCount: number;
  }>;
  dentalOrders?: Array<{
    id: string;
    documentNumber: string;
    patientName: string;
    title: string;
    status: string;
    totalAmount: number;
    completedSteps: number;
    totalSteps: number;
  }>;
  stats?: {
    totalPatientsWithChart: number;
    activeTreatments: number;
    completedTreatments: number;
    totalBudgeted: number;
  };
  error?: string;
}> {
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

    // 1. Obtener registros de odontogramas
    const { data: records, error: recErr } = await supabaseAdmin
      .from('entity_records')
      .select('id, entity_id, metadata, updated_at, created_at, entities(id, name, phone)')
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_chart')
      .order('updated_at', { ascending: false })
      .limit(50);

    if (recErr) {
      console.warn('[getDentalOverviewAction] Error fetching charts:', recErr);
    }

    const charts = (records || []).map((r) => {
      const ent = (r as any).entities;
      const meta = (r.metadata || {}) as DentalChart;
      const teethObj = meta?.teeth || {};
      const teethCount = Object.keys(teethObj).length + (meta?.supernumeraryTeeth?.length || 0);

      return {
        id: r.id,
        entityId: r.entity_id,
        entityName: ent?.name || 'Paciente Sin Nombre',
        entityPhone: ent?.phone || '',
        lastUpdated: meta?.lastUpdated || r.updated_at || r.created_at,
        teethCount,
      };
    });

    // 2. Obtener órdenes de trabajo con pipeline dental
    const { data: docs, error: docErr } = await supabaseAdmin
      .from('documents')
      .select('id, document_number, status, metadata, entity_id, entities(id, name)')
      .eq('tenant_id', tenantId)
      .in('type', ['work_order', 'quotation'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (docErr) {
      console.warn('[getDentalOverviewAction] Error fetching dental orders:', docErr);
    }

    const dentalOrders: Array<{
      id: string;
      documentNumber: string;
      patientName: string;
      title: string;
      status: string;
      totalAmount: number;
      completedSteps: number;
      totalSteps: number;
    }> = [];

    let inTreatmentCount = 0;
    let completedCount = 0;
    let totalBudgeted = 0;

    for (const d of docs || []) {
      const meta = (d.metadata || {}) as Record<string, unknown>;
      if (meta.pipeline === 'dental' || meta.source === 'dental_chart') {
        const ent = (d as any).entities;
        const steps = Array.isArray(meta.steps) ? (meta.steps as Array<{ completed?: boolean }>) : [];
        const completedSteps = steps.filter((s) => s.completed).length;
        const amount = typeof meta.total_amount === 'number' ? meta.total_amount : 0;

        totalBudgeted += amount;
        if (d.status === 'concluido' || d.status === 'invoiced') {
          completedCount++;
        } else {
          inTreatmentCount++;
        }

        dentalOrders.push({
          id: d.id,
          documentNumber: d.document_number,
          patientName: ent?.name || (meta.title as string) || 'Paciente',
          title: (meta.title as string) || 'Tratamiento Dental',
          status: d.status,
          totalAmount: amount,
          completedSteps,
          totalSteps: steps.length,
        });
      }
    }

    return {
      success: true,
      charts,
      dentalOrders,
      stats: {
        totalPatientsWithChart: charts.length,
        activeTreatments: inTreatmentCount,
        completedTreatments: completedCount,
        totalBudgeted,
      },
    };
  } catch (err: unknown) {
    console.error('[getDentalOverviewAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

