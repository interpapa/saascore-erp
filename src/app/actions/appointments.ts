'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { eventBus } from '@/lib/core/events/eventBus';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId, sanitizeUUID } from '@/lib/core/uuid';

function safeRevalidate(path: string, tenantId?: string) {
  try {
    revalidatePath(path);
    if (tenantId) {
      revalidatePath(`/reservas/${tenantId}`);
    }
  } catch {
    // Graceful degradation when outside Next.js request context
  }
}
import {
  Appointment,
  AppointmentFilterState,
  AppointmentStatus,
  CreateAppointmentInput,
  Employee,
  Service
} from '@/types/calendario';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

function isMissingColumnError(error: any): boolean {
  if (!error) return false;
  const code = (error as any).code || '';
  const msg = (error as any).message || '';
  return code === '42703' || (msg.includes('column') && msg.includes('does not exist'));
}

/**
 * Recovers appointments for tenant with fallback to 'documents' table.
 */
export async function getAppointmentsAction(
  tenantId: string,
  filter: AppointmentFilterState | undefined,
  actor: ActionActor
): Promise<{ success: boolean; appointments: Appointment[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', appointments: [] };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.', appointments: [] };
    }

    if (!tenantId) return { success: true, appointments: [] };

    // 1. Primary Attempt: Query custom 'appointments' table
    const { data: appts, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_time', { ascending: true });

    if (!error && appts) {
      // Gather unique IDs to fetch related records in batch, bypassing PostgreSQL schema foreign key relationship checks
      const isValidTargetId = (id: any): id is string => typeof id === 'string' && isValidUUID(id) && !isTemporaryId(id);
      const clientIds = Array.from(new Set(appts.map((a: any) => a.client_id).filter(isValidTargetId)));
      const employeeIds = Array.from(new Set(appts.map((a: any) => a.employee_id).filter(isValidTargetId)));
      const serviceIds = Array.from(new Set(appts.map((a: any) => a.service_id).filter(isValidTargetId)));

      const allEntityIds = [...clientIds, ...employeeIds];
      const entitiesMap: Record<string, any> = {};
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

      const itemsMap: Record<string, any> = {};
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

      const formatted: Appointment[] = appts.map((a: any) => {
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

      const fallbackAppts: Appointment[] = (docs || []).map((doc: any) => {
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
  } catch (err: any) {
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

    const moduleCheck = await assertModuleEnabled(tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!tenantId || !payload.title || !payload.start_time) {
      throw new Error('Empresa, título y hora de inicio son requeridos.');
    }

    const calculatedEndTime = payload.end_time || 
      new Date(new Date(payload.start_time).getTime() + (payload.duration_minutes || 60) * 60000).toISOString();

    // Prevención de colisión defensiva: verificar que el especialista no tenga otra cita activa en ese rango horario
    if (payload.employee_id && payload.status !== 'cancelled') {
      try {
        const { data: overlapping } = await supabaseAdmin
          .from('appointments')
          .select('id, title, start_time, end_time')
          .eq('tenant_id', tenantId)
          .eq('employee_id', payload.employee_id)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .neq('status', 'completed')
          .lt('start_time', calculatedEndTime)
          .gt('end_time', payload.start_time)
          .limit(1);

        if (overlapping && overlapping.length > 0) {
          return {
            success: false,
            error: `El colaborador ya tiene una cita agendada en ese horario ("${overlapping[0].title || 'Cita'}"). Por favor selecciona otro turno o especialista.`
          };
        }
      } catch {
        // En caso de tabla appointments no disponible, el fallback se encargará
      }
    }

    const safeClientId = sanitizeUUID(payload.client_id) || null;
    const safeServiceId = sanitizeUUID(payload.service_id) || null;
    const safeEmployeeId = sanitizeUUID(payload.employee_id) || null;

    // 1. Primary Attempt: Insert into 'appointments' table
    const { data: newAppt, error } = await supabaseAdmin
      .from('appointments')
      .insert([{
        tenant_id: tenantId,
        title: payload.title,
        metadata: { ...(payload.metadata || {}), title: payload.title },
        description: payload.description || null,
        client_id: safeClientId,
        service_id: safeServiceId,
        employee_id: safeEmployeeId,
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

      // Emisión de evento desacoplado (Estilo Odoo 17)
      const clientName = typeof payload.metadata?.client_name === 'string' ? payload.metadata.client_name : payload.title;
      const clientPhone = typeof payload.metadata?.client_phone === 'string' ? payload.metadata.client_phone : undefined;
      const serviceName = typeof payload.metadata?.service_name === 'string' ? payload.metadata.service_name : undefined;

      await eventBus.emit('appointment.booked', {
        appointmentId: newAppt.id,
        tenantId,
        customerName: clientName,
        customerPhone: clientPhone,
        barberId: payload.employee_id || '',
        date: payload.start_time.split('T')[0],
        time: payload.start_time.split('T')[1]?.slice(0, 5) || '00:00',
        durationMinutes: payload.duration_minutes || 60,
        serviceName: serviceName,
        timestamp: new Date().toISOString(),
      });

      safeRevalidate('/calendario', tenantId);
      return { success: true, appointment: newAppt };
    }

    // 2. Fallback: Insert into 'documents' table
    if (error && isMissingTableError(error)) {
      const docStatus = mapApptStatusToDocStatus(payload.status || 'scheduled');
      let { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: safeClientId,
          type: 'work_order',
          status: docStatus,
          document_number: `CIT-${Date.now().toString().slice(-6)}`,
          subtotal_amount: payload.price || 0,
          tax_amount: 0,
          total_amount: payload.price || 0,
          metadata: {
            title: payload.title,
            description: payload.description,
            notes: payload.notes || payload.description || null,
            service_id: safeServiceId || payload.service_id,
            employee_id: safeEmployeeId || payload.employee_id,
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

      if (docErr && (docErr.message.includes('type') || docErr.message.includes('check') || docErr.message.includes('constraint') || docErr.message.includes('column') || docErr.message.includes('schema cache'))) {
        const retry = await supabaseAdmin
          .from('documents')
          .insert([{
            tenant_id: tenantId,
            entity_id: safeClientId,
            type: 'quotation',
            status: docStatus,
            document_number: `CIT-${Date.now().toString().slice(-6)}`,
            subtotal_amount: payload.price || 0,
            tax_amount: 0,
            total_amount: payload.price || 0,
            metadata: {
              actual_type: 'work_order',
              title: payload.title,
              description: payload.description,
              notes: payload.notes || payload.description || null,
              service_id: safeServiceId || payload.service_id,
              employee_id: safeEmployeeId || payload.employee_id,
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
        newDoc = retry.data;
        docErr = retry.error;
      }

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

      safeRevalidate('/calendario', tenantId);
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
  } catch (err: any) {
    console.error('[createAppointmentAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Updates appointment status with fallback to 'documents' table.
 */
export async function updateAppointmentMetadataAction(
  id: string,
  metadata: Record<string, any>,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    if (isTemporaryId(id) || !isValidUUID(id)) {
      return { success: true, localOnly: true } as any;
    }

    // 1. Obtener metadata actual para fusionar de forma segura sin sobreescribir otros campos
    const { data: currentAppt } = await supabaseAdmin
      .from('appointments')
      .select('metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const mergedMetadata = {
      ...(typeof currentAppt?.metadata === 'object' && currentAppt?.metadata !== null ? currentAppt.metadata : {}),
      ...metadata,
    };

    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ metadata: mergedMetadata })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      // Fallback
      if (error.code === '42P01') {
        const { error: docError } = await supabaseAdmin
          .from('documents')
          .update({ metadata: mergedMetadata })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (docError) throw docError;
      } else {
        throw error;
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'appointment',
      target_id: id,
      metadata: { action: 'appointment_metadata_updated', metadata: mergedMetadata },
    });

    return { success: true };
  } catch (err: any) {
    console.error('[updateAppointmentMetadataAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Actualiza de forma segura el estado de cobro de una cita (paid | pending | unrecorded).
 */
export async function updateAppointmentPaymentStatusAction(
  id: string,
  paymentStatus: 'paid' | 'pending' | 'unrecorded',
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  return updateAppointmentMetadataAction(
    id,
    {
      payment_status: paymentStatus,
      paid_at: paymentStatus === 'paid' ? new Date().toISOString() : null,
      payment_updated_by: actor.email,
    },
    tenantId,
    actor
  );
}

/**
 * Actualiza el precio acordado o monto de un tratamiento para una cita.
 * Permite ajustar precios libres, tratamientos personalizados o cargos adicionales.
 */
export async function updateAppointmentPriceAction(
  id: string,
  price: number,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; price?: number; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    if (isTemporaryId(id) || !isValidUUID(id)) {
      return { success: true, price: Math.max(0, Number(price) || 0), localOnly: true } as any;
    }

    const cleanPrice = Math.max(0, Number(price) || 0);

    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ price: cleanPrice })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      if (error.code === '42P01') {
        const { error: docError } = await supabaseAdmin
          .from('documents')
          .update({ total_amount: cleanPrice })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (docError) throw docError;
      } else {
        throw error;
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'appointment',
      target_id: id,
      metadata: { action: 'appointment_price_updated', new_price: cleanPrice },
    });

    safeRevalidate('/calendario', tenantId);
    return { success: true, price: cleanPrice };
  } catch (err: any) {
    console.error('[updateAppointmentPriceAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

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

    const moduleCheck = await assertModuleEnabled(tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    if (isTemporaryId(id) || !isValidUUID(id)) {
      return { success: true, appointment: { id, status } as any, localOnly: true } as any;
    }

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

      // Emisión de eventos de dominio desacoplados (Estilo Odoo 17)
      const parseMetadata = (raw: unknown): Record<string, any> => {
        if (!raw) return {};
        if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, any>;
        if (typeof raw === 'string') {
          try { return JSON.parse(raw); } catch { return {}; }
        }
        return {};
      };
      const meta = parseMetadata(updatedAppt.metadata);

      if (status === 'completed') {
        await eventBus.emit('appointment.completed', {
          appointmentId: id,
          tenantId,
          customerName: meta.client_name || updatedAppt.title || 'Cliente',
          barberId: updatedAppt.employee_id || '',
          total: updatedAppt.price || 0,
          paymentStatus: meta.payment_status === 'paid' ? 'paid' : (meta.payment_status === 'pending' ? 'pending' : 'unrecorded'),
          timestamp: new Date().toISOString(),
        });
      } else if (status === 'cancelled') {
        await eventBus.emit('appointment.cancelled', {
          appointmentId: id,
          tenantId,
          reason: meta.cancel_reason,
          timestamp: new Date().toISOString(),
        });
      }

      safeRevalidate('/calendario', tenantId);
      return { success: true, appointment: updatedAppt };
    }

    // 2. Fallback: Update 'documents' table
    if (error && (isMissingTableError(error) || error.message?.includes('column'))) {
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

      safeRevalidate('/calendario', tenantId);
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
  } catch (err: any) {
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

/**
 * Añade atómicamente un participante a una clase o turno grupal,
 * verificando el aforo máximo en backend para evitar sobrecupos por carreras.
 */
export async function addAttendeeToAppointmentAction(
  appointmentId: string,
  client: { id: string; name: string },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; attendees?: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!appointmentId || !client?.id) {
      return { success: false, error: 'ID de cita y cliente son requeridos.' };
    }

    if (isTemporaryId(appointmentId) || !isValidUUID(appointmentId)) {
      return { success: true, attendees: [{ id: client.id, name: client.name }], localOnly: true } as any;
    }

    // 1. Intentar en tabla appointments
    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .select('id, metadata')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!error && appt) {
      const metadata = appt.metadata || {};
      const currentAttendees: Array<{ id: string; name: string }> = Array.isArray(metadata.attendees) ? metadata.attendees : [];
      const maxCapacity = Number(metadata.max_capacity) || 20;

      if (currentAttendees.some(a => a.id === client.id)) {
        return { success: true, attendees: currentAttendees };
      }

      if (currentAttendees.length >= maxCapacity) {
        return { success: false, error: `El aforo para esta sesión grupal (${maxCapacity} personas) ya está completo.` };
      }

      const updatedAttendees = [...currentAttendees, { id: client.id, name: client.name }];
      const updatedMetadata = { ...metadata, attendees: updatedAttendees };

      const { error: updateErr } = await supabaseAdmin
        .from('appointments')
        .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      if (updateErr) throw updateErr;

      safeRevalidate('/calendario');
      return { success: true, attendees: updatedAttendees };
    }

    // 2. Fallback en documents
    const { data: doc, error: docErr } = await supabaseAdmin
      .from('documents')
      .select('id, metadata')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single();

    if (docErr || !doc) {
      return { success: false, error: 'Cita no encontrada.' };
    }

    const metadata = doc.metadata || {};
    const currentAttendees: Array<{ id: string; name: string }> = Array.isArray(metadata.attendees) ? metadata.attendees : [];
    const maxCapacity = Number(metadata.max_capacity) || 20;

    if (currentAttendees.some(a => a.id === client.id)) {
      return { success: true, attendees: currentAttendees };
    }

    if (currentAttendees.length >= maxCapacity) {
      return { success: false, error: `El aforo para esta sesión grupal (${maxCapacity} personas) ya está completo.` };
    }

    const updatedAttendees = [...currentAttendees, { id: client.id, name: client.name }];
    const updatedMetadata = { ...metadata, attendees: updatedAttendees };

    await supabaseAdmin
      .from('documents')
      .update({ metadata: updatedMetadata, updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId);

    safeRevalidate('/calendario');
    return { success: true, attendees: updatedAttendees };
  } catch (err: any) {
    console.error('[addAttendeeToAppointmentAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Remueve de forma segura un participante de una clase grupal.
 */
export async function removeAttendeeFromAppointmentAction(
  appointmentId: string,
  clientId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; attendees?: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!appointmentId || !clientId) {
      return { success: false, error: 'ID de cita y cliente son requeridos.' };
    }

    if (isTemporaryId(appointmentId) || !isValidUUID(appointmentId)) {
      return { success: true, attendees: [], localOnly: true } as any;
    }

    // 1. Intentar en tabla appointments
    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .select('id, metadata')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!error && appt) {
      const metadata = appt.metadata || {};
      const currentAttendees: Array<{ id: string; name: string }> = Array.isArray(metadata.attendees) ? metadata.attendees : [];
      const updatedAttendees = currentAttendees.filter(a => a.id !== clientId);

      await supabaseAdmin
        .from('appointments')
        .update({ metadata: { ...metadata, attendees: updatedAttendees }, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      safeRevalidate('/calendario');
      return { success: true, attendees: updatedAttendees };
    }

    // 2. Fallback en documents
    const { data: doc } = await supabaseAdmin
      .from('documents')
      .select('id, metadata')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .single();

    if (doc) {
      const metadata = doc.metadata || {};
      const currentAttendees: Array<{ id: string; name: string }> = Array.isArray(metadata.attendees) ? metadata.attendees : [];
      const updatedAttendees = currentAttendees.filter(a => a.id !== clientId);

      await supabaseAdmin
        .from('documents')
        .update({ metadata: { ...metadata, attendees: updatedAttendees }, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      safeRevalidate('/calendario');
      return { success: true, attendees: updatedAttendees };
    }

    return { success: false, error: 'Cita no encontrada.' };
  } catch (err: any) {
    console.error('[removeAttendeeFromAppointmentAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Elimina una cita de forma segura o descarta citas locales/temporales sin error.
 */
export async function deleteAppointmentAction(
  id: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; localOnly?: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    if (isTemporaryId(id) || !isValidUUID(id)) {
      return { success: true, localOnly: true };
    }

    const { error } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      if (isMissingTableError(error)) {
        const { error: docError } = await supabaseAdmin
          .from('documents')
          .delete()
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (docError) throw docError;
      } else {
        throw error;
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.deleted',
      target_type: 'appointment',
      target_id: id,
      metadata: { action: 'appointment_deleted' },
    });

    safeRevalidate('/calendario', tenantId);
    return { success: true };
  } catch (err: any) {
    console.error('[deleteAppointmentAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

