'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { ActionActor } from './entities';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';

import { 
  type EntityRecord, 
  type CreateEntityRecordInput, 
  type EntityAttachment, 
  type CreateEntityAttachmentInput,
  type RecordPhoto
} from '@/lib/core/entityRecordTypes';

// ─────────────────────────────────────────────────────────────
// 1. REGISTROS / HISTORIAS CLÍNICAS (CRUD)
// ─────────────────────────────────────────────────────────────

export async function getEntityRecordsAction(
  tenantId: string,
  entityId: string,
  actor: ActionActor
): Promise<{ success: boolean; records?: EntityRecord[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !entityId || !isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: true, records: [] };
    }

    // Intento 1: Consultar tabla relacional entity_records
    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_id', entityId)
      .is('deleted_at', null)
      .order('record_date', { ascending: false });

    if (!error && data) {
      return { success: true, records: data as EntityRecord[] };
    }

    // Fallback: Si la tabla no está en el schema cache, leer de entities.metadata.records
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    const fallbackRecords: EntityRecord[] = Array.isArray(entityData?.metadata?.records)
      ? entityData.metadata.records
      : [];

    // Ordenar descendente por fecha
    fallbackRecords.sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());

    return { success: true, records: fallbackRecords };
  } catch (err: any) {
    console.error('[getEntityRecordsAction Error]:', err.message);
    return { success: false, error: err.message, records: [] };
  }
}

export async function createEntityRecordAction(
  input: CreateEntityRecordInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; record?: EntityRecord; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!input.title || !input.entity_id) {
      return { success: false, error: 'Título y cliente son obligatorios.' };
    }

    const recordDate = input.record_date || new Date().toISOString();

    if (!isValidUUID(input.entity_id) || isTemporaryId(input.entity_id)) {
      const localRecord: EntityRecord = {
        id: 'rec_' + Date.now(),
        tenant_id: tenantId,
        entity_id: input.entity_id,
        record_type: input.record_type,
        record_date: recordDate,
        title: input.title,
        body: input.body || '',
        metadata: input.metadata || {},
        created_by: actor.email,
        created_at: new Date().toISOString(),
      };
      return { success: true, record: localRecord };
    }

    // Intento 1: Insertar en entity_records
    const { data, error } = await supabaseAdmin
      .from('entity_records')
      .insert([
        {
          tenant_id: tenantId,
          entity_id: input.entity_id,
          record_type: input.record_type || 'clinical_note',
          record_date: recordDate,
          title: input.title,
          body: input.body || '',
          metadata: input.metadata || {},
          created_by: actor.email,
        }
      ])
      .select()
      .single();

    if (!error && data) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'entity_record',
        target_id: data.id,
        metadata: { action: 'created_record', title: input.title, type: input.record_type },
      });
      return { success: true, record: data as EntityRecord };
    }

    // Fallback: Guardar en entities.metadata.records
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', input.entity_id)
      .eq('tenant_id', tenantId)
      .single();

    const currentRecords = Array.isArray(entityData?.metadata?.records) ? entityData.metadata.records : [];
    const newRecord: EntityRecord = {
      id: 'rec_' + Date.now(),
      tenant_id: tenantId,
      entity_id: input.entity_id,
      record_type: input.record_type,
      record_date: recordDate,
      title: input.title,
      body: input.body || '',
      metadata: input.metadata || {},
      created_by: actor.email,
      created_at: new Date().toISOString(),
    };

    const updatedRecords = [newRecord, ...currentRecords];

    await supabaseAdmin
      .from('entities')
      .update({
        metadata: {
          ...(entityData?.metadata || {}),
          records: updatedRecords,
        }
      })
      .eq('id', input.entity_id)
      .eq('tenant_id', tenantId);

    return { success: true, record: newRecord };
  } catch (err: any) {
    console.error('[createEntityRecordAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

export async function deleteEntityRecordAction(
  recordId: string,
  entityId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!isValidUUID(recordId) || isTemporaryId(recordId) || !isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: true };
    }

    // Intento 1: Soft delete en tabla relacional
    const { error } = await supabaseAdmin
      .from('entity_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', recordId)
      .eq('tenant_id', tenantId);

    if (!error) {
      return { success: true };
    }

    // Fallback: Eliminar de entities.metadata.records
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    const currentRecords = Array.isArray(entityData?.metadata?.records) ? entityData.metadata.records : [];
    const filtered = currentRecords.filter((r: EntityRecord) => r.id !== recordId);

    await supabaseAdmin
      .from('entities')
      .update({
        metadata: {
          ...(entityData?.metadata || {}),
          records: filtered,
        }
      })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// 2. ARCHIVOS, FOTOS & RADIOGRAFÍAS (CRUD)
// ─────────────────────────────────────────────────────────────

export async function getEntityAttachmentsAction(
  tenantId: string,
  entityId: string,
  actor: ActionActor
): Promise<{ success: boolean; attachments?: EntityAttachment[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !entityId || !isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: true, attachments: [] };
    }

    // Intento 1: Tabla relacional entity_attachments
    const { data, error } = await supabaseAdmin
      .from('entity_attachments')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      return { success: true, attachments: data as EntityAttachment[] };
    }

    // Fallback: entities.metadata.attachments
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    const fallbackAttachments: EntityAttachment[] = Array.isArray(entityData?.metadata?.attachments)
      ? entityData.metadata.attachments
      : [];

    return { success: true, attachments: fallbackAttachments };
  } catch (err: any) {
    return { success: false, error: err.message, attachments: [] };
  }
}

export async function createEntityAttachmentAction(
  input: CreateEntityAttachmentInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; attachment?: EntityAttachment; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!input.file_url || !input.file_name || !input.entity_id) {
      return { success: false, error: 'Nombre de archivo, URL y cliente son obligatorios.' };
    }

    if (!isValidUUID(input.entity_id) || isTemporaryId(input.entity_id)) {
      const localAttachment: EntityAttachment = {
        id: 'att_' + Date.now(),
        tenant_id: tenantId,
        entity_id: input.entity_id,
        record_id: input.record_id || null,
        file_name: input.file_name,
        file_url: input.file_url,
        file_type: input.file_type || 'image/jpeg',
        file_size: input.file_size || 0,
        category: input.category || 'general',
        description: input.description || '',
        uploaded_by: actor.email,
        created_at: new Date().toISOString(),
      };
      return { success: true, attachment: localAttachment };
    }

    // Intento 1: Insertar en entity_attachments
    const { data, error } = await supabaseAdmin
      .from('entity_attachments')
      .insert([
        {
          tenant_id: tenantId,
          entity_id: input.entity_id,
          record_id: input.record_id || null,
          file_name: input.file_name,
          file_url: input.file_url,
          file_type: input.file_type || 'image/jpeg',
          file_size: input.file_size || 0,
          category: input.category || 'general',
          description: input.description || '',
          uploaded_by: actor.email,
        }
      ])
      .select()
      .single();

    if (!error && data) {
      return { success: true, attachment: data as EntityAttachment };
    }

    // Fallback: Guardar en entities.metadata.attachments
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', input.entity_id)
      .eq('tenant_id', tenantId)
      .single();

    const currentAttachments = Array.isArray(entityData?.metadata?.attachments) ? entityData.metadata.attachments : [];
    const newAttachment: EntityAttachment = {
      id: 'att_' + Date.now(),
      tenant_id: tenantId,
      entity_id: input.entity_id,
      record_id: input.record_id || null,
      file_name: input.file_name,
      file_url: input.file_url,
      file_type: input.file_type || 'image/jpeg',
      file_size: input.file_size || 0,
      category: input.category || 'general',
      description: input.description || '',
      uploaded_by: actor.email,
      created_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('entities')
      .update({
        metadata: {
          ...(entityData?.metadata || {}),
          attachments: [newAttachment, ...currentAttachments],
        }
      })
      .eq('id', input.entity_id)
      .eq('tenant_id', tenantId);

    return { success: true, attachment: newAttachment };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteEntityAttachmentAction(
  attachmentId: string,
  entityId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!isValidUUID(attachmentId) || isTemporaryId(attachmentId) || !isValidUUID(entityId) || isTemporaryId(entityId)) {
      return { success: true };
    }

    // Intento 1: Delete de tabla
    const { error } = await supabaseAdmin
      .from('entity_attachments')
      .delete()
      .eq('id', attachmentId)
      .eq('tenant_id', tenantId);

    if (!error) {
      return { success: true };
    }

    // Fallback: Delete de metadata
    const { data: entityData } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    const current = Array.isArray(entityData?.metadata?.attachments) ? entityData.metadata.attachments : [];
    const filtered = current.filter((a: EntityAttachment) => a.id !== attachmentId);

    await supabaseAdmin
      .from('entities')
      .update({
        metadata: {
          ...(entityData?.metadata || {}),
          attachments: filtered,
        }
      })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function addPhotoToEntityRecordAction(
  tenantId: string,
  entityId: string,
  recordId: string,
  photoInput: {
    url: string;
    name?: string;
    caption?: string;
    category?: 'foto_antes' | 'foto_despues' | 'rx' | 'receta' | 'general';
  },
  actor: ActionActor
): Promise<{ success: boolean; photo?: RecordPhoto; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!photoInput.url) {
      return { success: false, error: 'La foto no contiene una URL válida.' };
    }

    const newPhoto: RecordPhoto = {
      id: 'photo_' + Date.now(),
      url: photoInput.url,
      name: photoInput.name || 'Evidencia de consulta',
      caption: photoInput.caption || '',
      category: photoInput.category || 'general',
      created_at: new Date().toISOString(),
    };

    if (!isValidUUID(entityId) || isTemporaryId(entityId) || !isValidUUID(recordId) || isTemporaryId(recordId)) {
      return { success: true, photo: newPhoto };
    }

    // 1. Intento actualizar en tabla entity_records
    const { data: recordData, error: recordErr } = await supabaseAdmin
      .from('entity_records')
      .select('metadata')
      .eq('id', recordId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!recordErr && recordData) {
      const currentPhotos: RecordPhoto[] = Array.isArray(recordData.metadata?.photos) ? recordData.metadata.photos : [];
      const updatedPhotos = [...currentPhotos, newPhoto];

      await supabaseAdmin
        .from('entity_records')
        .update({
          metadata: {
            ...(recordData.metadata || {}),
            photos: updatedPhotos,
          }
        })
        .eq('id', recordId)
        .eq('tenant_id', tenantId);
    } else {
      // Fallback: actualizar en entities.metadata.records
      const { data: entityData } = await supabaseAdmin
        .from('entities')
        .select('metadata')
        .eq('id', entityId)
        .eq('tenant_id', tenantId)
        .single();

      const currentRecords = Array.isArray(entityData?.metadata?.records) ? entityData.metadata.records : [];
      const updatedRecords = currentRecords.map((r: EntityRecord) => {
        if (r.id === recordId) {
          const currentPhotos: RecordPhoto[] = Array.isArray(r.metadata?.photos) ? r.metadata.photos : [];
          return {
            ...r,
            metadata: {
              ...(r.metadata || {}),
              photos: [...currentPhotos, newPhoto],
            }
          };
        }
        return r;
      });

      await supabaseAdmin
        .from('entities')
        .update({
          metadata: {
            ...(entityData?.metadata || {}),
            records: updatedRecords,
          }
        })
        .eq('id', entityId)
        .eq('tenant_id', tenantId);
    }

    // 2. Registrar simultáneamente como EntityAttachment
    try {
      await createEntityAttachmentAction(
        {
          entity_id: entityId,
          record_id: recordId,
          file_name: photoInput.name || 'Evidencia de consulta',
          file_url: photoInput.url,
          file_type: 'image/jpeg',
          category: photoInput.category || 'general',
          description: photoInput.caption || `Adjunto a historia ${recordId}`,
        },
        tenantId,
        actor
      );
    } catch {
      // Silencioso si attachment secundario falla
    }

    return { success: true, photo: newPhoto };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

