'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import { OrthodonticCase, OrthodonticVisit, EndodonticRecord, PeriodonticRecord } from '@/types/dentalSpecialties';

export interface ToothCondition {
  code: string;    // 'caries' | 'obturacion' | 'endodoncia' | 'corona' | 'implante' | 'ausente' | 'fractura' | 'custom'
  faces?: string[]; // ['vestibular', 'lingual', 'mesial', 'distal', 'oclusal/incisal']
  label?: string;  // Para condiciones personalizadas
  notes?: string;
  color?: string;  // Para condiciones personalizadas
  status?: 'existente' | 'planificado' | 'realizado'; // ⚪ Existente (otro dentista, no cobra), 🔴 Planificado (hoy, presupuesta), 🟢 Realizado (hecho por nosotros)
  date?: string;
  performer?: string;
}

export interface ToothData {
  number: string;  // FDI notation: '11'-'48' adultos, '51'-'85' infantiles
  conditions: ToothCondition[];
  isSupernumerary?: boolean;
  notes?: string;
}

export interface DentalTreatmentProcedure {
  id?: string;
  toothNumber: string;
  conditionCode: string;
  procedure: string;
  category?: string;
  estimatedCost: number;
  completed: boolean;
  stages?: Array<{ id: string; title: string; order: number; completed?: boolean }>;
  notes?: string;
}

export interface DentalTreatmentPlan {
  id: string;
  title: string;
  teeth: string[];       // FDI numbers involucrados
  procedures: DentalTreatmentProcedure[];
  totalCost: number;
  notes?: string;
  createdAt: string;
}

export interface DentalChart {
  mode: 'adult' | 'child' | 'mixed';
  teeth: Record<string, ToothData>;  // key = FDI number
  supernumeraryTeeth: ToothData[];   // piezas extra
  treatmentPlan?: DentalTreatmentPlan; // Plan de tratamiento y presupuesto persistido
  generalNotes?: string;
  lastUpdated: string;
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

    const procedures = Array.isArray(treatmentPlan?.procedures) ? treatmentPlan.procedures : [];
    const steps = procedures.map((proc, idx) => ({
      id: proc.id || `step-dental-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${proc.toothNumber ? `[D${proc.toothNumber}] ` : ''}${proc.procedure}`,
      order: idx + 1,
      completed: proc.completed || false,
      completed_at: proc.completed ? new Date().toISOString() : null,
    }));

    const safeEntityId = (entityId && isValidUUID(entityId) && !isTemporaryId(entityId)) ? entityId : null;
    const nowIso = new Date().toISOString();

    const docMetadata = {
      title: treatmentPlan.title || `Plan de Tratamiento — ${entityName}`,
      priority: 'medium',
      process_mode: 'step_by_step',
      pipeline: 'dental',
      steps,
      total_amount: treatmentPlan.totalCost || 0,
      paid_amount: 0,
      source: 'dental_chart',
      treatment_plan_id: treatmentPlan.id,
      notes: treatmentPlan.notes || '',
      issue_date: nowIso,
    };

    let { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeEntityId,
        type: 'work_order',
        status: 'presupuestado',
        document_number: `OT-DENTAL-${Date.now().toString().slice(-6)}`,
        subtotal_amount: treatmentPlan.totalCost || 0,
        tax_amount: 0,
        total_amount: treatmentPlan.totalCost || 0,
        metadata: docMetadata,
      })
      .select('id')
      .single();

    if (docErr && (docErr.message.includes('type') || docErr.message.includes('check') || docErr.message.includes('constraint') || docErr.message.includes('column') || docErr.message.includes('schema cache'))) {
      // Fallback: Si el esquema de base de datos restringe type a ('invoice', 'purchase_order', 'quotation')
      const retry = await supabaseAdmin
        .from('documents')
        .insert({
          tenant_id: tenantId,
          entity_id: safeEntityId,
          type: 'quotation',
          status: 'presupuestado',
          document_number: `OT-DENTAL-${Date.now().toString().slice(-6)}`,
          subtotal_amount: treatmentPlan.totalCost || 0,
          tax_amount: 0,
          total_amount: treatmentPlan.totalCost || 0,
          metadata: {
            ...docMetadata,
            actual_type: 'work_order',
          },
        })
        .select('id')
        .single();
      newDoc = retry.data;
      docErr = retry.error;
    }

    if (docErr || !newDoc) {
      console.error('[createTreatmentKanbanFromChartAction]:', docErr);
      return { success: false, error: docErr?.message || 'Error al crear la orden de trabajo.' };
    }

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

export interface DentalEvolutionEntry {
  id: string;
  patientId: string;
  note: string;
  teethInvolved?: string[];
  doctorName?: string;
  createdAt: string;
  extraConsumables?: Array<{ itemId: string; name: string; quantity: number; cost?: number }>;
  prescription?: {
    medications: Array<{ drug: string; dosage: string; frequency: string; duration: string }>;
    indications?: string;
  };
}

/**
 * Guarda una nota médica de evolución en la historia clínica del paciente.
 * Si se especificaron insumos descartables especiales consumidos, descuenta su stock físico en `items`.
 */
export async function saveDentalEvolutionAction(
  patientId: string,
  payload: Omit<DentalEvolutionEntry, 'id' | 'createdAt'>,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; evolutionId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) {
      return { success: false, error: 'ID de paciente no válido.' };
    }

    const evolutionData: DentalEvolutionEntry = {
      id: `evo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId,
      note: payload.note,
      teethInvolved: payload.teethInvolved || [],
      doctorName: payload.doctorName || actor.email,
      createdAt: new Date().toISOString(),
      extraConsumables: payload.extraConsumables || [],
      prescription: payload.prescription,
    };

    // Guardar en entity_records como registro de evolución
    const { data: record, error: insertErr } = await supabaseAdmin
      .from('entity_records')
      .insert({
        tenant_id: tenantId,
        entity_id: patientId,
        record_type: 'dental_evolution',
        title: `Evolución Dental — ${new Date().toLocaleDateString('es-VE')}`,
        notes: payload.note,
        metadata: evolutionData,
      })
      .select('id')
      .single();

    if (insertErr || !record) {
      return { success: false, error: insertErr?.message || 'Error al guardar la evolución médica.' };
    }

    // Descontar inventario de insumos especiales consumidos (si aplica)
    if (payload.extraConsumables && payload.extraConsumables.length > 0) {
      for (const item of payload.extraConsumables) {
        if (isValidUUID(item.itemId)) {
          const { data: currentItem } = await supabaseAdmin
            .from('items')
            .select('*')
            .eq('id', item.itemId)
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (currentItem) {
            const currentQty = Number(currentItem.stock ?? currentItem.stock_quantity ?? currentItem.quantity ?? 0);
            const newQty = Math.max(0, currentQty - item.quantity);
            let updateResult = await supabaseAdmin
              .from('items')
              .update({ stock: newQty })
              .eq('id', item.itemId)
              .eq('tenant_id', tenantId);

            if (updateResult.error && (updateResult.error.message.includes('stock') || updateResult.error.message.includes('column'))) {
              await supabaseAdmin
                .from('items')
                .update({ stock_quantity: newQty })
                .eq('id', item.itemId)
                .eq('tenant_id', tenantId);
            }
          }
        }
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'dental_evolution.saved',
      target_type: 'entity',
      target_id: patientId,
      metadata: { evolutionId: record.id, teethInvolved: payload.teethInvolved },
    });

    return { success: true, evolutionId: record.id };
  } catch (err: unknown) {
    console.error('[saveDentalEvolutionAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene la lista cronológica de evoluciones médicas de un paciente.
 */
export async function getDentalEvolutionsAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; evolutions?: DentalEvolutionEntry[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) {
      return { success: false, error: 'ID de paciente no válido.' };
    }

    const { data: records, error } = await supabaseAdmin
      .from('entity_records')
      .select('id, metadata, created_at')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_evolution')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const evolutions = (records || []).map((r) => {
      const meta = (r.metadata || {}) as DentalEvolutionEntry;
      return {
        ...meta,
        id: r.id,
        createdAt: meta.createdAt || r.created_at,
      };
    });

    return { success: true, evolutions };
  } catch (err: unknown) {
    console.error('[getDentalEvolutionsAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Despacha una orden de consulta dental hacia la Caja POS (Recepción) para que el asistente cobre,
 * liberando inmediatamente al odontólogo en el sillón para pasar al siguiente paciente.
 */
export async function sendDentalOrderToCashierAction(
  patientId: string,
  patientName: string,
  itemsToCharge: Array<{
    id?: string;
    toothNum: string;
    procedureName: string;
    cost: number;
    category?: string;
    notes?: string;
  }>,
  amountToCharge: number,
  tenantId: string,
  actor: ActionActor,
  doctorInfo?: { doctorId?: string; doctorName?: string; doctorCommissionPercent?: number }
): Promise<{ success: boolean; documentId?: string; documentNumber?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const docNumber = `ORD-DENT-${Date.now().toString().slice(-6)}`;
    const safeEntityId = isValidUUID(patientId) && !isTemporaryId(patientId) ? patientId : null;

    const docMetadata = {
      title: `Consulta Odontológica — ${patientName}`,
      source: 'dental_consultation',
      pipeline: 'dental',
      payment_status: 'pending_cashier',
      doctor: doctorInfo ? {
        id: doctorInfo.doctorId,
        name: doctorInfo.doctorName,
        commissionPercent: doctorInfo.doctorCommissionPercent || 50,
        estimatedHonorariumUSD: Number(((amountToCharge * (doctorInfo.doctorCommissionPercent || 50)) / 100).toFixed(2))
      } : undefined,
      items: itemsToCharge,
      suggested_amount: amountToCharge,
      created_by_doctor: actor.email,
    };

    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeEntityId,
        type: 'quotation',
        status: 'draft',
        document_number: docNumber,
        subtotal_amount: amountToCharge,
        tax_amount: 0,
        total_amount: amountToCharge,
        metadata: docMetadata,
      })
      .select('id, document_number')
      .single();

    if (docErr || !newDoc) {
      console.error('[sendDentalOrderToCashierAction]:', docErr);
      return { success: false, error: docErr?.message || 'Error al despachar orden a caja.' };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'dental_order.dispatched_to_cashier',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { patientId, patientName, amount: amountToCharge },
    });

    return { success: true, documentId: newDoc.id, documentNumber: newDoc.document_number };
  } catch (err: unknown) {
    console.error('[sendDentalOrderToCashierAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────
// ESPECIALIDADES CLÍNICAS: ORTODONCIA, ENDODONCIA Y PERIODONCIA
// ─────────────────────────────────────────────────────────────

/**
 * Guarda o actualiza el caso y seguimiento de ortodoncia de un paciente
 */
export async function saveOrthodonticCaseAction(
  patientId: string,
  orthoCase: OrthodonticCase,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'odontologia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) {
      return { success: false, error: 'Paciente no válido en base de datos.' };
    }

    const { data: existing } = await supabaseAdmin
      .from('entity_records')
      .select('id')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_orthodontics')
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabaseAdmin
        .from('entity_records')
        .update({ metadata: orthoCase as any })
        .eq('id', existing.id)
        .eq('tenant_id', tenantId);

      if (error) return { success: false, error: error.message };
      return { success: true, recordId: existing.id };
    } else {
      const { data, error } = await supabaseAdmin
        .from('entity_records')
        .insert({
          entity_id: patientId,
          tenant_id: tenantId,
          record_type: 'dental_orthodontics',
          title: 'Expediente de Ortodoncia & Brackets',
          content: `Caso de ortodoncia: Técnica ${orthoCase.technique}.`,
          metadata: orthoCase as any,
        })
        .select('id')
        .single();

      if (error || !data) return { success: false, error: error?.message || 'Error al crear expediente de ortodoncia.' };
      return { success: true, recordId: data.id };
    }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene el caso de ortodoncia activo de un paciente
 */
export async function getOrthodonticCaseAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; orthoCase?: OrthodonticCase; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) return { success: true, orthoCase: undefined };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_orthodontics')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, orthoCase: data?.metadata as unknown as OrthodonticCase };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda un registro de conductometría / endodoncia
 */
export async function saveEndodonticRecordAction(
  patientId: string,
  record: EndodonticRecord,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'odontologia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .insert({
        entity_id: patientId,
        tenant_id: tenantId,
        record_type: 'dental_endodontics',
        title: `Endodoncia Pieza ${record.toothNumber}`,
        content: `Conductometría y biomecánica en pieza ${record.toothNumber}`,
        metadata: record as any,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Error al guardar endodoncia.' };
    return { success: true, recordId: data.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene los registros de endodoncia de un paciente
 */
export async function getEndodonticRecordsAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; records?: EndodonticRecord[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) return { success: true, records: [] };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_endodontics')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    const list = (data || []).map(d => d.metadata as unknown as EndodonticRecord);
    return { success: true, records: list };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda un registro periodontal (Periodontograma simplificado)
 */
export async function savePeriodonticRecordAction(
  patientId: string,
  record: PeriodonticRecord,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'odontologia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .insert({
        entity_id: patientId,
        tenant_id: tenantId,
        record_type: 'dental_periodontics',
        title: `Control Periodontal ${new Date(record.date).toLocaleDateString()}`,
        content: `BOP: ${record.bleedingOnProbingPercent}%, Bolsas >=4mm: ${record.deepPocketsCount}`,
        metadata: record as any,
      })
      .select('id')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Error al guardar periodoncia.' };
    return { success: true, recordId: data.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene los controles periodontales de un paciente
 */
export async function getPeriodonticRecordsAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; records?: PeriodonticRecord[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) return { success: true, records: [] };

    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .eq('record_type', 'dental_periodontics')
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    const list = (data || []).map(d => d.metadata as unknown as PeriodonticRecord);
    return { success: true, records: list };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}


