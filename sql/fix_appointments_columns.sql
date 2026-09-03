-- ============================================================
-- Migración: Agregar columnas faltantes a la tabla appointments
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar columna 'metadata' (JSONB, para datos flexibles)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Agregar columna 'notes' (TEXT, para notas del cliente)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes text;

-- Agregar columna 'description' (TEXT, descripción de la cita)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS description text;

-- Agregar columna 'price' (NUMERIC, precio del servicio)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS price numeric(12,2) DEFAULT 0;

-- Agregar columna 'client_id' (UUID, referencia al cliente en entities)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS client_id uuid;

-- Agregar columna 'service_id' (UUID, referencia al servicio en items)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS service_id uuid;

-- Verificar que las columnas principales ya existen
-- (estas probablemente ya están: id, tenant_id, employee_id, start_time, end_time, status, created_at, updated_at)

-- Dar permisos de RLS si es necesario (ya deben existir)
-- ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
