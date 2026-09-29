-- ==============================================================================
-- FIX: Extensión de Columnas Resilientes en documents
-- Agrega columnas de fechas y notas a la tabla documents si no existen
-- y amplía la restricción CHECK de type para admitir work_order, quotation, etc.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Agregar issue_date si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'issue_date'
  ) THEN
    ALTER TABLE documents ADD COLUMN issue_date TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- 2. Agregar due_date si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE documents ADD COLUMN due_date TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- 3. Agregar notes si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'notes'
  ) THEN
    ALTER TABLE documents ADD COLUMN notes TEXT DEFAULT NULL;
  END IF;

  -- 4. Ampliar restricción check de documents.type si restringe a invoice, purchase_order, quotation
  ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
  ALTER TABLE documents ADD CONSTRAINT documents_type_check 
    CHECK (type IN ('invoice', 'purchase_order', 'quotation', 'work_order', 'quote', 'whatsapp_log', 'journal_entry', 'payroll_slip'));

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Aviso al actualizar tabla documents: %', SQLERRM;
END $$;
