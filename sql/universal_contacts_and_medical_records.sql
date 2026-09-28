-- ==============================================================================
-- SaaSCore ERP - Universal Contacts, Medical Records & Dynamic Schema
-- Archivo: sql/universal_contacts_and_medical_records.sql
-- ==============================================================================

-- 1. TABLA: HISTORIAS CLÍNICAS, VISITAS Y REGISTROS POR FECHA
CREATE TABLE IF NOT EXISTS entity_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  record_type TEXT NOT NULL DEFAULT 'clinical_note', -- 'clinical_note', 'dental_chart', 'prescription', 'visit_note', 'custom'
  record_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: ARCHIVOS ADJUNTOS, FOTOS Y RADIOGRAFÍAS
CREATE TABLE IF NOT EXISTS entity_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES entities(id) ON DELETE CASCADE,
  record_id UUID REFERENCES entity_records(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'image/jpeg',
  file_size INT DEFAULT 0,
  category TEXT DEFAULT 'general', -- 'foto_antes', 'foto_despues', 'rx', 'receta', 'documento', 'general'
  description TEXT,
  uploaded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA: ESQUEMA DE CAMPOS PERSONALIZADOS POR EMPRESA / INDUSTRIA
CREATE TABLE IF NOT EXISTS tenant_entity_schema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'select', 'boolean'
  options JSONB DEFAULT '[]'::jsonb,
  is_required BOOLEAN DEFAULT FALSE,
  applies_to TEXT DEFAULT 'customer',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, field_key)
);

-- ÍNDICES DE RENDIMIENTO Y MULTI-TENANCY
CREATE INDEX IF NOT EXISTS idx_entity_records_lookup 
  ON entity_records (tenant_id, entity_id, record_date DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_entity_attachments_lookup 
  ON entity_attachments (tenant_id, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_entity_schema_lookup 
  ON tenant_entity_schema (tenant_id, sort_order ASC);

-- SEGURIDAD ZERO-TRUST (ROW LEVEL SECURITY)
ALTER TABLE entity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entity_schema ENABLE ROW LEVEL SECURITY;
