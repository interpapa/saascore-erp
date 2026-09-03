'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import {
  Appointment,
  AppointmentFilterState,
  AppointmentStatus,
  CreateAppointmentInput,
  Employee,
  Service
} from '@/types/calendario';

function isMissingTableError(error: unknown): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Recovers appointments for tenant with fallback to 'documents' table.
 */
export async function getAppointmentsAction(
  tenantId: string,
  filter?: AppointmentFilterState
): Promise<{ success: boolean; appointments: Appointment[]; error?: string }> {
  try {
    if (!tenantId) return { success: true, appointments: [] };

    // 1. Primary Attempt: Query custom 'appointments' table
    const { data: appts, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });

    if (!error && appts) {
      // Gather unique IDs to fetch related records in batch, bypassing PostgreSQL schema foreign key relationship checks
      const clientIds = Array.from(new Set(appts.map((a: unknown) => a.client_id).filter(Boolean)));
      const employeeIds = Array.from(new Set(appts.map((a: unknown) => a.employee_id).filter(Boolean)));
      const serviceIds = Array.from(new Set(appts.map((a: unknown) => a.service_id).filter(Boolean)));

      const allEntityIds = [...clientIds, ...employeeIds];
      const entitiesMap: Record<string, unknown> = {};
      if (allEntityIds.length > 0) {
        const { data: entities } = await supabaseAdmin
          .from('entities')
          .select('id, name, phone, email')
          .in('id', allEntityIds);
        if (entities) {
          entities.forEach((e) => {
            entitiesMap[e.id] = e;
          });
        }
      }

      const itemsMap: Record<string, unknown> = {};
      if (serviceIds.length > 0) {
        const { data: items } = await supabaseAdmin
          .from('items')
          .select('id, name, base_price')
          .in('id', serviceIds);
        if (items) {
          items.forEach((i) => {
            itemsMap[i.id] = i;
          });
        }
      }

      const formatted: Appointment[] = appts.map((a: unknown) => {
        const client = a.client_id ? entitiesMap[a.client_id] : null;
        const employee = a.employee_id ? entitiesMap[a.employee_id] : null;
        const service = a.service_id ? itemsMap[a.service_id] : null;

        return {
          id: a.id,
          tenant_id: a.tenant_id,
          title: a.metadata?.title || a.notes?.split('\n')[0] || 'Cita',
          description: a.description,
          client_id: a.client_id,
          client_name: client?.name || a.client_name || a.metadata?.client_name || (a.notes?.includes('Cliente: ') ? a.notes.split('Cliente: ')[1] : undefined),
          client_phone: client?.phone || a.client_phone || a.metadata?.client_phone,
          client_email: client?.email,
          service_id: a.service_id,
          service_name: service?.name || a.service_name || a.metadata?.service_name,
          employee_id: a.employee_id,
          employee_name: employee?.name || a.employee_name || a.metadata?.employee_name,
          start_time: a.start_time,
          end_time: a.end_time,
          status: a.status,
          notes: a.notes,
          price: a.price,
          metadata: a.metadata,
          created_at: a.created_at,
          updated_at: a.updated_at,
        };
      });
      return { success: true, appointments: filterAppointments(formatted, filter) };
    }

function isMissingColumnError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as any).code || '';
  const msg = (error as any).message || '';
  return code === '42703' || msg.includes('column') && msg.includes('does not exist');
}

// Existing fallback condition updated
// Replace line 106-108 condition
// Original: if (error && isMissingTableError(error)) {
// New:
if (error && (isMissingTableError(error) || isMissingColumnError(error))) {
      const { data: docs, error: docErr } = await supabaseAdmin
        .from('documents')
        .select(`
          id, tenant_id, type, status, subtotal_amount, tax_amount, total_amount, metadata, created_at, updated_at, entity_id, document_number,
          entity:entities (id, name, phone, email)
        `)
        .eq('tenant_id', tenantId)
        .in('type', ['work_order', 'appointment'])
        .order('created_at', { ascending: true });

      if (docErr) throw new Error(docErr.message);

      const fallbackAppts: Appointment[] = (docs || []).map((doc: unknown) => {
        const issueDate = doc.issue_date || doc.metadata?.issue_date || doc.created_at;
        const dueDate = doc.due_date || doc.metadata?.due_date || new Date(new Date(issueDate).getTime() + 3600000).toISOString();

        return {
          id: doc.id,
          tenant_id: doc.tenant_id,
          title: doc.metadata?.title || doc.notes || `Cita ${doc.document_number}`,
          description: doc.metadata?.description || doc.notes || null,
          client_id: doc.entity_id || null,
          client_name: doc.entity?.name || doc.metadata?.client_name || 'Cliente',
          client_phone: doc.entity?.phone || doc.metadata?.client_phone || null,
          client_email: doc.entity?.email || null,
          service_id: doc.metadata?.service_id || null,
          service_name: doc.metadata?.service_name || 'Servicio General',
          service_duration: doc.metadata?.duration_minutes || 60,
          employee_id: doc.metadata?.employee_id || null,
          employee_name: doc.metadata?.employee_name || 'Sin Asignar',
          start_time: issueDate,
          end_time: dueDate,
          status: mapDocStatusToApptStatus(doc.status),
          notes: doc.notes,
          price: doc.total_amount || 0,
          metadata: doc.metadata || {},
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        };
      });

      return { success: true, appointments: filterAppointments(fallbackAppts, filter) };
    }

    throw new Error(error?.message || 'Error al obtener citas.');
  } catch (err: unknown) {
    console.error('[getAppointmentsAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, appointments: [] };
  }
}

/**
 * Creates an appointment with graceful fallback to 'documents' table.
 */
export async function createAppointmentAction(
  payload: CreateAppointmentInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !payload.title || !payload.start_time) {
      throw new Error('Empresa, título y hora de inicio son requeridos.');
    }

    const calculatedEndTime = payload.end_time || 
      new Date(new Date(payload.start_time).getTime() + (payload.duration_minutes || 60) * 60000).toISOString();

    // 1. Primary Attempt: Insert into 'appointments' table
    const { data: newAppt, error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        tenant_id: tenantId,
        // Guardamos el título dentro de metadata, ya que la tabla no tiene columna 'title'
        metadata: { ...(payload.metadata || {}), title: payload.title },
        description: payload.description || null,
        client_id: payload.client_id || null,
        service_id: payload.service_id || null,
        employee_id: payload.employee_id || null,
        start_time: payload.start_time,
        end_time: calculatedEndTime,
        status: payload.status || 'scheduled',
        notes: payload.notes || null,
        price: payload.price || 0,
        location: payload.location || null,
      }])
      .select()
      .single();

    if (!error && newAppt) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'appointment',
        target_id: newAppt.id,
        metadata: { action: 'appointment_created', title: payload.title, start_time: payload.start_time },
      });

      revalidatePath('/calendario');
      return { success: true, appointment: newAppt };
    }

    // 2. Fallback: Insert into 'documents' table
    if (error && isMissingTableError(error)) {
      const docStatus = mapApptStatusToDocStatus(payload.status || 'scheduled');
      const { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: payload.client_id || null,
          type: 'work_order',
          status: docStatus,
          document_number: `CIT-${Date.now().toString().slice(-6)}`,
          subtotal_amount: payload.price || 0,
          tax_amount: 0,
          total_amount: payload.price || 0,
          notes: payload.notes || payload.description || null,
          metadata: {
            title: payload.title,
            description: payload.description,
            service_id: payload.service_id,
            employee_id: payload.employee_id,
            duration_minutes: payload.duration_minutes || 60,
            price: payload.price || 0,
            created_by: actor.email,
            issue_date: payload.start_time,
            due_date: calculatedEndTime,
            ...payload.metadata,
          },
        }])
        .select()
        .single();

      if (docErr) throw new Error('Error al guardar cita en respaldo: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'document',
        target_id: newDoc.id,
        metadata: { action: 'appointment_created', title: payload.title, start_time: payload.start_time },
      });

      revalidatePath('/calendario');
      return {
        success: true,
        appointment: {
          id: newDoc.id,
          tenant_id: tenantId,
          title: payload.title,
          description: payload.description,
          client_id: payload.client_id,
          service_id: payload.service_id,
          employee_id: payload.employee_id,
          start_time: payload.start_time,
          end_time: calculatedEndTime,
          status: payload.status || 'scheduled',
          notes: payload.notes,
          price: payload.price || 0,
          metadata: newDoc.metadata,
          created_at: newDoc.created_at,
          updated_at: newDoc.updated_at,
        },
      };
    }

    if (error?.message?.includes('unique_appointment_slot') || error?.code === '23505') {
      throw new Error('El profesional ya tiene una cita agendada en este horario exacto. Selecciona otra hora.');
    }

    throw new Error(error?.message || 'Error al crear la cita.');
  } catch (err: unknown) {
    console.error('[createAppointmentAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates appointment status with fallback to 'documents' table.
 */
export async function updateAppointmentStatusAction(
  id: string,
  status: AppointmentStatus,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    // 1. Primary Attempt: Update 'appointments' table
    const { data: updatedAppt, error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (!error && updatedAppt) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'appointment',
        target_id: id,
        metadata: { action: 'appointment_status_updated', new_status: status },
      });

      revalidatePath('/calendario');
      return { success: true, appointment: updatedAppt };
    }

    // 2. Fallback: Update 'documents' table
    if (error && (isMissingTableError(error) || isMissingColumnError(error))) {
      const docStatus = mapApptStatusToDocStatus(status);
      const { data: updatedDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .update({ status: docStatus })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (docErr) throw new Error('Error al actualizar cita: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'document',
        target_id: id,
        metadata: { action: 'appointment_status_updated', new_status: status },
      });

      revalidatePath('/calendario');
      return {
        success: true,
        appointment: {
          id: updatedDoc.id,
          tenant_id: tenantId,
          title: updatedDoc.metadata?.title || updatedDoc.notes || 'Cita',
          start_time: updatedDoc.issue_date,
          end_time: updatedDoc.due_date || updatedDoc.issue_date,
          status,
          price: updatedDoc.total_amount,
          created_at: updatedDoc.created_at,
          updated_at: updatedDoc.updated_at,
        },
      };
    }

    throw new Error(error?.message || 'Error al actualizar el estado de la cita.');
  } catch (err: unknown) {
    console.error('[updateAppointmentStatusAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

// Helpers
function mapDocStatusToApptStatus(status: string): AppointmentStatus {
  switch (status) {
    case 'in_progress': return 'in_progress';
    case 'invoiced':
    case 'paid': return 'completed';
    case 'annulled': return 'cancelled';
    default: return 'scheduled';
  }
}

function mapApptStatusToDocStatus(status: AppointmentStatus): string {
  switch (status) {
    case 'in_progress': return 'in_progress';
    case 'completed': return 'invoiced';
    case 'cancelled':
    case 'no_show': return 'annulled';
    default: return 'draft';
  }
}

function filterAppointments(list: Appointment[], filter?: AppointmentFilterState): Appointment[] {
  if (!filter) return list;
  return list.filter((a) => {
    if (filter.status && filter.status !== 'all' && a.status !== filter.status) return false;
    if (filter.employee_id && filter.employee_id !== 'all' && a.employee_id !== filter.employee_id) return false;
    if (filter.service_id && filter.service_id !== 'all' && a.service_id !== filter.service_id) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const titleMatch = a.title.toLowerCase().includes(q);
      const clientMatch = a.client_name?.toLowerCase().includes(q);
      if (!titleMatch && !clientMatch) return false;
    }
    return true;
  });
}
