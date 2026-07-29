-- ==========================================
-- SAASCORE OS: ARQUITECTURA MULTI-TENANT (DIOS)
-- Ejecutar esto en el SQL Editor de Supabase
-- ==========================================

-- 1. Crear la Tabla Maestra de Clientes (Tenants)
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, suspended, payment_failed
  active_modules JSONB DEFAULT '[]'::jsonb, -- ej: ["caja", "crm", "whatsapp"]
  subscription_plan VARCHAR(50) DEFAULT 'basic',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modificar las tablas existentes para que pertenezcan a un Tenant
-- A. Entidades (Clientes/Proveedores del Taller)
ALTER TABLE public.entities ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
-- B. Ítems (Catálogo del Taller)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
-- C. Documentos (Facturas del Taller)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- (Opcional) Si quieres que esto sea obligatorio de inmediato, descomenta las siguientes líneas DESPUÉS de haber asignado un tenant_id a tus datos existentes:
-- ALTER TABLE public.entities ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE public.items ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE public.documents ALTER COLUMN tenant_id SET NOT NULL;


-- 3. Habilitar la Magia de la Seguridad (RLS - Row Level Security)
-- Esto garantiza que un Taller NUNCA pueda ver los datos de otro Taller, y que si no pagan, se quedan sin acceso.

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Para efectos de desarrollo rápido, crearemos una política universal temporal que simule 
-- que el Tenant actual es válido. Cuando implementemos la Autenticación real (JWT), 
-- cambiaremos `(current_setting('request.jwt.claims')::json->>'tenant_id')::uuid` por la validación dura.

CREATE POLICY "SuperAdmin Full Access" ON public.tenants FOR ALL USING (true); -- El panel de Dios lo ve todo

-- Las reglas estrictas para el cliente final (El Taller):
-- "Solo puedes ver/editar si el registro tiene tu tenant_id, Y si tu cuenta está 'active'"
CREATE POLICY "Tenant Isolation Entities" ON public.entities FOR ALL USING (
  tenant_id = (current_setting('app.current_tenant_id', true))::uuid 
  AND EXISTS (SELECT 1 FROM public.tenants WHERE id = entities.tenant_id AND status = 'active')
);

CREATE POLICY "Tenant Isolation Items" ON public.items FOR ALL USING (
  tenant_id = (current_setting('app.current_tenant_id', true))::uuid 
  AND EXISTS (SELECT 1 FROM public.tenants WHERE id = items.tenant_id AND status = 'active')
);

CREATE POLICY "Tenant Isolation Documents" ON public.documents FOR ALL USING (
  tenant_id = (current_setting('app.current_tenant_id', true))::uuid 
  AND EXISTS (SELECT 1 FROM public.tenants WHERE id = documents.tenant_id AND status = 'active')
);

-- 4. Crear tu primer Inquilino (Taller de Prueba) para que el sistema funcione
INSERT INTO public.tenants (name, status, active_modules) 
VALUES ('Taller Central S.A.', 'active', '["caja", "clientes", "catalogo"]');
