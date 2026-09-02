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
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return { success: false, error: `Demasiados intentos. Espera ${Math.ceil(rateLimit.retryAfterSecs / 60)} minutos.` };
    }

    const cleanData = bookingSchema.parse(formData);
    const fullName = `${cleanData.firstName} ${cleanData.lastName}`;
    
    // Calcular el timestamp exacto en UTC
    const startDateTime = new Date(`${cleanData.date}T${cleanData.time}:00`);
    // Por ahora, asumimos una duración estándar de 45 minutos (hasta que hagamos el panel de config)
    const endDateTime = new Date(startDateTime.getTime() + 45 * 60000);

    // INSERCIÓN REAL EN LA BASE DE DATOS
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        tenant_id: cleanData.tenantId,
        client_name: fullName,
        employee_id: cleanData.barberId,
        employee_name: cleanData.barberName,
        title: `Cita Web - ${fullName}`,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'scheduled',
        metadata: { source: 'public_web', ip_address: ip }
      })
      .select()
      .single();

    if (error) {
      console.error('[Booking Error]:', error);
      // Validar si el error es de overbooking (Unique Constraint)
      if (error.code === '23505' || error.message.includes('unique_appointment_slot')) {
         return { success: false, error: 'Lo sentimos, este turno acaba de ser ocupado. Por favor elige otro.' };
      }
      return { success: false, error: 'Ocurrió un error al guardar la reserva en el servidor.' };
    }

    return { success: true, message: 'Reserva procesada exitosamente.', appointment: data };
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
    const { data, error } = await supabaseAdmin
      .rpc('get_booked_times_public', {
        p_tenant_id: tenantId,
        p_employee_id: employeeId,
        p_date: date
      });
      
    if (error) throw error;
    // La función devuelve un arreglo de { booked_time: "10:00:00" }
    return { success: true, bookedTimes: data.map((r: any) => r.booked_time.substring(0, 5)) };
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
    
    return { success: true };
  } catch (error: any) {
    console.error('[Settings Update Error]:', error);
    return { success: false, error: error.message };
  }
}
