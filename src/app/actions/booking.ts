'use server';

import { z } from 'zod';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const bookingSchema = z.object({
  tenantId: z.string().uuid('ID de empresa inválido'),
  barberId: z.string().uuid('Debe seleccionar un barbero'),
  barberName: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 letras').max(50).trim(),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 letras').max(50).trim(),
});

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
    const ip = '127.0.0.1'; // Fallback IP


    const cleanData = bookingSchema.parse(formData);
    const fullName = `${cleanData.firstName} ${cleanData.lastName}`;
    
    // Forzar UTC para evitar problemas de zona horaria en el servidor de Vercel
    const startDateTime = new Date(`${cleanData.date}T${cleanData.time}:00Z`);
    // Por ahora, asumimos una duración estándar de 45 minutos (hasta que hagamos el panel de config)
    const endDateTime = new Date(startDateTime.getTime() + 45 * 60000);

    // INSERCIÓN REAL EN LA BASE DE DATOS
    // Intento 1: Insertar en 'appointments' con todas las columnas
    const { error } = await supabaseAdmin
      .from('appointments')
      .insert({
        tenant_id: cleanData.tenantId,
        employee_id: cleanData.barberId,
        metadata: { title: `Cita Web - ${fullName}` },
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'scheduled',
        notes: `Reserva Pública - Cliente: ${fullName}`
      });

    if (error) {
      console.error('[Booking Primary Error]:', error);
      
      // Si el error es por columnas faltantes (metadata, notes, etc.), intentar solo con columnas básicas
      const isMissingCol = error.code === '42703' || 
        (error.message && error.message.includes('column') && error.message.includes('does not exist')) ||
        (error.message && error.message.includes('schema cache'));
      
      if (isMissingCol) {
        console.log('[Booking] Fallback: inserting with basic columns only');
        const { error: fallbackError } = await supabaseAdmin
          .from('appointments')
          .insert({
            tenant_id: cleanData.tenantId,
            employee_id: cleanData.barberId,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            status: 'scheduled',
          });
        
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
                employee_id: cleanData.barberId,
                employee_name: cleanData.barberName,
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
        }
      } else if (error.code === '23505' || error.message.includes('unique_appointment_slot')) {
        return { success: false, error: 'Lo sentimos, este turno acaba de ser ocupado. Por favor elige otro.' };
      } else {
        return { success: false, error: `Error DB: ${error.message}` };
      }
    }

    return { success: true, message: 'Reserva procesada exitosamente.' };

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    console.error('[Server Error]:', error);
    return { success: false, error: 'Ha ocurrido un error inesperado en el servidor.' };
  }
}

// NUEVA FUNCIÓN PARA LEER HORAS OCUPADAS (SERVER ACTION)
export async function getBookedTimesAction(tenantId: string, employeeId: string, date: string) {
  try {
    // Buscamos todo el día forzando UTC para coincidir con cómo guardamos
    const startDate = new Date(`${date}T00:00:00Z`);
    const endDate = new Date(`${date}T23:59:59Z`);

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('employee_id', employeeId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .in('status', ['scheduled', 'confirmed']);
      
    if (error) throw error;
    
    // Extraemos todos los intervalos (cada 15 min) que están ocupados por citas
    const bookedTimesSet = new Set<string>();
    
    data.forEach((r: any) => {
       let current = new Date(r.start_time).getTime();
       const end = new Date(r.end_time || (current + 45 * 60000)).getTime();
       
       // Marcar cada bloque de 15 minutos dentro de la cita como ocupado
       while (current < end) {
         const d = new Date(current);
         const hh = d.getUTCHours().toString().padStart(2, '0');
         const mm = d.getUTCMinutes().toString().padStart(2, '0');
         bookedTimesSet.add(`${hh}:${mm}`);
         current += 15 * 60000;
       }
    });

    return { success: true, bookedTimes: Array.from(bookedTimesSet) };
  } catch (error) {
    console.error('Error fetching booked times:', error);
    return { success: false, bookedTimes: [] };
  }
}

// NUEVA FUNCIÓN PARA ACTUALIZAR SOLO LA CONFIGURACIÓN DE RESERVAS
export async function updateBookingConfigAction(tenantId: string, settings: any) {
  try {
    // 1. Obtener la metadata actual para no sobreescribir otros datos
    const { data: tenant, error: fetchError } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();
      
    if (fetchError) throw fetchError;
    
    // 2. Fusionar la metadata actual con la nueva configuración
    const newMetadata = {
      ...(tenant.metadata || {}),
      booking_settings: settings
    };
    
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
