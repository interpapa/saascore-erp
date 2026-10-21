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
  BlockInput,
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

async function assertCalendarOrDentalEnabled(tenantId: string) {
  const calCheck = await assertModuleEnabled(tenantId, 'calendario');
  if (calCheck.authorized) return { authorized: true };
  const dentalCheck = await assertModuleEnabled(tenantId, 'odontologia');
  if (dentalCheck.authorized) return { authorized: true };
  return { authorized: false, error: 'El módulo de citas/odontología está desactivado.' };
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

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
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
          .eq('tenant_id', tenantId)
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
          .eq('tenant_id', tenantId)
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
          location: a.location || a.metadata?.location || a.metadata?.court_name || null,
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
          location: doc.metadata?.location || doc.metadata?.court_name || null,
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

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!tenantId || !payload.title || !payload.start_time) {
      throw new Error('Empresa, título y hora de inicio son requeridos.');
    }

    const calculatedEndTime = payload.end_time || 
      new Date(new Date(payload.start_time).getTime() + (payload.duration_minutes || 60) * 60000).toISOString();

    // Prevención de colisión defensiva 1: verificar que el especialista/coach no tenga otra cita activa en ese rango horario
    if (payload.employee_id && payload.status !== 'cancelled' && !payload.metadata?.is_slot_freed) {
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
            error: `El profesional/coach ya tiene una actividad en ese horario ("${overlapping[0].title || 'Cita'}"). Por favor selecciona otro turno o especialista.`
          };
        }
      } catch {
        // En caso de tabla appointments no disponible, el fallback se encargará
      }
    }

    // Prevención de colisión defensiva 2: verificar que la pista/cancha física no esté ocupada
    const courtTarget = (payload.location || (payload.metadata?.court_name as string) || (payload.metadata?.court_id as string) || '').trim();
    if (courtTarget && payload.status !== 'cancelled' && !payload.metadata?.is_slot_freed) {
      try {
        const { data: overlappingCourts } = await supabaseAdmin
          .from('appointments')
          .select('id, title, start_time, end_time, location, metadata')
          .eq('tenant_id', tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .neq('status', 'completed')
          .lt('start_time', calculatedEndTime)
          .gt('end_time', payload.start_time);

        if (overlappingCourts && overlappingCourts.length > 0) {
          const conflict = overlappingCourts.find((a: any) => {
            if (a.metadata?.is_slot_freed) return false;
            const aLoc = (a.location || a.metadata?.court_name || a.metadata?.court_id || '').trim().toLowerCase();
            return aLoc === courtTarget.toLowerCase();
          });

          if (conflict) {
            return {
              success: false,
              error: `La Pista "${courtTarget}" ya está ocupada en ese horario por "${conflict.title || 'otra actividad'}". Por favor selecciona otra pista u horario.`
            };
          }
        }
      } catch {
        // En caso de tabla appointments no disponible, continuar con fallback
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
        metadata: {
          ...(payload.metadata || {}),
          title: payload.title,
          location: courtTarget || payload.location || null,
          court_name: courtTarget || null,
          court_id: (payload.metadata?.court_id as string) || null,
          is_fixed_class: !!payload.metadata?.is_fixed_class,
        },
        description: payload.description || null,
        client_id: safeClientId,
        service_id: safeServiceId,
        employee_id: safeEmployeeId,
        location: courtTarget || payload.location || null,
        start_time: payload.start_time,
        end_time: calculatedEndTime,
        status: payload.status || 'scheduled',
        notes: payload.notes || null,
        price: payload.price || 0,
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

    // 2. Fallback: If appointments table has an error (missing table, schema mismatch, FK constraint, etc.), fall back to 'documents' table
    if (error) {
      if (error?.message?.includes('unique_appointment_slot') || error?.code === '23505') {
        throw new Error('El profesional ya tiene una cita agendada en este horario exacto. Selecciona otra hora.');
      }
      console.warn('[createAppointmentAction] Falling back to documents table:', error.message || error);
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
            location: courtTarget || payload.location || null,
            court_name: courtTarget || null,
            court_id: (payload.metadata?.court_id as string) || null,
            is_fixed_class: !!payload.metadata?.is_fixed_class,
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
              location: courtTarget || payload.location || null,
              court_name: courtTarget || null,
              court_id: (payload.metadata?.court_id as string) || null,
              is_fixed_class: !!payload.metadata?.is_fixed_class,
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

    throw new Error('Error al crear la cita.');
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

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
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

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
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

/**
 * Reagenda o mueve una cita/clase verificando anti-colisión dual (Coach y Pista/Cancha).
 * Permite cambiar hora, fecha, entrenador o pista asegurando que no haya choques.
 */
export async function rescheduleOrMoveAppointmentAction(
  id: string,
  tenantId: string,
  updates: {
    start_time: string;
    end_time?: string;
    duration_minutes?: number;
    employee_id?: string | null;
    employee_name?: string | null;
    location?: string | null;
    court_name?: string | null;
    court_id?: string | null;
    metadata?: Record<string, any>;
  },
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!id || !tenantId || !updates.start_time) {
      throw new Error('ID, Empresa y nueva hora de inicio son requeridos.');
    }

    const calculatedEndTime = updates.end_time || 
      new Date(new Date(updates.start_time).getTime() + (updates.duration_minutes || 60) * 60000).toISOString();

    // 1. Anti-colisión de Coach (si viene employee_id)
    if (updates.employee_id) {
      const { data: overlappingEmp } = await supabaseAdmin
        .from('appointments')
        .select('id, title, start_time, end_time')
        .eq('tenant_id', tenantId)
        .eq('employee_id', updates.employee_id)
        .neq('id', id)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .neq('status', 'completed')
        .lt('start_time', calculatedEndTime)
        .gt('end_time', updates.start_time)
        .limit(1);

      if (overlappingEmp && overlappingEmp.length > 0) {
        return {
          success: false,
          error: `El coach ya tiene otra clase/actividad en ese horario ("${overlappingEmp[0].title || 'Cita'}"). Elige otro horario o entrenador.`
        };
      }
    }

    // 2. Anti-colisión de Pista / Cancha (si viene location o court_name)
    const courtTarget = (updates.location || updates.court_name || (updates.metadata?.court_name as string) || '').trim();
    if (courtTarget) {
      const { data: overlappingCourts } = await supabaseAdmin
        .from('appointments')
        .select('id, title, start_time, end_time, location, metadata')
        .eq('tenant_id', tenantId)
        .neq('id', id)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .neq('status', 'completed')
        .lt('start_time', calculatedEndTime)
        .gt('end_time', updates.start_time);

      if (overlappingCourts && overlappingCourts.length > 0) {
        const conflict = overlappingCourts.find((a: any) => {
          if (a.metadata?.is_slot_freed) return false;
          const aLoc = (a.location || a.metadata?.court_name || a.metadata?.court_id || '').trim().toLowerCase();
          return aLoc === courtTarget.toLowerCase();
        });

        if (conflict) {
          return {
            success: false,
            error: `La Pista "${courtTarget}" ya está ocupada en ese horario por "${conflict.title || 'otra actividad'}". Elige otra pista o franja.`
          };
        }
      }
    }

    // 3. Obtener metadata actual para fusionar
    const { data: currentAppt } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const mergedMetadata = {
      ...(typeof currentAppt?.metadata === 'object' && currentAppt?.metadata !== null ? currentAppt.metadata : {}),
      ...(updates.metadata || {}),
      location: courtTarget || updates.location || currentAppt?.location || null,
      court_name: courtTarget || updates.court_name || null,
      ...(updates.employee_name ? { employee_name: updates.employee_name } : {}),
      is_slot_freed: false,
    };

    const updatePayload: Record<string, any> = {
      start_time: updates.start_time,
      end_time: calculatedEndTime,
      metadata: mergedMetadata,
    };
    if (updates.employee_id !== undefined) updatePayload.employee_id = sanitizeUUID(updates.employee_id) || null;
    if (courtTarget) updatePayload.location = courtTarget;

    const { error: updateErr } = await supabaseAdmin
      .from('appointments')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (updateErr) {
      if (updateErr.code === '42P01') {
        const { error: docErr } = await supabaseAdmin
          .from('documents')
          .update({
            metadata: {
              ...mergedMetadata,
              issue_date: updates.start_time,
              due_date: calculatedEndTime,
              location: courtTarget || null,
              court_name: courtTarget || null,
            }
          })
          .eq('id', id)
          .eq('tenant_id', tenantId);
        if (docErr) throw docErr;
      } else {
        throw updateErr;
      }
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'appointment',
      target_id: id,
      metadata: { action: 'appointment_rescheduled', new_start: updates.start_time, court: courtTarget },
    });

    safeRevalidate('/calendario', tenantId);
    return { success: true };
  } catch (err: any) {
    console.error('[rescheduleOrMoveAppointmentAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Libera temporalmente una cancha/pista o slot para una fecha concreta (Ceder Pista).
 * Permite que una clase fija o reserva libere el espacio para que recepción pueda
 * agendar una clase particular o alquiler libre sin borrar el histórico.
 */
export async function freeAppointmentSlotAction(
  id: string,
  tenantId: string,
  reason: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!id || !tenantId) throw new Error('ID y Empresa requeridos.');

    const { data: currentAppt } = await supabaseAdmin
      .from('appointments')
      .select('metadata, title, location')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    const mergedMeta = {
      ...(currentAppt?.metadata || {}),
      is_slot_freed: true,
      freed_at: new Date().toISOString(),
      freed_by: actor.email,
      freed_reason: reason || 'Liberada temporalmente por aviso de alumnos',
    };

    const { error } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        metadata: mergedMeta,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error && error.code === '42P01') {
      await supabaseAdmin
        .from('documents')
        .update({
          status: 'cancelled',
          metadata: mergedMeta,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId);
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'appointment',
      target_id: id,
      metadata: { action: 'appointment_slot_freed', reason },
    });

    safeRevalidate('/calendario', tenantId);
    return { success: true };
  } catch (err: any) {
    console.error('[freeAppointmentSlotAction Error]:', (err as Error).message);
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

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
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
    if (filter.employee_id && filter.employee_id !== 'all') {
      const isCompanyBlock = !a.employee_id && a.metadata?.is_block;
      if (a.employee_id !== filter.employee_id && !isCompanyBlock) {
        return false;
      }
    }
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
 * Reasigna o sustituye un participante en una clase (ej. cuando alguien reservó por un amigo/familiar).
 */
export async function reassignAttendeeInAppointmentAction(
  appointmentId: string,
  oldAttendeeId: string,
  newClient: { id: string; name: string; phone?: string },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; attendees?: Array<{ id: string; name: string; phone?: string; payment_status?: string }>; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!appointmentId || !oldAttendeeId || !newClient?.id) {
      return { success: false, error: 'ID de cita, participante previo y nuevo cliente son requeridos.' };
    }

    if (isTemporaryId(appointmentId) || !isValidUUID(appointmentId)) {
      return { success: true, attendees: [{ id: newClient.id, name: newClient.name, phone: newClient.phone }], localOnly: true } as any;
    }

    const { data: appt, error } = await supabaseAdmin
      .from('appointments')
      .select('id, metadata')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!error && appt) {
      const metadata = appt.metadata || {};
      const currentAttendees: Array<{ id: string; name: string; phone?: string; payment_status?: string }> = 
        Array.isArray(metadata.attendees) ? metadata.attendees : [];
      
      const updatedAttendees = currentAttendees.map(a => {
        if (a.id === oldAttendeeId) {
          return {
            ...a,
            id: newClient.id,
            name: newClient.name,
            phone: newClient.phone || a.phone || '',
          };
        }
        return a;
      });

      await supabaseAdmin
        .from('appointments')
        .update({ metadata: { ...metadata, attendees: updatedAttendees }, updated_at: new Date().toISOString() })
        .eq('id', appointmentId)
        .eq('tenant_id', tenantId);

      safeRevalidate('/calendario');
      return { success: true, attendees: updatedAttendees };
    }

    return { success: false, error: 'Cita no encontrada.' };
  } catch (err: any) {
    console.error('[reassignAttendeeInAppointmentAction Error]:', err.message);
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

/**
 * Crea bloqueos de agenda (por horas, día completo o múltiples días completos).
 * Si es para toda la empresa, employee_id se guarda como null para bloquear todo el negocio.
 */
export async function createAppointmentBlockAction(
  tenantId: string,
  payload: BlockInput,
  actor: ActionActor
): Promise<{ success: boolean; appointments?: Appointment[]; count?: number; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const moduleCheck = await assertCalendarOrDentalEnabled(tenantId);
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de citas está desactivado.' };
    }

    if (!tenantId) throw new Error('ID de empresa requerido.');
    if (!payload.title?.trim()) throw new Error('El motivo del bloqueo es obligatorio.');

    const safeEmployeeId = payload.scope === 'employee' ? sanitizeUUID(payload.employeeId) || null : null;
    const blockColor = payload.color || '#f43f5e';
    const reasonType = payload.reasonType || 'Mantenimiento';

    // Determinar la lista de registros a insertar
    const recordsToInsert: any[] = [];

    if (payload.mode === 'multi_day') {
      const startStr = payload.startDate || payload.date;
      const endStr = payload.endDate || payload.date;
      if (!startStr || !endStr) {
        throw new Error('Debe especificar fecha de inicio y fin para el rango de bloqueo.');
      }

      const startD = new Date(`${startStr}T00:00:00`);
      const endD = new Date(`${endStr}T00:00:00`);
      if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
        throw new Error('Rango de fechas inválido.');
      }
      if (endD.getTime() < startD.getTime()) {
        throw new Error('La fecha de fin no puede ser anterior a la fecha de inicio.');
      }

      // Máximo 90 días por seguridad
      const diffDays = Math.round((endD.getTime() - startD.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      if (diffDays > 90) {
        throw new Error('El rango máximo de bloqueo continuo es de 90 días.');
      }

      let currentCursor = new Date(startD);
      while (currentCursor <= endD) {
        const y = currentCursor.getFullYear();
        const m = String(currentCursor.getMonth() + 1).padStart(2, '0');
        const d = String(currentCursor.getDate()).padStart(2, '0');
        const dayStr = `${y}-${m}-${d}`;

        recordsToInsert.push({
          tenant_id: tenantId,
          title: payload.title.trim(),
          description: payload.notes || `Bloqueo de día completo: ${reasonType}`,
          client_id: null,
          service_id: null,
          employee_id: safeEmployeeId,
          start_time: `${dayStr}T00:00:00.000Z`,
          end_time: `${dayStr}T23:59:59.000Z`,
          status: 'confirmed' as AppointmentStatus,
          notes: payload.notes || null,
          price: 0,
          metadata: {
            is_block: true,
            all_day: true,
            block_mode: 'multi_day',
            block_type: reasonType,
            range_start: startStr,
            range_end: endStr,
            scope: payload.scope,
            color: blockColor,
          }
        });

        currentCursor.setDate(currentCursor.getDate() + 1);
      }
    } else if (payload.mode === 'full_day') {
      const dayStr = payload.date;
      if (!dayStr) throw new Error('Debe seleccionar la fecha para el día completo.');

      recordsToInsert.push({
        tenant_id: tenantId,
        title: payload.title.trim(),
        description: payload.notes || `Bloqueo de día completo: ${reasonType}`,
        client_id: null,
        service_id: null,
        employee_id: safeEmployeeId,
        start_time: `${dayStr}T00:00:00.000Z`,
        end_time: `${dayStr}T23:59:59.000Z`,
        status: 'confirmed' as AppointmentStatus,
        notes: payload.notes || null,
        price: 0,
        metadata: {
          is_block: true,
          all_day: true,
          block_mode: 'full_day',
          block_type: reasonType,
          scope: payload.scope,
          color: blockColor,
        }
      });
    } else {
      // mode === 'hours'
      const dayStr = payload.date || new Date().toISOString().split('T')[0];
      const startHour = payload.startTime || '09:00';
      const duration = Number(payload.durationMinutes) || 60;

      const startDateTime = new Date(`${dayStr}T${startHour}:00`);
      if (isNaN(startDateTime.getTime())) {
        throw new Error('Fecha u hora de bloqueo inválida.');
      }
      const endDateTime = payload.endTime 
        ? new Date(`${dayStr}T${payload.endTime}:00`)
        : new Date(startDateTime.getTime() + duration * 60000);

      recordsToInsert.push({
        tenant_id: tenantId,
        title: payload.title.trim(),
        description: payload.notes || `Bloqueo por horas: ${reasonType}`,
        client_id: null,
        service_id: null,
        employee_id: safeEmployeeId,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'confirmed' as AppointmentStatus,
        notes: payload.notes || null,
        price: 0,
        metadata: {
          is_block: true,
          all_day: false,
          block_mode: 'hours',
          block_type: reasonType,
          duration_minutes: duration,
          scope: payload.scope,
          color: blockColor,
        }
      });
    }

    // Inserción en batch en appointments
    const { data: createdAppts, error } = await supabaseAdmin
      .from('appointments')
      .insert(recordsToInsert)
      .select();

    if (!error && createdAppts) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.created',
        target_type: 'appointment_block',
        target_id: createdAppts[0]?.id || tenantId,
        metadata: {
          action: 'calendar_block_created',
          mode: payload.mode,
          reasonType,
          scope: payload.scope,
          count: createdAppts.length,
        },
      });

      safeRevalidate('/calendario', tenantId);
      return { success: true, appointments: createdAppts, count: createdAppts.length };
    }

    // Fallback: Si appointments falla por esquema, insertar en documents
    if (error) {
      console.warn('[createAppointmentBlockAction] Fallback a documents:', error.message);
      const docsToInsert = recordsToInsert.map((rec, idx) => ({
        tenant_id: tenantId,
        entity_id: safeEmployeeId,
        type: 'work_order',
        status: 'draft',
        document_number: `BLK-${Date.now().toString().slice(-6)}-${idx + 1}`,
        subtotal_amount: 0,
        tax_amount: 0,
        total_amount: 0,
        notes: rec.notes || rec.title,
        metadata: {
          title: rec.title,
          description: rec.description,
          issue_date: rec.start_time,
          due_date: rec.end_time,
          ...rec.metadata,
        }
      }));

      const { data: createdDocs, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert(docsToInsert)
        .select();

      if (docErr) throw new Error(docErr.message || 'Error al guardar bloqueo.');

      safeRevalidate('/calendario', tenantId);
      return { success: true, count: createdDocs?.length || recordsToInsert.length };
    }

    return { success: true, count: recordsToInsert.length };
  } catch (err: unknown) {
    console.error('[createAppointmentBlockAction Error]:', err);
    return { success: false, error: (err as Error).message || 'Error al procesar el bloqueo.' };
  }
}

