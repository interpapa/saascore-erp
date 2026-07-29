-- ==========================================
-- SAASCORE OS: PRODUCCIÓN MULTI-TENANT (AUTH)
-- Ejecutar esto en el SQL Editor de Supabase
-- ==========================================

-- 1. Tabla Puente: Relación entre Usuarios de Supabase y Empresas (Tenants)
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'employee', -- owner, admin, manager, employee
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id) -- Un usuario no puede estar asignado dos veces a la misma empresa
);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver sus propias relaciones de empresa
CREATE POLICY "Users can view their own tenant links" ON public.user_tenants 
  FOR SELECT USING (auth.uid() = user_id);

-- 2. Limpieza de las políticas temporales anteriores (Hacks)
DROP POLICY IF EXISTS "Tenant Isolation Entities" ON public.entities;
DROP POLICY IF EXISTS "Tenant Isolation Items" ON public.items;
DROP POLICY IF EXISTS "Tenant Isolation Documents" ON public.documents;
DROP POLICY IF EXISTS "Tenant Isolation Document Lines" ON public.document_lines;

-- 3. EL MURO DE ACERO (Producción RLS usando auth.uid())
-- Estas reglas exigen matemáticamente que el usuario esté logueado, exista en la tabla puente, y que el Tenant no esté suspendido.

CREATE POLICY "Prod Isolation Entities" ON public.entities FOR ALL USING (
  tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut 
    JOIN public.tenants t ON ut.tenant_id = t.id 
    WHERE ut.user_id = auth.uid() AND t.status = 'active'
  )
);

CREATE POLICY "Prod Isolation Items" ON public.items FOR ALL USING (
  tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut 
    JOIN public.tenants t ON ut.tenant_id = t.id 
    WHERE ut.user_id = auth.uid() AND t.status = 'active'
  )
);

CREATE POLICY "Prod Isolation Documents" ON public.documents FOR ALL USING (
  tenant_id IN (
    SELECT ut.tenant_id FROM public.user_tenants ut 
    JOIN public.tenants t ON ut.tenant_id = t.id 
    WHERE ut.user_id = auth.uid() AND t.status = 'active'
  )
);

CREATE POLICY "Prod Isolation Document Lines" ON public.document_lines FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.documents d 
    JOIN public.user_tenants ut ON d.tenant_id = ut.tenant_id
    JOIN public.tenants t ON ut.tenant_id = t.id
    WHERE d.id = document_lines.document_id 
    AND ut.user_id = auth.uid() 
    AND t.status = 'active'
  )
);

-- INSTRUCCIÓN CRUCIAL DE MIGRACIÓN:
-- Para que tú mismo no te quedes por fuera, averigua tu auth.uid() y tu tenant_id, y ejecuta:
-- INSERT INTO public.user_tenants (user_id, tenant_id, role) VALUES ('TU_AUTH_UID', 'TU_TENANT_ID', 'owner');
