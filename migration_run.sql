-- TABLAS BASE DEL ERP (Puro Esquema, sin datos hardcodeados)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  active_modules JSONB DEFAULT '[]'::jsonb,
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('customer','supplier','employee','lead')),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  tax_id VARCHAR(50),
  address TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('product','service','subscription')),
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  base_price NUMERIC(12,2) DEFAULT 0,
  cost NUMERIC(12,2) DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES public.entities(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('invoice','quote','purchase_order','expense')),
  status VARCHAR(50) DEFAULT 'draft',
  document_number VARCHAR(100),
  issue_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  subtotal_amount NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.items(id),
  description TEXT,
  quantity NUMERIC(10,2) DEFAULT 1,
  unit_price NUMERIC(12,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- POLITICAS TEMPORALES PARA DESARROLLO (Luego las cambiaremos al Muro de Acero con auth.uid)
DROP POLICY IF EXISTS "allow_all_tenants" ON public.tenants;
CREATE POLICY "allow_all_tenants" ON public.tenants FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_all_entities" ON public.entities;
CREATE POLICY "allow_all_entities" ON public.entities FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_all_items" ON public.items;
CREATE POLICY "allow_all_items" ON public.items FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_all_documents" ON public.documents;
CREATE POLICY "allow_all_documents" ON public.documents FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_all_doc_lines" ON public.document_lines;
CREATE POLICY "allow_all_doc_lines" ON public.document_lines FOR ALL USING (true);

DROP POLICY IF EXISTS "allow_user_tenants" ON public.user_tenants;
CREATE POLICY "allow_user_tenants" ON public.user_tenants FOR ALL USING (true);
