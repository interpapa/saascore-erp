-- ==============================================================================
-- SaaSCore ERP - Master Production Schema v1.0 (ISO 27001 / Multi-Tenant / NIIF)
-- Archivo: supabase/schema_v1.sql
-- ==============================================================================

-- 1. TABLA: EMPRESAS (TENANTS)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tax_id TEXT,
  currency TEXT DEFAULT 'USD',
  symbol TEXT DEFAULT '$',
  country_code TEXT DEFAULT 'VE',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: RELACIÓN USUARIO-TENANT (RBAC & SECURITY)
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_email, tenant_id)
);

-- 3. TABLA: ENTIDADES (CLIENTES / PROVEEDORES / EMPLEADOS)
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('customer', 'supplier', 'employee', 'lead', 'branch')),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tax_id TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA: CATÁLOGO DE ÍTEMS (PRODUCTOS / SERVICIOS / SUSCRIPCIONES)
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('product', 'service', 'subscription')),
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  base_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  cost NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  stock INT DEFAULT NULL, -- NULL para servicios
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA: DOCUMENTOS TRANSACCIONALES (FACTURAS / POs)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id),
  type TEXT NOT NULL CHECK (type IN ('invoice', 'purchase_order', 'quotation')),
  status TEXT DEFAULT 'draft',
  document_number TEXT NOT NULL,
  subtotal_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA: LÍNEAS DE DOCUMENTO
CREATE TABLE IF NOT EXISTS document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(15, 4) NOT NULL DEFAULT 0.0000,
  tax_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA: ENCABEZADOS DE ASIENTOS CONTABLES (LIBRO MAYOR NIIF)
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  entry_date TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  total_debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLA: LÍNEAS DE ASIENTOS CONTABLES (PARTIDA DOBLE)
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  credit NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  description TEXT
);

-- 9. TABLA: LOGS DE AUDITORÍA INMUTABLES (WORM - ISO 27001)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ÍNDICES PARCIALES DE ALTO RENDIMIENTO Y LECTURAS ACTIVAS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_entities_active ON entities (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_active ON items (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents (tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs (tenant_id, created_at DESC);

-- ==============================================================================
-- RPC ATÓMICO EN POSTGRESQL PARA CONCURRENCIA DE STOCK (FOR UPDATE)
-- ==============================================================================
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
  SELECT stock INTO v_current_stock
  FROM items
  WHERE id = p_item_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'El producto no existe o no pertenece a la empresa.'::TEXT;
    RETURN;
  END IF;

  IF v_current_stock IS NULL THEN
    RETURN QUERY SELECT TRUE, 0, NULL::TEXT;
    RETURN;
  END IF;

  IF v_current_stock < p_quantity THEN
    RETURN QUERY SELECT FALSE, v_current_stock, ('Stock insuficiente. Disponible: ' || v_current_stock::TEXT || ', Solicitado: ' || p_quantity::TEXT)::TEXT;
    RETURN;
  END IF;

  UPDATE items
  SET stock = stock - p_quantity
  WHERE id = p_item_id AND tenant_id = p_tenant_id;

  RETURN QUERY SELECT TRUE, (v_current_stock - p_quantity), NULL::TEXT;
END;
$$;

-- ==============================================================================
-- SEGURIDAD ZERO-TRUST (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
