'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import { ActionActor } from './entities';

export interface ClinicalMedicalProfile {
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  surgicalHistory?: string;
  familyHistory?: string;
  birthDate?: string;
  biologicalSex?: 'M' | 'F' | 'Otro';
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface ClinicalVitalsEntry {
  id?: string;
  recordedAt: string;
  specialtyId?: string;
  doctorName?: string;
  weightKg?: number;
  heightCm?: number;
  bmi?: number;
  systolicBP?: number;
  diastolicBP?: number;
  map?: number;
  heartRateBpm?: number;
  respiratoryRateRpm?: number;
  temperatureC?: number;
  spo2Percent?: number;
  glucoseMgDl?: number;
  headCircumferenceCm?: number;
  painScaleEva?: number;
  [key: string]: any;
}

export interface ClinicalEncounterRecord {
  id: string;
  createdAt: string;
  specialtyId: string;
  doctorId?: string;
  doctorName: string;
  doctorLicense?: string;
  vitals?: ClinicalVitalsEntry;
  chiefComplaint: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    cie10Code?: string;
    plan: string;
  };
  prescription?: {
    medications: string;
    instructions: string;
    labOrders?: string;
  };
  selectedProcedures?: Array<{
    id: string;
    code: string;
    name: string;
    price: number;
    sessionsRequired?: number;
    stages?: any[];
  }>;
}

/**
 * Obtiene el expediente clínico integral de un paciente desde `entities.metadata`,
 * devolviendo `medical_profile`, `vitals_history`, `specialties_state` y `clinical_encounters`.
 */
export async function getClinicalPatientRecordAction(
  tenantId: string,
  patientId: string,
  actor: ActionActor
): Promise<{
  success: boolean;
  patient?: {
    id: string;
    name: string;
    tax_id?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  medical_profile: ClinicalMedicalProfile;
  vitals_history: ClinicalVitalsEntry[];
  specialties_state: Record<string, any>;
  clinical_encounters: ClinicalEncounterRecord[];
  record?: {
    medical_profile: ClinicalMedicalProfile;
    vitals_history: ClinicalVitalsEntry[];
    specialties_state: Record<string, any>;
    clinical_encounters: ClinicalEncounterRecord[];
  };
  error?: string;
}> {
  try {
    const emptyRecord = {
      medical_profile: {},
      vitals_history: [],
      specialties_state: {},
      clinical_encounters: [],
    };

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return {
        success: false,
        ...emptyRecord,
        error: securityCheck.error || 'Acceso multi-tenant denegado.',
      };
    }

    if (!patientId || !isValidUUID(patientId) || isTemporaryId(patientId)) {
      return {
        success: true,
        ...emptyRecord,
        record: emptyRecord,
      };
    }

    const { data: entity, error } = await supabaseAdmin
      .from('entities')
      .select('id, name, tax_id, phone, email, address, metadata')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        ...emptyRecord,
        error: error.message,
      };
    }

    if (!entity) {
      return {
        success: false,
        ...emptyRecord,
        error: 'Paciente no encontrado en la empresa actual.',
      };
    }

    const meta = (entity.metadata || {}) as Record<string, any>;

    const medical_profile: ClinicalMedicalProfile =
      meta.medical_profile && typeof meta.medical_profile === 'object'
        ? meta.medical_profile
        : {};

    const vitals_history: ClinicalVitalsEntry[] = Array.isArray(meta.vitals_history)
      ? meta.vitals_history
      : [];

    const specialties_state: Record<string, any> =
      meta.specialties_state && typeof meta.specialties_state === 'object'
        ? meta.specialties_state
        : {};

    const clinical_encounters: ClinicalEncounterRecord[] = Array.isArray(meta.clinical_encounters)
      ? meta.clinical_encounters
      : [];

    return {
      success: true,
      patient: {
        id: entity.id,
        name: entity.name,
        tax_id: entity.tax_id,
        phone: entity.phone,
        email: entity.email,
        address: entity.address,
      },
      medical_profile,
      vitals_history,
      specialties_state,
      clinical_encounters,
      record: {
        medical_profile,
        vitals_history,
        specialties_state,
        clinical_encounters,
      },
    };
  } catch (err: unknown) {
    console.error('[getClinicalPatientRecordAction]:', err);
    return {
      success: false,
      medical_profile: {},
      vitals_history: [],
      specialties_state: {},
      clinical_encounters: [],
      error: (err as Error).message,
    };
  }
}

/**
 * Guarda una nueva consulta médica multi-especialidad (Encuentro Clínico SOAP + Récipe + Signos Vitales)
 * actualizando `entities.metadata` del paciente.
 */
export async function saveClinicalEncounterAction(
  tenantId: string,
  payload: {
    patientId: string;
    specialtyId: string;
    doctorId?: string;
    doctorName: string;
    doctorLicense?: string;
    vitals?: any;
    medicalProfileUpdates?: any;
    specialtyStateUpdates?: any;
    chiefComplaint: string;
    soap: {
      subjective: string;
      objective: string;
      assessment: string;
      cie10Code?: string;
      plan: string;
    };
    prescription?: {
      medications: string;
      instructions: string;
      labOrders?: string;
    };
    selectedProcedures?: Array<{
      id: string;
      code: string;
      name: string;
      price: number;
      sessionsRequired?: number;
      stages?: any[];
    }>;
  },
  actor: ActionActor
): Promise<{
  success: boolean;
  encounter?: ClinicalEncounterRecord;
  medical_profile?: ClinicalMedicalProfile;
  vitals_history?: ClinicalVitalsEntry[];
  specialties_state?: Record<string, any>;
  clinical_encounters?: ClinicalEncounterRecord[];
  error?: string;
}> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return {
        success: false,
        error: securityCheck.error || 'Acceso multi-tenant denegado.',
      };
    }

    if (!payload.patientId || !isValidUUID(payload.patientId) || isTemporaryId(payload.patientId)) {
      return {
        success: false,
        error: 'ID de paciente inválido o temporal. Seleccione un paciente registrado.',
      };
    }

    const { data: entity, error: fetchErr } = await supabaseAdmin
      .from('entities')
      .select('id, name, metadata')
      .eq('id', payload.patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr || !entity) {
      return {
        success: false,
        error: fetchErr?.message || 'No se encontró el expediente del paciente.',
      };
    }

    const nowIso = new Date().toISOString();
    const currentMeta = (entity.metadata || {}) as Record<string, any>;

    // 1. Actualizar perfil médico (alergias, antecedentes, grupo sanguíneo, etc.)
    const currentProfile: ClinicalMedicalProfile =
      currentMeta.medical_profile && typeof currentMeta.medical_profile === 'object'
        ? currentMeta.medical_profile
        : {};

    const updatedMedicalProfile: ClinicalMedicalProfile = {
      ...currentProfile,
      ...(payload.medicalProfileUpdates || {}),
      updatedAt: nowIso,
    };

    // 2. Agregar signos vitales al historial si fueron suministrados
    const currentVitalsHistory: ClinicalVitalsEntry[] = Array.isArray(currentMeta.vitals_history)
      ? currentMeta.vitals_history
      : [];

    let newVitalsEntry: ClinicalVitalsEntry | undefined;
    const updatedVitalsHistory = [...currentVitalsHistory];

    if (payload.vitals && typeof payload.vitals === 'object' && Object.keys(payload.vitals).length > 0) {
      const createdVitals: ClinicalVitalsEntry = {
        ...payload.vitals,
        id: `vit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        recordedAt: nowIso,
        specialtyId: payload.specialtyId,
        doctorName: payload.doctorName,
      };
      newVitalsEntry = createdVitals;
      updatedVitalsHistory.unshift(createdVitals);
    }

    // 3. Actualizar el estado específico de la especialidad (ej. FUR obstétrica, odontograma/refracción, mapa dermatológico)
    const currentSpecialtiesState: Record<string, any> =
      currentMeta.specialties_state && typeof currentMeta.specialties_state === 'object'
        ? currentMeta.specialties_state
        : {};

    const updatedSpecialtiesState: Record<string, any> = {
      ...currentSpecialtiesState,
    };

    if (payload.specialtyStateUpdates && typeof payload.specialtyStateUpdates === 'object') {
      updatedSpecialtiesState[payload.specialtyId] = {
        ...(currentSpecialtiesState[payload.specialtyId] || {}),
        ...payload.specialtyStateUpdates,
        updatedAt: nowIso,
      };
    }

    // 4. Construir y añadir el nuevo encuentro clínico a `clinical_encounters`
    const currentEncounters: ClinicalEncounterRecord[] = Array.isArray(currentMeta.clinical_encounters)
      ? currentMeta.clinical_encounters
      : [];

    const newEncounter: ClinicalEncounterRecord = {
      id: `enc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: nowIso,
      specialtyId: payload.specialtyId,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName || actor.email,
      doctorLicense: payload.doctorLicense,
      vitals: newVitalsEntry,
      chiefComplaint: payload.chiefComplaint,
      soap: {
        subjective: payload.soap?.subjective || '',
        objective: payload.soap?.objective || '',
        assessment: payload.soap?.assessment || '',
        cie10Code: payload.soap?.cie10Code || '',
        plan: payload.soap?.plan || '',
      },
      prescription: payload.prescription,
      selectedProcedures: payload.selectedProcedures || [],
    };

    const updatedEncounters: ClinicalEncounterRecord[] = [newEncounter, ...currentEncounters];

    const updatedMetadata = {
      ...currentMeta,
      medical_profile: updatedMedicalProfile,
      vitals_history: updatedVitalsHistory,
      specialties_state: updatedSpecialtiesState,
      clinical_encounters: updatedEncounters,
      last_clinical_visit: nowIso,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entities')
      .update({ metadata: updatedMetadata })
      .eq('id', payload.patientId)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      return {
        success: false,
        error: updateErr.message,
      };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'clinical_encounter.saved',
      target_type: 'entity',
      target_id: payload.patientId,
      metadata: {
        encounterId: newEncounter.id,
        specialtyId: payload.specialtyId,
        cie10Code: payload.soap?.cie10Code,
        doctorName: payload.doctorName,
      },
    });

    return {
      success: true,
      encounter: newEncounter,
      medical_profile: updatedMedicalProfile,
      vitals_history: updatedVitalsHistory,
      specialties_state: updatedSpecialtiesState,
      clinical_encounters: updatedEncounters,
    };
  } catch (err: unknown) {
    console.error('[saveClinicalEncounterAction]:', err);
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Despacha una orden médica multi-especialidad hacia Caja POS (`type: 'quotation'`, `status: 'draft'`)
 * e inyecta los pasos clínicos (`steps` + `kanban_status: 'pending'`) para que también aparezca en Kanban
 * cuando incluye paquetes de rehabilitación o procedimientos multisesión.
 */
export async function dispatchClinicalOrderToPOSAction(
  tenantId: string,
  payload: {
    patientId: string;
    patientName: string;
    specialtyId: string;
    specialtyName: string;
    doctorId?: string;
    doctorName: string;
    items: Array<{
      id: string;
      code: string;
      name: string;
      price: number;
      quantity: number;
      sessionsRequired?: number;
      stages?: any[];
    }>;
    notes?: string;
  },
  actor: ActionActor
): Promise<{
  success: boolean;
  documentId?: string;
  documentNumber?: string;
  totalAmount?: number;
  error?: string;
}> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return {
        success: false,
        error: securityCheck.error || 'Acceso multi-tenant denegado.',
      };
    }

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return {
        success: false,
        error: 'Debe seleccionar al menos un procedimiento o servicio médico para enviar a Caja POS.',
      };
    }

    const safeEntityId =
      payload.patientId && isValidUUID(payload.patientId) && !isTemporaryId(payload.patientId)
        ? payload.patientId
        : null;

    const subtotalAmount = Number(
      payload.items
        .reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 1), 0)
        .toFixed(2)
    );

    const cartLines = payload.items.map((item) => {
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.price || 0);
      return {
        id: item.id,
        item_id: isValidUUID(item.id) ? item.id : null,
        code: item.code,
        name: item.name,
        description: `[${item.code}] ${item.name}`,
        price: unitPrice,
        unit_price: unitPrice,
        quantity: qty,
        subtotal: Number((unitPrice * qty).toFixed(2)),
        sessionsRequired: item.sessionsRequired || 1,
        stages: item.stages || [],
      };
    });

    // Construir etapas (steps) para seguimiento en tablero Kanban de Órdenes Clínicas
    const steps: Array<{
      id: string;
      title: string;
      order: number;
      sessionNumber?: number;
      completed: boolean;
      completed_at: string | null;
    }> = [];

    let stepOrder = 1;
    for (const item of payload.items) {
      if (Array.isArray(item.stages) && item.stages.length > 0) {
        for (const stg of item.stages) {
          steps.push({
            id: `${item.id}-${stg.id || stepOrder}-${Math.random().toString(36).slice(2, 5)}`,
            title: `${item.name}: ${stg.title}`,
            order: stepOrder++,
            sessionNumber: stg.sessionNumber || 1,
            completed: false,
            completed_at: null,
          });
        }
      } else {
        steps.push({
          id: `step-med-${stepOrder}-${Math.random().toString(36).slice(2, 6)}`,
          title: `${item.code ? `[${item.code}] ` : ''}${item.name}`,
          order: stepOrder++,
          sessionNumber: 1,
          completed: false,
          completed_at: null,
        });
      }
    }

    const docNumber = `CLI-${Date.now().toString().slice(-6)}`;
    const nowIso = new Date().toISOString();

    const docMetadata = {
      title: `Clínica (${payload.specialtyName}) — ${payload.patientName}`,
      source: 'clinica',
      pipeline: 'clinica',
      payment_status: 'pending_cashier',
      specialty_id: payload.specialtyId,
      specialty_name: payload.specialtyName,
      doctor_id: payload.doctorId,
      doctor_name: payload.doctorName,
      patient_name: payload.patientName,
      cart_lines: cartLines,
      items: cartLines.map((line) => ({
        id: line.id,
        code: line.code,
        procedureName: line.name,
        name: line.name,
        cost: line.price,
        price: line.price,
        quantity: line.quantity,
      })),
      kanban_status: 'pending',
      process_mode: 'step_by_step',
      steps,
      total_amount: subtotalAmount,
      paid_amount: 0,
      notes: payload.notes || '',
      created_by: actor.email,
      issue_date: nowIso,
    };

    const { data: newDoc, error: docErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        entity_id: safeEntityId,
        type: 'quotation',
        status: 'draft',
        document_number: docNumber,
        subtotal_amount: subtotalAmount,
        tax_amount: 0,
        total_amount: subtotalAmount,
        metadata: docMetadata,
      })
      .select('id, document_number')
      .single();

    if (docErr || !newDoc) {
      console.error('[dispatchClinicalOrderToPOSAction]:', docErr);
      return {
        success: false,
        error: docErr?.message || 'Error al despachar la orden médica a Caja POS.',
      };
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'clinical_order.dispatched_to_pos',
      target_type: 'document',
      target_id: newDoc.id,
      metadata: {
        patientId: payload.patientId,
        patientName: payload.patientName,
        specialtyId: payload.specialtyId,
        totalAmount: subtotalAmount,
        itemsCount: payload.items.length,
      },
    });

    return {
      success: true,
      documentId: newDoc.id,
      documentNumber: newDoc.document_number,
      totalAmount: subtotalAmount,
    };
  } catch (err: unknown) {
    console.error('[dispatchClinicalOrderToPOSAction]:', err);
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}
