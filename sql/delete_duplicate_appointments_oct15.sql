-- ==============================================================================
-- ELIMINACIÓN DE CITAS DUPLICADAS: CONSULTORIO 25 (15 DE OCTUBRE A LAS 12:00 PM)
-- ==============================================================================
-- 1. Elimina las reservas de Luis Abdul y Salma Abdul para dejar el turno 100% libre.
-- 2. Activa el índice único para que NUNCA MÁS pueda ocurrir una doble reserva.
-- ==============================================================================

-- PASO 1: Eliminar las citas duplicadas del 15 de octubre a las 12:00 PM
DELETE FROM appointments
WHERE tenant_id = '4062a8fe-f512-455c-8192-2f83c55ed732'
  AND employee_id = '937272d5-d0b9-4c80-a9db-8ba87ab37611'
  AND start_time = '2026-10-15 12:00:00+00';

-- En caso de que se hayan registrado con variaciones de segundos o notas de teléfono:
DELETE FROM appointments
WHERE tenant_id = '4062a8fe-f512-455c-8192-2f83c55ed732'
  AND (
    notes ILIKE '%04145254944%' OR 
    notes ILIKE '%04245548188%' OR
    notes ILIKE '%Luis Abdul%' OR
    notes ILIKE '%salma abdul%'
  );

-- PASO 2: Crear el índice único parcial definitivo
-- Garantiza a nivel de motor PostgreSQL que NUNCA pueda existir una doble reserva activa
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment_slot 
ON appointments (tenant_id, employee_id, start_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- PASO 3: Verificar que el turno quedó 100% libre (debe devolver 0 filas)
SELECT id, title, start_time, employee_id, status, notes
FROM appointments
WHERE tenant_id = '4062a8fe-f512-455c-8192-2f83c55ed732'
  AND start_time = '2026-10-15 12:00:00+00';
