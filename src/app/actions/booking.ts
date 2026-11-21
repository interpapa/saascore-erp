'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { eventBus } from '@/lib/core/events/eventBus';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { ActionActor } from './entities';
import { normalizeHexColor } from '@/lib/theme/colorUtils';
import { matchesEmployeeService } from '@/lib/services/serviceMatching';

const bookingSchema = z.object({
  tenantId: z.string().uuid('ID de empresa inválido'),
  barberId: z.string(), // Permite UUID o 'any'
  barberName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 letras').max(50).trim(),
  lastName: z.string().max(50).trim().optional().or(z.literal('')),
  phone: z.string().max(30).trim().optional().or(z.literal('')),
  durationMinutes: z.union([z.number(), z.string().transform(v => Number(v) || 60)]).optional(),
  timezoneOffset: z.string().optional(),
  price: z.union([z.number(), z.string().transform(v => Number(v) || 0)]).optional(),
  serviceName: z.string().optional(),
  isGroupClass: z.boolean().optional(),
  maxCapacity: z.union([z.number(), z.string().transform(v => Number(v) || 1)]).optional(),
});

function parseOffsetToMs(offsetStr?: string): number {
  if (!offsetStr || !/^[+-]\d{2}:\d{2}$/.test(offsetStr)) {
    return -4 * 60 * 60 * 1000; // Por defecto: -04:00 (Venezuela / Chile)
  }
  const sign = offsetStr.startsWith('-') ? -1 : 1;
  const [h, m] = offsetStr.slice(1).split(':').map(Number);
  return sign * (h * 60 + m) * 60 * 1000;
}

const rateLimitCache = new Map<string, { count: number, resetAt: number }>();
const MAX_ATTEMPTS = 5; 
const WINDOW_MS = 15 * 60 * 1000; 

function checkRateLimit(ip: string): { allowed: boolean, remaining: number, retryAfterSecs: number } {
  const now = Date.now();
  const record = rateLimitCache.get(ip);
  if (!record || record.resetAt < now) {
    rateLimitCache.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSecs: 0 };
  }
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0, retryAfterSecs: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true, remaining: MAX_ATTEMPTS - record.count, retryAfterSecs: 0 };
}

export async function processBookingAction(formData: unknown) {
  try {
    let ip = '127.0.0.1';
    try {
      const headersList = await headers();
      ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
    } catch (hErr) {
      // Ignorar de forma segura si Next.js no provee request scope síncrono
    }
    
    // Protección Anti-Spam activada
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return { success: false, error: `Demasiados intentos. Por favor espera ${rateLimit.retryAfterSecs} segundos.` };
    }

    const cleanData = bookingSchema.parse(formData);

    // Validación Backend de Módulo Activo (Soporta Citas, Odontología, Especialidades Médicas, Barbería y Peluquería Canina)
    const validBookingModules = [
      'calendario', 'odontologia', 'clinica', 'ginecologia', 'med_ginecologia',
      'cardiologia', 'med_cardiologia', 'pediatria', 'med_pediatria',
      'dermatologia', 'med_dermatologia', 'traumatologia', 'med_traumatologia',
      'oftalmologia', 'med_oftalmologia', 'barberia', 'grooming'
    ];
    let isBookingAuthorized = false;
    for (const mod of validBookingModules) {
      try {
        const check = await assertModuleEnabled(cleanData.tenantId, mod as any);
        if (check.authorized) {
          isBookingAuthorized = true;
          break;
        }
      } catch {}
    }
    if (!isBookingAuthorized) {
      return { 
        success: false, 
        error: 'El sistema de reservas está temporalmente inactivo o no habilitado para esta empresa.' 
      };
    }

    const fullName = `${cleanData.firstName} ${cleanData.lastName || ''}`.trim();
    
    // Usamos el timezone del cliente/negocio para que la hora en base de datos coincida con la hora local
    const tzOffset = cleanData.timezoneOffset || '-04:00';
    const startDateTime = new Date(`${cleanData.date}T${cleanData.time}:00${tzOffset}`);
    
    // Usamos la duración enviada, o 60 minutos por defecto
    const duration = cleanData.durationMinutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    // Validación de Jornada Laboral (Working Hours)
    const dParts = cleanData.date.split('-');
    const dDate = new Date(Number(dParts[0]), Number(dParts[1]) - 1, Number(dParts[2]));
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDayKey = dayKeys[dDate.getDay()] || 'monday';

    const checkDoctorWorking = (empMetadata: any, timeStr: string, durMins: number = 30) => {
      const wh = empMetadata?.working_hours;
      if (!wh || typeof wh !== 'object' || Object.keys(wh).length === 0) return true;
      const shifts = wh[currentDayKey] || [];
      if (!Array.isArray(shifts) || shifts.length === 0) return false;
      const [h, m] = timeStr.split(':').map(Number);
      const startSlot = (h || 0) * 60 + (m || 0);
      const endSlot = startSlot + durMins;
      return shifts.some((s: any) => {
        if (!s?.start || !s?.end) return false;
        const [sH, sM] = s.start.split(':').map(Number);
        const [eH, eM] = s.end.split(':').map(Number);
        return startSlot >= (sH * 60 + sM) && endSlot <= (eH * 60 + eM);
      });
    };

    // 1. Unificación y Creación de Contacto del Alumno (Estilo Odoo res.partner)
    let entityClientId: string | null = null;
    try {
      let query = supabaseAdmin
        .from('entities')
        .select('id')
        .eq('tenant_id', cleanData.tenantId)
        .eq('type', 'customer');

      if (cleanData.phone) {
        query = query.eq('phone', cleanData.phone);
      } else {
        query = query.ilike('name', fullName);
      }

      const { data: existingClient } = await query.limit(1).maybeSingle();

      if (existingClient?.id) {
        entityClientId = existingClient.id;
      } else {
        const { data: newClient } = await supabaseAdmin
          .from('entities')
          .insert({
            tenant_id: cleanData.tenantId,
            type: 'customer',
            name: fullName,
            phone: cleanData.phone || null,
            status: 'active',
            metadata: { source: 'public_booking' },
          })
          .select('id')
          .single();

        if (newClient?.id) {
          entityClientId = newClient.id;
        }
      }
    } catch (e) {
      console.warn('[Booking] Entity lookup/create warning (non-blocking):', e);
    }

    let finalBarberId = cleanData.barberId;
    let finalBarberName = cleanData.barberName;

    if (finalBarberId === 'any') {
      const { data: employees } = await supabaseAdmin
        .from('entities')
        .select('id, name, metadata')
        .eq('tenant_id', cleanData.tenantId)
        .in('type', ['employee', 'doctor', 'staff'])
        .neq('status', 'inactive')
        .is('deleted_at', null);
        
      if (employees && employees.length > 0) {
        // Revisar si los empleados tienen cita activa en ese rango horario
        const { data: busyApps } = await supabaseAdmin
          .from('appointments')
          .select('id, employee_id, metadata')
          .eq('tenant_id', cleanData.tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .lt('start_time', endDateTime.toISOString())
          .gt('end_time', startDateTime.toISOString());
          
        const busyIds = new Set(
          (busyApps || [])
            .filter(a => {
              const meta = a.metadata || {};
              const isGroup = Boolean(meta.is_group_class || meta.is_fixed_class || (meta.max_capacity && Number(meta.max_capacity) > 1));
              if (isGroup) {
                const maxCap = Number(meta.max_capacity) || 4;
                const count = Array.isArray(meta.attendees) ? meta.attendees.length : 1;
                return count >= maxCap; // Solo ocupa si está lleno
              }
              return true;
            })
            .map(a => a.employee_id)
        );
        const availableEmployees = employees.filter(emp => 
          !busyIds.has(emp.id) && 
          emp.metadata?.bookable !== false &&
          checkDoctorWorking(emp.metadata, cleanData.time, duration)
        );

        if (availableEmployees.length > 0) {
          let candidatePool = availableEmployees;
          if (cleanData.serviceName) {
            const matchedSpecialists = availableEmployees.filter(emp => matchesEmployeeService(emp, cleanData.serviceName!));
            if (matchedSpecialists.length > 0) {
              candidatePool = matchedSpecialists;
            }
          }
          const chosenEmp = candidatePool[Math.floor(Math.random() * candidatePool.length)];
          finalBarberId = chosenEmp.id;
          finalBarberName = chosenEmp.name;
        } else {
          return { success: false, error: 'No hay profesionales en turno o están ocupados en este horario exacto. Por favor elige otra hora.' };
        }
      } else {
        return { success: false, error: 'No hay profesionales disponibles en este momento.' };
      }
    } else {
      // 0. Validar jornada laboral del profesional solicitado
      const { data: requestedStaff } = await supabaseAdmin
        .from('entities')
        .select('id, name, metadata')
        .eq('id', finalBarberId)
        .maybeSingle();

      if (requestedStaff?.metadata && !checkDoctorWorking(requestedStaff.metadata, cleanData.time, duration)) {
        return {
          success: false,
          error: `El profesional "${requestedStaff.name || 'seleccionado'}" no atiende en ese horario. Por favor selecciona una hora dentro de su jornada de atención.`
        };
      }

      // Prevención de colisión y Soporte de Clases Grupales Compartidas (Multi-Alumno)
      const { data: overlapping } = await supabaseAdmin
        .from('appointments')
        .select('id, title, metadata, client_id, start_time, end_time')
        .eq('tenant_id', cleanData.tenantId)
        .eq('employee_id', finalBarberId)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .lt('start_time', endDateTime.toISOString())
        .gt('end_time', startDateTime.toISOString())
        .limit(1);

      if (overlapping && overlapping.length > 0) {
        const existingAppt = overlapping[0];
        const existingMeta = (existingAppt.metadata as Record<string, any>) || {};
        const isGroupClass = Boolean(
          existingMeta.is_group_class === true &&
          Number(existingMeta.max_capacity || 0) > 1
        );

        if (!isGroupClass) {
          return {
            success: false,
            error: 'Lo sentimos, este turno ya está reservado para este profesional. Por favor elige otro horario.',
          };
        }

        const maxCapacity = Number(existingMeta.max_capacity) || 4;
        let attendees: Array<{ id: string; name: string; phone?: string; payment_status?: string; joined_at?: string }> = 
          Array.isArray(existingMeta.attendees) ? [...existingMeta.attendees] : [];

        if (attendees.length === 0 && existingAppt.client_id) {
          attendees.push({
            id: existingAppt.client_id,
            name: existingMeta.client_name || existingAppt.title || 'Alumno 1',
            phone: existingMeta.client_phone || '',
            payment_status: 'confirmed',
            joined_at: existingAppt.start_time
          });
        }

        if (attendees.length >= maxCapacity) {
          return {
            success: false,
            error: `Esta clase grupal ya está completa (${maxCapacity}/${maxCapacity} cupos ocupados). Por favor selecciona otro horario.`,
          };
        }

        // El alumno se une a la clase grupal existente
        const attendeeRecord = {
          id: entityClientId || crypto.randomUUID(),
          name: fullName,
          phone: cleanData.phone || '',
          payment_status: 'pending',
          joined_at: new Date().toISOString()
        };
        attendees.push(attendeeRecord);

        const updatedMetadata = {
          ...existingMeta,
          attendees,
          is_group_class: true,
          max_capacity: maxCapacity
        };

        const isSports = (existingAppt.title || '').includes('🎾') || (cleanData.serviceName || '').toLowerCase().includes('padel') || (cleanData.serviceName || '').toLowerCase().includes('tenis');
        const shortNames = attendees.map(a => a.name.split(' ')[0]).join(', ');
        const updatedTitle = isSports
          ? `🎾 Clase Grupal (${attendees.length}/${maxCapacity}) - ${shortNames}`
          : `Sesión Grupal (${attendees.length}/${maxCapacity}) - ${shortNames}`;

        await supabaseAdmin
          .from('appointments')
          .update({
            metadata: updatedMetadata,
            title: updatedTitle
          })
          .eq('id', existingAppt.id);

        await eventBus.emit('appointment.booked', {
          appointmentId: existingAppt.id,
          tenantId: cleanData.tenantId,
          customerName: fullName,
          customerPhone: cleanData.phone || undefined,
          barberId: finalBarberId,
          date: cleanData.date,
          time: cleanData.time,
          durationMinutes: duration,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: `¡Cupo reservado con éxito! (Cupo ${attendees.length} de ${maxCapacity})`,
          assignedBarberName: finalBarberName,
          isGroupJoin: true,
          spotNumber: attendees.length,
          maxCapacity
        };
      }
    }

    // Obtener color asignado al profesional para la agenda
    let staffColor = '#6366f1';
    if (finalBarberId) {
      try {
        const { data: staffData } = await supabaseAdmin
          .from('entities')
          .select('metadata')
          .eq('id', finalBarberId)
          .maybeSingle();
        if (staffData?.metadata?.color) {
          staffColor = staffData.metadata.color;
        }
      } catch (e) {
        console.warn('[Booking] Could not fetch staff color:', e);
      }
    }

    // Detección estricta: solo es clase grupal si se solicita explícitamente con aforo > 1 o servicio de pádel/tenis grupal
    const serviceNorm = (cleanData.serviceName || '').toLowerCase();
    const isSportsService = serviceNorm.includes('padel') || serviceNorm.includes('pádel') || serviceNorm.includes('tenis');
    const isGroupClass = Boolean(
      (cleanData.isGroupClass && Number(cleanData.maxCapacity || 0) > 1) ||
      (isSportsService && (serviceNorm.includes('grupal') || serviceNorm.includes('grupo')))
    );
    const maxCapacity = cleanData.maxCapacity || (isGroupClass ? 4 : 1);
    const initialAttendees = isGroupClass
      ? [{ id: entityClientId || crypto.randomUUID(), name: fullName, phone: cleanData.phone || '', payment_status: 'pending', joined_at: new Date().toISOString() }]
      : undefined;

    // INSERCIÓN REAL EN LA BASE DE DATOS
    let createdApptId: string = crypto.randomUUID();
    // Título principal siempre es el nombre del paciente
    const apptTitle = isGroupClass
      ? (isSportsService ? `🎾 Clase Grupal (${initialAttendees?.length || 1}/${maxCapacity}) - ${fullName}` : `Sesión Grupal (${initialAttendees?.length || 1}/${maxCapacity}) - ${fullName}`)
      : fullName;

    const { data: insertedAppt, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        id: createdApptId,
        tenant_id: cleanData.tenantId,
        client_id: entityClientId,
        employee_id: finalBarberId,
        title: apptTitle,
        client_name: fullName,
        service_name: cleanData.serviceName || 'Consulta General',
        description: cleanData.serviceName ? `Procedimiento: ${cleanData.serviceName}` : 'Consulta General',
        price: cleanData.price || 0,
        metadata: { 
          client_name: fullName, 
          client_phone: cleanData.phone || undefined,
          employee_name: finalBarberName,
          entity_id: entityClientId,
          durationMinutes: duration,
          service_name: cleanData.serviceName || undefined,
          price: cleanData.price || 0,
          color: staffColor,
          is_group_class: isGroupClass,
          max_capacity: maxCapacity,
          attendees: initialAttendees
        },
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'scheduled',
        notes: cleanData.serviceName ? `Procedimiento: ${cleanData.serviceName}${cleanData.phone ? ` | Tel: ${cleanData.phone}` : ''}` : `Reserva web${cleanData.phone ? ` | Tel: ${cleanData.phone}` : ''}`
      })
      .select('id')
      .maybeSingle();

    if (insertedAppt?.id) {
      createdApptId = insertedAppt.id;
    }

    if (error) {
      console.error('[Booking Primary Error]:', error);
      
      // Si el error es por columnas faltantes (metadata, notes, etc.), intentar solo con columnas básicas
      const isMissingCol = error.code === '42703' || 
        (error.message && error.message.includes('column') && error.message.includes('does not exist')) ||
        (error.message && error.message.includes('schema cache'));
      
      if (isMissingCol) {
        console.log('[Booking] Fallback: inserting with basic columns only');
        const { data: fallbackAppt, error: fallbackError } = await supabaseAdmin
          .from('appointments')
          .insert({
            id: createdApptId,
            tenant_id: cleanData.tenantId,
            employee_id: finalBarberId,
            title: fullName,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'scheduled',
          })
          .select('id')
          .maybeSingle();
        
        if (fallbackAppt?.id) createdApptId = fallbackAppt.id;
        
        if (fallbackError) {
          console.error('[Booking Fallback Error]:', fallbackError);
          
          // Si aún falla, intentar con la tabla documents como último recurso
          const { error: docError } = await supabaseAdmin
            .from('documents')
            .insert({
              tenant_id: cleanData.tenantId,
              entity_id: null,
              type: 'work_order',
              status: 'draft',
              document_number: `CIT-${Date.now().toString().slice(-6)}`,
              subtotal_amount: 0,
              tax_amount: 0,
              total_amount: 0,
              metadata: {
                title: fullName,
                employee_id: finalBarberId,
                employee_name: finalBarberName,
                service_name: cleanData.serviceName,
                issue_date: startDateTime.toISOString(),
                due_date: endDateTime.toISOString(),
                client_name: fullName,
                booking_source: 'public_web',
              },
            });
          
          if (docError) {
            console.error('[Booking Documents Fallback Error]:', docError);
            return { success: false, error: `Error DB: ${docError.message}` };
          }
          return { 
            success: true, 
            message: 'Reserva procesada exitosamente.', 
            assignedBarberId: finalBarberId,
            assignedBarberName: finalBarberName,
            appointmentId: createdApptId 
          };
        }
      } else if (error.code === '23505' || error.message?.includes('unique_appointment_slot') || error.message?.includes('duplicate key')) {
        return { success: false, error: 'Lo sentimos, este turno acaba de ser ocupado por otro paciente. Por favor elige otro horario.' };
      } else {
        return { success: false, error: `Error DB: ${error.message}` };
      }
    }

    // Blindaje Concurrente Nivel 2: Comprobación post-inserción inmediata contra condiciones de carrera
    if (finalBarberId && finalBarberId !== 'any') {
      try {
        const { data: activeClashes } = await supabaseAdmin
          .from('appointments')
          .select('id, created_at')
          .eq('tenant_id', cleanData.tenantId)
          .eq('employee_id', finalBarberId)
          .eq('start_time', startDateTime.toISOString())
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .order('created_at', { ascending: true });

        if (activeClashes && activeClashes.length > 1) {
          const firstWinner = activeClashes[0];
          if (firstWinner.id !== createdApptId) {
            console.warn(`[Anti-Collision] Carrera interceptada para cita ${createdApptId}. Ganador: ${firstWinner.id}. Revirtiendo.`);
            await supabaseAdmin.from('appointments').delete().eq('id', createdApptId);
            return {
              success: false,
              error: 'Lo sentimos, este turno acaba de ser reservado por otro paciente en este instante. Por favor selecciona otro horario.'
            };
          }
        }
      } catch (checkErr) {
        console.warn('[Anti-Collision] Verificación post-inserción no bloqueante:', checkErr);
      }
    }

    // Emisión desacoplada de evento de dominio (Estilo Odoo 17)
    await eventBus.emit('appointment.booked', {
      appointmentId: createdApptId,
      tenantId: cleanData.tenantId,
      customerName: fullName,
      customerPhone: cleanData.phone || undefined,
      barberId: finalBarberId,
      date: cleanData.date,
      time: cleanData.time,
      durationMinutes: duration,
      timestamp: new Date().toISOString(),
    });

    return { 
      success: true, 
      message: 'Reserva procesada exitosamente.', 
      assignedBarberId: finalBarberId,
      assignedBarberName: finalBarberName,
      appointmentId: createdApptId 
    };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      const firstMsg = error.issues?.[0]?.message || error.errors?.[0]?.message || 'Datos de reserva inválidos.';
      return { success: false, error: firstMsg };
    }
    const realMsg = error?.message || String(error);
    console.error('[Server Error in processBookingAction]:', realMsg);
    return { 
      success: false, 
      error: `Error en el servidor de reservas: ${realMsg || 'No se pudo completar la operación en la base de datos.'}` 
    };
  }
}

// NUEVA FUNCIÓN PARA LEER HORAS OCUPADAS (SERVER ACTION)
export async function getBookedTimesAction(
  tenantId: string, 
  employeeId: string, 
  date: string, 
  timezoneOffset?: string,
  serviceName?: string
) {
  try {
    if (!tenantId || !date || typeof date !== 'string') {
      return { success: false, bookedTimes: [], groupSlots: {} };
    }
    const tzOffset = timezoneOffset && /^[+-]\d{2}:\d{2}$/.test(timezoneOffset) ? timezoneOffset : '-04:00';
    const offsetMs = parseOffsetToMs(tzOffset);
    // Ventana ampliada de 24 horas antes y después para nunca perder citas por discrepancias entre UTC y hora local
    const startDate = new Date(`${date}T00:00:00${tzOffset}`);
    const endDate = new Date(`${date}T23:59:59${tzOffset}`);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, bookedTimes: [], groupSlots: {} };
    }
    const windowStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('appointments')
      .select('id, start_time, end_time, employee_id, status, metadata')
      .eq('tenant_id', tenantId)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .neq('status', 'cancelled')
      .neq('status', 'no_show');
      
    if (employeeId !== 'any') {
      // Bloquea tanto las citas asignadas al colaborador como los bloqueos generales de la empresa (employee_id nulo)
      query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
    }

    const { data: appointments, error } = await query;
    if (error) {
      console.error('[getBookedTimesAction Query Error]:', error.message || error);
      return { success: false, bookedTimes: [], groupSlots: {}, error: error.message };
    }

    const bookedTimesSet = new Set<string>();
    const groupSlotsInfo: Record<string, { spotsTaken: number; maxCapacity: number; remainingSpots: number }> = {};

    if (employeeId === 'any') {
      // Si es "Cualquiera", debemos contar cuántos empleados reservables activos hay en la empresa.
      const { data: staffEntities } = await supabaseAdmin
        .from('entities')
        .select('id, name, metadata')
        .eq('tenant_id', tenantId)
        .in('type', ['employee', 'doctor', 'staff'])
        .neq('status', 'inactive')
        .is('deleted_at', null);
        
      const bookableStaff = (staffEntities || []).filter(e => (e.metadata as any)?.bookable !== false);
      
      // Filtrar profesionales compatibles si se especificó el servicio
      let eligibleStaff = bookableStaff;
      if (serviceName && typeof serviceName === 'string' && serviceName.trim()) {
        const matchedStaff = bookableStaff.filter(emp => matchesEmployeeService(emp, serviceName));
        if (matchedStaff.length > 0) {
          eligibleStaff = matchedStaff;
        }
      }

      const allStaffIds = new Set(eligibleStaff.map(s => s.id));
      
      // Determinar día de la semana para comprobar jornadas laborales de cada médico
      const parts = date.split('-');
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const mappingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = mappingDays[dObj.getDay()] || 'monday';

      const isEmpWorkingAtTime = (emp: any, hh: string, mm: string) => {
        const wh = emp.metadata?.working_hours;
        if (wh && typeof wh === 'object' && Object.keys(wh).length > 0) {
          const shifts = wh[dayKey] || [];
          if (!Array.isArray(shifts) || shifts.length === 0) return false;
          const slotMins = Number(hh) * 60 + Number(mm);
          return shifts.some((s: any) => {
            if (!s?.start || !s?.end) return false;
            const [sH, sM] = s.start.split(':').map(Number);
            const [eH, eM] = s.end.split(':').map(Number);
            return slotMins >= (sH * 60 + sM) && slotMins < (eH * 60 + eM);
          });
        }
        return true;
      };

      // Mapeamos cada slot de tiempo al conteo de empleados ocupados
      const timeSlotOccupancy = new Map<string, Set<string>>();

      (appointments || []).forEach((r: any) => {
        let current = new Date(r.start_time).getTime();
        const rawEnd = new Date(r.end_time || (current + 45 * 60000)).getTime();
        
        if (isNaN(current) || isNaN(rawEnd) || current >= rawEnd) return;
        const end = Math.min(rawEnd, current + 24 * 60 * 60 * 1000);

        const meta = r.metadata || {};
        const isGroup = Boolean(meta.is_group_class === true && Number(meta.max_capacity || 0) > 1);
        const maxCap = Number(meta.max_capacity || 0);
        const attendeesCount = Array.isArray(meta.attendees) ? meta.attendees.length : (r.client_id ? 1 : 0);
        const hasFreeSpots = isGroup && maxCap > 1 && attendeesCount < maxCap;
        
        while (current < end) {
          const localD = new Date(current + offsetMs);
          const localDateStr = localD.toISOString().slice(0, 10);
          
          if (localDateStr === date) {
            const hh = localD.getUTCHours().toString().padStart(2, '0');
            const mm = localD.getUTCMinutes().toString().padStart(2, '0');
            const timeKey = `${hh}:${mm}`;
            
            if (hasFreeSpots) {
              groupSlotsInfo[timeKey] = {
                spotsTaken: attendeesCount,
                maxCapacity: maxCap,
                remainingSpots: maxCap - attendeesCount
              };
            } else {
              if (!timeSlotOccupancy.has(timeKey)) {
                timeSlotOccupancy.set(timeKey, new Set());
              }
              if (r.employee_id) {
                timeSlotOccupancy.get(timeKey)!.add(r.employee_id);
              } else {
                // Bloqueo general del negocio: ocupa a todos los profesionales
                allStaffIds.forEach(id => timeSlotOccupancy.get(timeKey)!.add(id));
              }
            }
          }
          current += 15 * 60000;
        }
      });

      // Bloquear cualquier horario donde todos los profesionales en turno estén ocupados o no haya nadie en turno
      for (let m = 6 * 60; m <= 22 * 60; m += 15) {
        const hh = Math.floor(m / 60).toString().padStart(2, '0');
        const mm = (m % 60).toString().padStart(2, '0');
        const timeKey = `${hh}:${mm}`;

        const workingStaff = eligibleStaff.filter(emp => isEmpWorkingAtTime(emp, hh, mm));
        const busyStaff = timeSlotOccupancy.get(timeKey) || new Set<string>();

        // Si ningún colaborador elegible atiende en este horario, o todos los que atienden están ocupados
        if (workingStaff.length === 0 || busyStaff.size >= workingStaff.length) {
          bookedTimesSet.add(timeKey);
        }
      }

    } else {
      // Lógica para un solo empleado / médico
      const { data: singleStaff } = await supabaseAdmin
        .from('entities')
        .select('id, name, metadata')
        .eq('id', employeeId)
        .maybeSingle();

      const wh = singleStaff?.metadata?.working_hours;
      const parts = date.split('-');
      const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const mappingDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = mappingDays[dObj.getDay()] || 'monday';

      const isWorkingAtTime = (hh: string, mm: string) => {
        if (wh && typeof wh === 'object' && Object.keys(wh).length > 0) {
          const shifts = wh[dayKey] || [];
          if (!Array.isArray(shifts) || shifts.length === 0) return false;
          const slotMins = Number(hh) * 60 + Number(mm);
          return shifts.some((s: any) => {
            if (!s?.start || !s?.end) return false;
            const [sH, sM] = s.start.split(':').map(Number);
            const [eH, eM] = s.end.split(':').map(Number);
            return slotMins >= (sH * 60 + sM) && slotMins < (eH * 60 + eM);
          });
        }
        return true;
      };

      // Si tiene turnos configurados, bloquear cualquier horario fuera de su jornada
      if (wh && typeof wh === 'object' && Object.keys(wh).length > 0) {
        for (let m = 6 * 60; m <= 22 * 60; m += 15) {
          const hh = Math.floor(m / 60).toString().padStart(2, '0');
          const mm = (m % 60).toString().padStart(2, '0');
          if (!isWorkingAtTime(hh, mm)) {
            bookedTimesSet.add(`${hh}:${mm}`);
          }
        }
      }

      (appointments || []).forEach((r: any) => {
         let current = new Date(r.start_time).getTime();
         const rawEnd = new Date(r.end_time || (current + 45 * 60000)).getTime();
         
         if (isNaN(current) || isNaN(rawEnd) || current >= rawEnd) return;
         const end = Math.min(rawEnd, current + 24 * 60 * 60 * 1000);

         const meta = r.metadata || {};
         const isGroup = Boolean(meta.is_group_class === true && Number(meta.max_capacity || 0) > 1);
         const maxCap = Number(meta.max_capacity || 0);
         const attendeesCount = Array.isArray(meta.attendees) ? meta.attendees.length : (r.client_id ? 1 : 0);
         const hasFreeSpots = isGroup && maxCap > 1 && attendeesCount < maxCap;
         
         while (current < end) {
           const localD = new Date(current + offsetMs);
           const localDateStr = localD.toISOString().slice(0, 10);
           if (localDateStr === date) {
             const hh = localD.getUTCHours().toString().padStart(2, '0');
             const mm = localD.getUTCMinutes().toString().padStart(2, '0');
             const timeKey = `${hh}:${mm}`;

             if (hasFreeSpots) {
               groupSlotsInfo[timeKey] = {
                 spotsTaken: attendeesCount,
                 maxCapacity: maxCap,
                 remainingSpots: maxCap - attendeesCount
               };
             } else {
               bookedTimesSet.add(timeKey);
             }
           }
           current += 15 * 60000;
         }
      });
    }

    return { 
      success: true, 
      bookedTimes: Array.from(bookedTimesSet),
      groupSlots: groupSlotsInfo
    };
  } catch (error: any) {
    console.error('Error fetching booked times:', error?.message || error);
    return { success: false, bookedTimes: [], groupSlots: {}, error: error?.message || 'Error al obtener horarios' };
  }
}

// NUEVA FUNCIÓN PARA ACTUALIZAR SOLO LA CONFIGURACIÓN DE RESERVAS
export async function updateBookingConfigAction(tenantId: string, settings: any, actor: ActionActor) {
  try {
    if (!actor) {
      return { success: false, error: 'Actor de sesión requerido.' };
    }

    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado a la configuración.' };
    }

    // 1. Obtener la metadata actual para no sobreescribir otros datos
    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // Extraer publicTheme si viene en el payload
    const { publicTheme, ...bookingSettings } = settings;

    // Sanitización estricta de intervalos de tiempo para prevenir DoS en navegador
    if (bookingSettings.intervalMinutes !== undefined) {
      const parsed = Number(bookingSettings.intervalMinutes);
      bookingSettings.intervalMinutes = (!isNaN(parsed) && parsed >= 5) ? Math.floor(parsed) : 30;
    }
    if (bookingSettings.slotDuration !== undefined) {
      const parsed = Number(bookingSettings.slotDuration);
      bookingSettings.slotDuration = (!isNaN(parsed) && parsed >= 5) ? Math.floor(parsed) : 30;
    }

    // Sanitización de número de WhatsApp para enlace universal wa.me
    if (bookingSettings.whatsappNumber !== undefined) {
      let num = String(bookingSettings.whatsappNumber || '').replace(/[^0-9]/g, '');
      if (num.startsWith('0')) {
        num = '58' + num.slice(1);
      } else if (num.length === 10 && (num.startsWith('412') || num.startsWith('414') || num.startsWith('424') || num.startsWith('416') || num.startsWith('426'))) {
        num = '58' + num;
      }
      bookingSettings.whatsappNumber = num;
    }
    
    // 2. Fusionar la metadata actual con la nueva configuración
    const newMetadata = {
      ...(tenant.metadata || {}),
      booking_settings: bookingSettings
    };

    if (settings.courts && Array.isArray(settings.courts)) {
      newMetadata.courts = settings.courts;
    }
    
    if (bookingSettings.logoUrl) {
      newMetadata.logo_url = bookingSettings.logoUrl;
    }
    
    if (publicTheme) {
      const cleanBg = normalizeHexColor(publicTheme.bgColor, '#ffffff');
      const cleanBtn = normalizeHexColor(publicTheme.btnColor, '#0B3B24');
      newMetadata.public_theme = {
        ...(tenant.metadata?.public_theme || {}),
        ...publicTheme,
        bgColor: cleanBg,
        btnColor: cleanBtn,
        logoUrl: bookingSettings.logoUrl || publicTheme.logoUrl || newMetadata.logo_url
      };
    }
    
    // 3. Guardar en la base de datos
    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update({ metadata: newMetadata })
      .eq('id', tenantId);
      
    if (updateError) throw updateError;
    
    return { success: true, metadata: newMetadata };
  } catch (error: any) {
    console.error('[Settings Update Error]:', error);
    return { success: false, error: error.message };
  }
}
