-- ============================================================
-- Migración: Índices de Alto Rendimiento y Estabilidad Modular
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Asegurar columna active_modules en tabla tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS active_modules jsonb 
  DEFAULT '["config", "clientes", "catalogo", "calendario", "equipo", "caja", "whatsapp"]'::jsonb;

-- 2. Índice para búsqueda ultra-rápida de clientes por teléfono (booking.ts / CRM)
CREATE INDEX IF NOT EXISTS idx_entities_tenant_type_phone 
  ON entities (tenant_id, type, phone) 
  WHERE phone IS NOT NULL;

-- 3. Índice para listado de empleados/clientes activos por empresa
CREATE INDEX IF NOT EXISTS idx_entities_tenant_type_status 
  ON entities (tenant_id, type, status);

-- 4. Índice para verificación de disponibilidad de turnos (booking.ts / appointments.ts)
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_employee_time 
  ON appointments (tenant_id, employee_id, start_time, end_time);

-- 5. Índice para consultas de citas por rango de fecha
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_range 
  ON appointments (tenant_id, start_time DESC);

-- 6. Procedimiento RPC para Asientos Contables Atómicos (ACID)
-- Garantiza que el encabezado y todas las líneas se inserten en una sola transacción
CREATE OR REPLACE FUNCTION insert_journal_transaction(
  p_tenant_id UUID,
  p_document_id UUID,
  p_description TEXT,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry_id UUID;
  v_line RECORD;
BEGIN
  -- Insertar encabezado de asiento
  INSERT INTO journal_entries (tenant_id, document_id, description, status)
  VALUES (p_tenant_id, p_document_id, p_description, 'posted')
  RETURNING id INTO v_entry_id;

  -- Insertar cada línea dentro de la misma transacción
  FOR v_line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(
    account_code TEXT,
    account_name TEXT,
    debit NUMERIC,
    credit NUMERIC,
    description TEXT
  )
  LOOP
    INSERT INTO journal_entry_lines (
      journal_entry_id,
      account_code,
      account_name,
      debit,
      credit,
      description
    ) VALUES (
      v_entry_id,
      COALESCE(v_line.account_code, '0000'),
      COALESCE(v_line.account_name, 'General'),
      COALESCE(v_line.debit, 0),
      COALESCE(v_line.credit, 0),
      v_line.description
    );
  END LOOP;

  RETURN jsonb_build_object('success', true, 'entry_id', v_entry_id);
EXCEPTION WHEN OTHERS THEN
  -- PostgreSQL automáticamente hace rollback de todo el bloque
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
