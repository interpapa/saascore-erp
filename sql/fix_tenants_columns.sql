
-- Agrega las columnas faltantes en la tabla tenants para evitar errores de cache y schema
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS active_modules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS symbol text DEFAULT '$';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'VE';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Si manejamos user_tenants y faltan cosas
ALTER TABLE public.user_tenants ADD COLUMN IF NOT EXISTS user_email text;
