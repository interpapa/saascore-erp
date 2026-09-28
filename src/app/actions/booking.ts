'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { eventBus } from '@/lib/core/events/eventBus';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { ActionActor } from './entities';

const bookingSchema = z.object({
  tenantId: z.string().uuid('ID de empresa inválido'),
  barberId: z.string(), // Permite UUID o 'any'
  barberName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 letras').max(50).trim(),
  lastName: z.string().max(50).trim().optional().or(z.literal('')),
  phone: z.string().max(30).trim().optional().or(z.literal('')),
  durationMinutes: z.number().optional(),
  timezoneOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/).optional(),
  price: z.number().optional(),
  serviceName: z.string().optional(),
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
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || '127.0.0.1';
    
    // Protección Anti-Spam activada
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return { success: false, error: `Demasiados intentos. Por favor espera ${rateLimit.retryAfterSecs} segundos.` };
    }

    const cleanData = bookingSchema.parse(formData);

    // Validación Backend de Módulo Activo (Estilo Odoo 17)
    const moduleCheck = await assertModuleEnabled(cleanData.tenantId, 'calendario');
    if (!moduleCheck.authorized) {
      return { 
        success: false, 
        error: moduleCheck.error || 'El sistema de reservas está temporalmente inactivo para esta empresa.' 
      };
    }

    const fullName = `${cleanData.firstName} ${cleanData.lastName || ''}`.trim();
    
    // Usamos el timezone del cliente/negocio para que la hora en base de datos coincida con la hora local
    const tzOffset = cleanData.timezoneOffset || '-04:00';
    const startDateTime = new Date(`${cleanData.date}T${cleanData.time}:00${tzOffset}`);
    
    // Usamos la duración enviada, o 60 minutos por defecto
    const duration = cleanData.durationMinutes || 60;
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    let finalBarberId = cleanData.barberId;
    let finalBarberName = cleanData.barberName;

    if (finalBarberId === 'any') {
      const { data: employees } = await supabaseAdmin
        .from('entities')
        .select('id, name')
        .eq('tenant_id', cleanData.tenantId)
        .eq('type', 'employee')
        .eq('status', 'active');
        
      if (employees && employees.length > 0) {
        // Revisar si los empleados tienen cita activa en ese rango horario
        const { data: busyApps } = await supabaseAdmin
          .from('appointments')
          .select('employee_id')
          .eq('tenant_id', cleanData.tenantId)
          .neq('status', 'cancelled')
          .neq('status', 'no_show')
          .neq('status', 'completed')
          .lt('start_time', endDateTime.toISOString())
          .gt('end_time', startDateTime.toISOString());
          
        const busyIds = new Set((busyApps || []).map(a => a.employee_id));
        const availableEmployees = employees.filter(emp => !busyIds.has(emp.id));

        if (availableEmployees.length > 0) {
          const randomEmp = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
          finalBarberId = randomEmp.id;
          finalBarberName = randomEmp.name;
        } else {
          return { success: false, error: 'Todos los profesionales están ocupados en este horario exacto. Por favor elige otra hora.' };
        }
      } else {
        return { success: false, error: 'No hay profesionales disponibles en este momento.' };
      }
    } else {
      // Prevención de colisión defensiva para empleado específico
      const { data: overlapping } = await supabaseAdmin
        .from('appointments')
        .select('id, title')
        .eq('tenant_id', cleanData.tenantId)
        .eq('employee_id', finalBarberId)
        .neq('status', 'cancelled')
        .neq('status', 'no_show')
        .neq('status', 'completed')
        .lt('start_time', endDateTime.toISOString())
        .gt('end_time', startDateTime.toISOString())
        .limit(1);

      if (overlapping && overlapping.length > 0) {
        return {
          success: false,
          error: 'Lo sentimos, este turno ya está reservado para este profesional. Por favor elige otro horario.',
        };
      }
    }

    // Unificación de Contactos (Estilo Odoo res.partner):
    // Vincular o crear automáticamente al cliente en la tabla central 'entities'
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

    // INSERCIÓN REAL EN LA BASE DE DATOS
    // Intento 1: Insertar en 'appointments' con todas las columnas
    let createdApptId: string = crypto.randomUUID();
    const { data: insertedAppt, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        id: createdApptId,
        tenant_id: cleanData.tenantId,
        client_id: entityClientId,
        employee_id: finalBarberId,
        title: cleanData.serviceName ? `Cita: ${cleanData.serviceName} - ${fullName}` : `Cita Web - ${fullName}`,
        price: cleanData.price || 0,
        metadata: { 
          client_name: fullName, 
          client_phone: cleanData.phone || undefined,
          entity_id: entityClientId,
          durationMinutes: duration,
          service_name: cleanData.serviceName || undefined,
          price: cleanData.price || 0,
        },
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'scheduled',
        notes: `Reserva Pública - Cliente: ${fullName}${cleanData.serviceName ? ` | Servicio: ${cleanData.serviceName}` : ''}${cleanData.phone ? ` | Tel: ${cleanData.phone}` : ''}`
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
            title: `Cita Web - ${fullName}`,
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
                title: `Cita Web - ${fullName}`,
                employee_id: finalBarberId,
                employee_name: finalBarberName,
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
          return { success: true, message: 'Reserva procesada exitosamente.', assignedBarberName: finalBarberName };
        }
      } else if (error.code === '23505' || error.message.includes('unique_appointment_slot')) {
        return { success: false, error: 'Lo sentimos, este turno acaba de ser ocupado. Por favor elige otro.' };
      } else {
        return { success: false, error: `Error DB: ${error.message}` };
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

    return { success: true, message: 'Reserva procesada exitosamente.', assignedBarberName: finalBarberName };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: (error as any).errors[0].message };
    }
    console.error('[Server Error]:', error);
    return { success: false, error: 'Ha ocurrido un error inesperado en el servidor.' };
  }
}

// NUEVA FUNCIÓN PARA LEER HORAS OCUPADAS (SERVER ACTION)
export async function getBookedTimesAction(tenantId: string, employeeId: string, date: string, timezoneOffset?: string) {
  try {
    const tzOffset = timezoneOffset && /^[+-]\d{2}:\d{2}$/.test(timezoneOffset) ? timezoneOffset : '-04:00';
    const offsetMs = parseOffsetToMs(tzOffset);
    // Ventana ampliada de 24 horas antes y después para nunca perder citas por discrepancias entre UTC y hora local
    const startDate = new Date(`${date}T00:00:00${tzOffset}`);
    const endDate = new Date(`${date}T23:59:59${tzOffset}`);
    const windowStart = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const windowEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);

    let query = supabaseAdmin
      .from('appointments')
      .select('id, start_time, end_time, employee_id, status, metadata')
      .eq('tenant_id', tenantId)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString())
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .neq('status', 'completed');
      
    if (employeeId !== 'any') {
      // Bloquea tanto las citas asignadas al colaborador como los bloqueos generales de la empresa (employee_id nulo)
      query = query.or(`employee_id.eq.${employeeId},employee_id.is.null`);
    }

    const { data: appointments, error } = await query;
    if (error) throw error;

    const bookedTimesSet = new Set<string>();

    if (employeeId === 'any') {
      // Si es "Cualquiera", debemos contar cuántos empleados reservables activos hay en la empresa.
      const { data: staffEntities } = await supabaseAdmin
        .from('entities')
        .select('id, metadata')
        .eq('tenant_id', tenantId)
        .eq('type', 'employee')
        .eq('status', 'active');
        
      const bookableStaff = (staffEntities || []).filter(e => (e.metadata as any)?.bookable !== false);
      const totalStaff = Math.max(1, bookableStaff.length);
      const allStaffIds = new Set(bookableStaff.map(s => s.id));
      
      // Mapeamos cada slot de tiempo al conteo de empleados ocupados
      const timeSlotOccupancy = new Map<string, Set<string>>();

      (appointments || []).forEach((r: any) => {
        let current = new Date(r.start_time).getTime();
        const rawEnd = new Date(r.end_time || (current + 45 * 60000)).getTime();
        
        if (isNaN(current) || isNaN(rawEnd) || current >= rawEnd) return;
        const end = Math.min(rawEnd, current + 24 * 60 * 60 * 1000);
        
        while (current < end) {
          const localD = new Date(current + offsetMs);
          const localDateStr = localD.toISOString().slice(0, 10);
          
          if (localDateStr === date) {
            const hh = localD.getUTCHours().toString().padStart(2, '0');
            const mm = localD.getUTCMinutes().toString().padStart(2, '0');
            const timeKey = `${hh}:${mm}`;
            
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
          current += 15 * 60000;
        }
      });

      // Solo bloqueamos la hora si el número de empleados ocupados es MAYOR O IGUAL al total del staff reservable
      for (const [timeKey, busyEmployees] of Array.from(timeSlotOccupancy.entries())) {
        if (busyEmployees.size >= totalStaff) {
          bookedTimesSet.add(timeKey);
        }
      }

    } else {
      // Lógica para un solo empleado
      (appointments || []).forEach((r: any) => {
         let current = new Date(r.start_time).getTime();
         const rawEnd = new Date(r.end_time || (current + 45 * 60000)).getTime();
         
         if (isNaN(current) || isNaN(rawEnd) || current >= rawEnd) return;
         const end = Math.min(rawEnd, current + 24 * 60 * 60 * 1000);
         
         while (current < end) {
           const localD = new Date(current + offsetMs);
           const localDateStr = localD.toISOString().slice(0, 10);
           if (localDateStr === date) {
             const hh = localD.getUTCHours().toString().padStart(2, '0');
             const mm = localD.getUTCMinutes().toString().padStart(2, '0');
             bookedTimesSet.add(`${hh}:${mm}`);
           }
           current += 15 * 60000;
         }
      });
    }

    return { success: true, bookedTimes: Array.from(bookedTimesSet) };
  } catch (error) {
    console.error('Error fetching booked times:', error);
    return { success: false, bookedTimes: [] };
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
    
    if (bookingSettings.logoUrl) {
      newMetadata.logo_url = bookingSettings.logoUrl;
    }
    
    if (publicTheme) {
      newMetadata.public_theme = {
        ...(tenant.metadata?.public_theme || {}),
        ...publicTheme,
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
