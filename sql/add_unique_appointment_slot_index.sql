-- ==============================================================================
-- Migración: Índice único parcial para prevención de sobre-reserva (Double Booking)
-- Evita condiciones de carrera a nivel de PostgreSQL / Supabase
-- Es 100% aditivo: no borra ni renombra ninguna columna existente.
-- ==============================================================================

-- 1. Índice único condicional para evitar citas simultáneas con el mismo especialista
-- Solo aplica a citas activas (excluye canceladas y no asistidas).
-- Permite que si una cita se cancela, el horario quede inmediatamente disponible.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment_slot 
ON appointments (tenant_id, employee_id, start_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- 2. Índice de aceleración para búsquedas de rango horario por empresa y especialista
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_emp_range 
ON appointments (tenant_id, employee_id, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');
