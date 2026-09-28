-- ==============================================================================
-- MIGRATION: 20260923_whatsapp_crm.sql
-- DESCRIPTION: Dedicated WhatsApp CRM tables (conversations & messages)
-- MULTI-TENANT ISOLATION & RLS POLICIES
-- ==============================================================================

-- 1. WHATSAPP CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL DEFAULT 'Contacto WhatsApp',
    client_phone TEXT NOT NULL,
    client_email TEXT,
    client_avatar TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message JSONB,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    assigned_agent_email TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_whatsapp_tenant_phone UNIQUE (tenant_id, client_phone)
);

-- 2. WHATSAPP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'system', 'bot')),
    sender_name TEXT,
    sender_avatar TEXT,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    attachments JSONB DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. INDEXES FOR HIGH-THROUGHPUT RETRIEVAL
CREATE INDEX IF NOT EXISTS idx_wa_convs_tenant_act ON public.whatsapp_conversations (tenant_id, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_wa_convs_client ON public.whatsapp_conversations (client_id);
CREATE INDEX IF NOT EXISTS idx_wa_convs_phone ON public.whatsapp_conversations (tenant_id, client_phone);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_conv_time ON public.whatsapp_messages (conversation_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_wa_msgs_tenant ON public.whatsapp_messages (tenant_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for whatsapp_conversations"
ON public.whatsapp_conversations
FOR ALL
USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR auth.role() = 'service_role'
);

CREATE POLICY "Tenant isolation for whatsapp_messages"
ON public.whatsapp_messages
FOR ALL
USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR auth.role() = 'service_role'
);
