-- ==============================================================================
-- MIGRACIÓN DE INTEGRIDAD REFERENCIAL: Soft Deletes (deleted_at)
-- Archivo: supabase/migrations/20260806_soft_deletes.sql
-- ==============================================================================

-- Añadir columna deleted_at a las tablas principales
ALTER TABLE entities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Índices parciales para optimizar consultas de lectura activas
CREATE INDEX IF NOT EXISTS idx_entities_tenant_active 
  ON entities (tenant_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_items_tenant_active 
  ON items (tenant_id, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_documents_tenant_active 
  ON documents (tenant_id, created_at DESC) 
  WHERE deleted_at IS NULL;
