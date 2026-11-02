-- ==============================================================================
-- SCRIPT DE RESOLUCIÓN DE COLISIONES Y CREACIÓN DE ÍNDICE ÚNICO (PRODUCCIÓN)
-- ==============================================================================
-- Este script soluciona el ERROR 23505:
-- 1. Identifica los duplicados históricos existentes en Consultorio 25 y demás empresas.
-- 2. Cancela los clones repetidos posteriores (conservando la primera cita original).
-- 3. Crea el índice único 'unique_active_appointment_slot' exitosamente.
-- ==============================================================================

-- PASO 1: Desactivar los duplicados existentes
-- (Mantiene la primera cita por orden de creación 'created_at' y cancela las repetidas)
WITH duplicated_appointments AS (
    SELECT id,
           ROW_NUMBER() OVER (
               PARTITION BY tenant_id, employee_id, start_time 
               ORDER BY created_at ASC, id ASC
           ) as row_num
    FROM appointments
    WHERE status NOT IN ('cancelled', 'no_show')
)
UPDATE appointments
SET status = 'cancelled',
    notes = COALESCE(notes, '') || ' [Cancelada automáticamente: resolución de sobre-reserva previa]'
WHERE id IN (
    SELECT id 
    FROM duplicated_appointments 
    WHERE row_num > 1
);

-- PASO 2: Crear el índice único parcial
-- Al estar canceladas las citas duplicadas, PostgreSQL crea el índice sin ningún error.
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_appointment_slot 
ON appointments (tenant_id, employee_id, start_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- PASO 3: Índice de aceleración de consultas por rango horario
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_emp_range 
ON appointments (tenant_id, employee_id, start_time, end_time) 
WHERE status NOT IN ('cancelled', 'no_show');

-- PASO 4: Verificación final (debe devolver 0 filas con colisión)
SELECT tenant_id, employee_id, start_time, COUNT(*) as citas_activas
FROM appointments
WHERE status NOT IN ('cancelled', 'no_show')
GROUP BY tenant_id, employee_id, start_time
HAVING COUNT(*) > 1;
