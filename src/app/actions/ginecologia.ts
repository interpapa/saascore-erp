'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

export interface GinecoObstetricProfile {
  // Fórmula Obstétrica G-P-C-A + E
  gestas: number;
  partos: number;
  cesareas: number;
  abortos: number;
  ectopicos: number;
  hijosVivos: number;

  // Antecedentes Ginecológicos
  menarquia?: number; // edad primera menstruación
  ritmoMenstrual?: string; // ej: "28 x 4"
  dismenorrea?: boolean;
  fum?: string; // Fecha de Última Menstruación (YYYY-MM-DD)
  ciclosRegulares?: boolean;
  metodoAnticonceptivo?: string;
  tiempoUsoAnticonceptivo?: string;
  inicioVidaSexual?: number; // edad
  parejasSexuales?: number;
  ultimaCitologiaFecha?: string;
  ultimaCitologiaResultado?: string;
  ultimaMamografiaFecha?: string;
  antecedenteVPH?: boolean;
  vacunaVPH?: boolean;
  alergias?: string;
  patologiasCronicas?: string;
}

export interface GinecoEncounterPayload {
  patientId: string;
  doctorId?: string;
  doctorName: string;
  doctorLicense?: string;
  doctorCommissionPercent?: number;

  // Signos vitales maternos / triaje
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    weightKg?: number;
    heightCm?: number;
    temperature?: number;
    respiratoryRate?: number;
  };

  // Datos específicos del encuentro
  profileUpdates?: Partial<GinecoObstetricProfile>;

  // Tipo de atención
  encounterType: 'prenatal' | 'ginecologia' | 'citologia_colposcopia' | 'procedimiento';
  chiefComplaint: string;

  // Datos obstétricos (si aplica)
  obstetricExam?: {
    fumUsed: string;
    gestationalWeeks: number;
    gestationalDays: number;
    fppDate: string;
    uterineHeightCm?: number;
    fetalHeartRateBpm?: number;
    fetalMovements?: 'presentes' | 'disminuidos' | 'ausentes';
    presentation?: 'cefalica' | 'podalica' | 'transversa';
    edema?: 'ausente' | 'leve' | 'moderado' | 'severo';
    ultrasoundFindings?: string;
  };

  // Datos ginecológicos / colposcopia (si aplica)
  gynecologicExam?: {
    inspectionVulva?: string;
    speculoscopyVagina?: string;
    speculoscopyCervix?: string;
    schillerTest?: 'positivo_caoba' | 'negativo_yodonegativo' | 'no_realizado';
    aceticAcidTest?: 'acetoblanco_tenue' | 'acetoblanco_denso' | 'mosaico' | 'punteado' | 'normal';
    bethesdaPapClassification?: string;
    biopsyTaken?: boolean;
    biopsyLocation?: string;
    bimanualUterus?: string;
    bimanualAdnexa?: string;
  };

  // Evolución SOAP
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    cie10Code?: string;
    cie10Description?: string;
    plan: string;
  };

  // Prescripción y récipe médico
  prescription?: {
    medications: string;
    instructions: string;
    labOrders?: string[];
  };

  // Procedimientos seleccionados durante la consulta
  selectedProcedures?: Array<{
    id: string;
    code: string;
    name: string;
    price: number;
    sessionsRequired?: number;
    stages?: any[];
  }>;
}

export interface GinecoWorkOrderStep {
  id: string;
  title: string;
  order: number;
  completed: boolean;
  completed_at?: string | null;
}

export interface PatientGinecoWorkOrder {
  id: string;
  documentNumber: string;
  title: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  steps: GinecoWorkOrderStep[];
  priority: string;
  createdAt: string;
  notes?: string;
}

/**
 * Obtiene el expediente gineco-obstétrico de un paciente:
 * perfil reproductivo, fórmula obstétrica, signos vitales y consultas previas.
 */
export async function getGinecoPatientRecordAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{
  success: boolean;
  profile?: GinecoObstetricProfile;
  encounters?: any[];
  error?: string;
}> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'ginecologia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) {
      return { success: true, profile: undefined, encounters: [] };
    }

    // 1. Obtener la entidad paciente
    const { data: patient, error: pErr } = await supabaseAdmin
      .from('entities')
      .select('id, name, metadata')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (pErr || !patient) {
      return { success: false, error: pErr?.message || 'Paciente no encontrado.' };
    }

    const meta = (patient.metadata || {}) as Record<string, any>;
    const profile: GinecoObstetricProfile = meta.gineco_profile || {
      gestas: 0,
      partos: 0,
      cesareas: 0,
      abortos: 0,
      ectopicos: 0,
      hijosVivos: 0,
      fum: meta.fum || '',
      alergias: meta.allergies || meta.medical_profile?.allergies || '',
      patologiasCronicas: meta.conditions || meta.medical_profile?.chronicConditions || '',
    };

    // 2. Obtener consultas ginecológicas previas desde entity_records
    const { data: records, error: rErr } = await supabaseAdmin
      .from('entity_records')
      .select('id, record_type, title, body, metadata, created_at')
      .eq('entity_id', patientId)
      .eq('tenant_id', tenantId)
      .in('record_type', ['gineco_encounter', 'clinical_encounter'])
      .order('created_at', { ascending: false })
      .limit(30);

    const encounters = (records || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      content: r.body || r.content || '',
      createdAt: r.created_at,
      metadata: r.metadata,
    }));

    return { success: true, profile, encounters };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Guarda una consulta médica ginecológica u obstétrica en el historial de la paciente.
 */
export async function saveGinecoEncounterAction(
  tenantId: string,
  payload: GinecoEncounterPayload,
  actor: ActionActor
): Promise<{ success: boolean; encounterId?: string; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const moduleCheck = await assertModuleEnabled(tenantId, 'ginecologia');
    if (!moduleCheck.authorized) return { success: false, error: moduleCheck.error };

    const { patientId } = payload;
    if (!isValidUUID(patientId) || isTemporaryId(patientId)) {
      return { success: false, error: 'Debe seleccionar o guardar la paciente antes de registrar la consulta.' };
    }

    // 1. Obtener la paciente para actualizar sus antecedentes y perfil gineco-obstétrico
    const { data: patient, error: pErr } = await supabaseAdmin
      .from('entities')
      .select('id, name, metadata')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (pErr || !patient) {
      return { success: false, error: pErr?.message || 'Paciente no encontrada.' };
    }

    const currentMeta = (patient.metadata || {}) as Record<string, any>;
    const currentGinecoProfile: GinecoObstetricProfile = currentMeta.gineco_profile || {
      gestas: 0,
      partos: 0,
      cesareas: 0,
      abortos: 0,
      ectopicos: 0,
      hijosVivos: 0,
    };

    const updatedProfile: GinecoObstetricProfile = {
      ...currentGinecoProfile,
      ...(payload.profileUpdates || {}),
    };

    if (payload.obstetricExam?.fumUsed) {
      updatedProfile.fum = payload.obstetricExam.fumUsed;
    }

    const nowIso = new Date().toISOString();
    const vitalsHistory = Array.isArray(currentMeta.vitals_history) ? [...currentMeta.vitals_history] : [];
    if (payload.vitals && Object.values(payload.vitals).some((v) => v !== undefined && v !== '')) {
      vitalsHistory.unshift({
        date: nowIso,
        vitals: payload.vitals,
        recordedBy: payload.doctorName,
        source: 'ginecologia',
      });
    }

    // Guardar en entities.metadata
    const updatedMeta = {
      ...currentMeta,
      gineco_profile: updatedProfile,
      has_history: true,
      has_clinical_history: true,
      vitals_history: vitalsHistory.slice(0, 30),
      last_gineco_visit: nowIso,
    };

    await supabaseAdmin
      .from('entities')
      .update({ metadata: updatedMeta })
      .eq('id', patientId)
      .eq('tenant_id', tenantId);

    // 2. Insertar registro de consulta en entity_records
    const titleType =
      payload.encounterType === 'prenatal'
        ? `Control Prenatal (${payload.obstetricExam?.gestationalWeeks || 0} sem)`
        : payload.encounterType === 'citologia_colposcopia'
        ? 'Citología & Colposcopia'
        : payload.encounterType === 'procedimiento'
        ? 'Procedimiento Ginecológico'
        : 'Consulta Ginecológica';

    const { data: record, error: recErr } = await supabaseAdmin
      .from('entity_records')
      .insert({
        tenant_id: tenantId,
        entity_id: patientId,
        record_type: 'gineco_encounter',
        title: `${titleType} — ${new Date().toLocaleDateString()}`,
        body: payload.soap.assessment || payload.chiefComplaint || 'Consulta Gineco-Obstétrica',
        metadata: {
          ...payload,
          doctorName: payload.doctorName,
          doctorId: payload.doctorId,
          date: nowIso,
          source_module: 'ginecologia',
        },
      })
      .select('id')
      .single();

    if (recErr) {
      return { success: false, error: recErr.message };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'ginecologia.encounter_saved',
      target_type: 'entity_record',
      target_id: record.id,
      metadata: { patientId, patientName: patient.name, encounterType: payload.encounterType },
    });

    return { success: true, encounterId: record.id };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Despacha la orden de procedimientos y consulta gineco-obstétrica directamente a la Caja POS.
 */
export async function sendGinecoOrderToCashierAction(
  patientId: string,
  patientName: string,
  itemsToCharge: Array<{
    id?: string;
    code?: string;
    name: string;
    cost: number;
    category?: string;
    notes?: string;
    stages?: any[];
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

    const moduleCheck = await assertModuleEnabled(tenantId, 'ginecologia');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error };
    }

    const docNumber = `ORD-GIN-${Date.now().toString().slice(-6)}`;
    const safeEntityId = isValidUUID(patientId) && !isTemporaryId(patientId) ? patientId : null;

    // Convertir a líneas del carrito de Caja POS
    const cartLines = itemsToCharge.map((item, idx) => ({
      itemId: item.id || `custom-gineco-${idx + 1}`,
      name: item.name,
      quantity: 1,
      unitPrice: Number(item.cost || 0),
      discount: 0,
      taxRate: 0,
      subtotal: Number(item.cost || 0),
      total: Number(item.cost || 0),
      type: 'service',
      doctorCommissionPercent: doctorInfo?.doctorCommissionPercent || 0,
      doctorId: doctorInfo?.doctorId,
      doctorName: doctorInfo?.doctorName,
    }));

    // Si algún procedimiento tiene etapas multisesión, generar steps para seguimiento en Kanban
    const steps: GinecoWorkOrderStep[] = [];
    let stepOrder = 1;
    for (const it of itemsToCharge) {
      if (Array.isArray(it.stages) && it.stages.length > 0) {
        for (const stg of it.stages) {
          steps.push({
            id: `step-gin-${stepOrder}-${Math.random().toString(36).slice(2, 6)}`,
            title: `[${it.name}] ${stg.title}`,
            order: stepOrder++,
            completed: false,
          });
        }
      }
    }

    const docMetadata = {
      source: 'ginecologia',
      source_module: 'ginecologia',
      specialty_id: 'ginecologia',
      specialty_name: 'Ginecología & Obstetricia',
      patient_id: patientId,
      patient_name: patientName,
      title: `Consulta / Procedimientos — ${patientName}`,
      doctor_id: doctorInfo?.doctorId,
      doctor_name: doctorInfo?.doctorName || 'Ginecólogo/a Tratante',
      doctor_commission_percent: doctorInfo?.doctorCommissionPercent || 0,
      items: itemsToCharge,
      cart_lines: cartLines,
      steps,
      payment_status: 'pending_cashier',
      created_by_doctor: doctorInfo?.doctorName,
      issued_at: new Date().toISOString(),
    };

    let { data: newDoc, error: docErr } = await supabaseAdmin
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

    if (docErr && (docErr.message.includes('type') || docErr.message.includes('check') || docErr.message.includes('constraint'))) {
      const fallback = await supabaseAdmin
        .from('documents')
        .insert({
          tenant_id: tenantId,
          entity_id: safeEntityId,
          type: 'quote',
          status: 'draft',
          document_number: docNumber,
          subtotal_amount: amountToCharge,
          tax_amount: 0,
          total_amount: amountToCharge,
          metadata: { ...docMetadata, actual_type: 'quotation' },
        })
        .select('id, document_number')
        .single();

      newDoc = fallback.data;
      docErr = fallback.error;
    }

    if (docErr || !newDoc) {
      console.error('[sendGinecoOrderToCashierAction]:', docErr);
      return { success: false, error: docErr?.message || 'Error al despachar orden a caja.' };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'ginecologia.dispatched_to_cashier',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: { patientId, patientName, amount: amountToCharge, doctor: doctorInfo?.doctorName },
    });

    return { success: true, documentId: newDoc.id, documentNumber: newDoc.document_number };
  } catch (err: unknown) {
    console.error('[sendGinecoOrderToCashierAction]:', err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Obtiene las órdenes de trabajo y seguimiento gineco-obstétrico de una paciente.
 */
export async function getPatientGinecoWorkOrdersAction(
  patientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; workOrders?: PatientGinecoWorkOrder[]; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(patientId) || isTemporaryId(patientId)) return { success: true, workOrders: [] };

    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select('id, document_number, status, total_amount, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('entity_id', patientId)
      .in('type', ['work_order', 'quotation', 'quote'])
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };

    const orders: PatientGinecoWorkOrder[] = [];
    for (const d of docs || []) {
      const meta = (d.metadata || {}) as Record<string, any>;
      const isGineco =
        meta.source === 'ginecologia' ||
        meta.source_module === 'ginecologia' ||
        meta.specialty_id === 'ginecologia';

      if (isGineco) {
        const steps: GinecoWorkOrderStep[] = Array.isArray(meta.steps) ? meta.steps : [];
        const totalAmount = Number(d.total_amount || meta.total_amount || 0);
        const paidAmount = Number(meta.paid_amount || 0);
        const balanceDue = Math.max(0, totalAmount - paidAmount);

        orders.push({
          id: d.id,
          documentNumber: d.document_number,
          title: (meta.title as string) || 'Procedimiento Gineco-Obstétrico',
          status: d.status || 'pendiente',
          totalAmount,
          paidAmount,
          balanceDue,
          steps,
          priority: (meta.priority as string) || 'medium',
          createdAt: d.created_at,
          notes: (meta.notes as string) || '',
        });
      }
    }

    return { success: true, workOrders: orders };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Actualiza el estado de una etapa de procedimiento o seguimiento ginecológico.
 */
export async function updateGinecoWorkOrderStepAction(
  documentId: string,
  stepId: string,
  completed: boolean,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  'use server';
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    if (!isValidUUID(documentId)) return { success: false, error: 'ID de orden no válido.' };

    const { data: doc, error: fetchErr } = await supabaseAdmin
      .from('documents')
      .select('id, metadata, status')
      .eq('id', documentId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !doc) return { success: false, error: 'Orden no encontrada.' };

    const meta = (doc.metadata || {}) as Record<string, any>;
    const steps: GinecoWorkOrderStep[] = Array.isArray(meta.steps) ? [...meta.steps] : [];
    const stepIdx = steps.findIndex((s) => s.id === stepId);

    if (stepIdx === -1) return { success: false, error: 'Etapa no encontrada en la orden.' };

    steps[stepIdx] = {
      ...steps[stepIdx],
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    };

    const allCompleted = steps.every((s) => s.completed);
    const newStatus = allCompleted ? 'completado' : 'en_proceso';

    const { error: updErr } = await supabaseAdmin
      .from('documents')
      .update({
        metadata: { ...meta, steps },
        status: newStatus,
      })
      .eq('id', documentId)
      .eq('tenant_id', tenantId);

    if (updErr) return { success: false, error: updErr.message };

    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
