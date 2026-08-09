-- ==============================================================================
-- MIGRACIÓN DE SEGURIDAD Y CONCURRENCIA: Decremento Atómico de Inventario
-- Archivo: supabase/migrations/20260806_atomic_stock.sql
-- ==============================================================================

-- Esta función ejecuta una resta atómica con bloqueo de fila en PostgreSQL
-- para evitar Race Conditions / Lost Updates en ventas simultáneas.

CREATE OR REPLACE FUNCTION decrement_item_stock(
  p_item_id UUID,
  p_quantity INT,
  p_tenant_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  remaining_stock INT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_stock INT;
BEGIN
  -- 1. Intentar seleccionar la fila con bloqueo exclusivo para actualización
  SELECT stock INTO v_current_stock
  FROM items
  WHERE id = p_item_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  -- 2. Verificar existencia e pertenencia a la empresa
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'El producto no existe o no pertenece a la empresa.'::TEXT;
    RETURN;
  END IF;

  -- 3. Si el stock es NULL, es un servicio o producto digital (sin inventario físico)
  IF v_current_stock IS NULL THEN
    RETURN QUERY SELECT TRUE, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- 4. Validar suficiencia de inventario
  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT FALSE, v_current_stock, ('Stock insuficiente. Disponible: ' || v_current_stock::TEXT || ', Solicitado: ' || p_quantity::TEXT)::TEXT;
    RETURN;
  END IF;

  -- 5. Decremento atómico ininterrumpible
  UPDATE items
  SET stock = stock - p_quantity
  WHERE id = p_item_id AND tenant_id = p_tenant_id;

  RETURN QUERY SELECT TRUE, (v_current_stock - p_quantity), NULL::TEXT;
END;
$$;
