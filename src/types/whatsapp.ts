export type MessageSenderType = 'client' | 'agent' | 'system' | 'bot';
export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface CustomerTag {
  id: string;
  name: string;
  color: string; // e.g. 'bg-amber-100 text-amber-800'
  description?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string; // e.g. '/saludo'
  content: string;
  category?: string;
}

export interface WhatsAppTemplate {
  id: string;
  label: string;
  shortcut: string;
  text: string;
  category?: 'saludo' | 'cobro' | 'citas' | 'catalogo' | 'general';
}

export interface Message {
  id: string;
  conversation_id: string;
  tenant_id: string;
  sender_type: MessageSenderType;
  sender_name?: string;
  sender_avatar?: string;
  text: string;
  status: MessageDeliveryStatus;
  timestamp: string; // ISO 8601
  attachments?: Array<{
    url: string;
    type: 'image' | 'document' | 'audio' | 'video';
    name?: string;
    size_bytes?: number;
  }>;
  metadata?: {
    is_internal_note?: boolean;
    created_by?: string;
    source_module?: string;
    [key: string]: unknown;
  };
  created_at?: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  client_id?: string | null; // entity_id from entities table, optional for independent free numbers
  client_name: string;
  client_phone: string;
  client_email?: string | null;
  client_avatar?: string | null;
  unread_count: number;
  last_message: Message | null;
  last_activity: string; // ISO 8601 timestamp
  tags: CustomerTag[];
  status: 'active' | 'archived' | 'blocked';
  assigned_agent_email?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppFilterState {
  search?: string;
  tag_id?: string | 'all';
  status?: 'active' | 'archived' | 'all';
  unread_only?: boolean;
  debt_only?: boolean;
  birthday_only?: boolean;
}

export interface SendMessageInput {
  conversation_id: string;
  client_id?: string | null;
  client_name?: string;
  client_phone: string;
  text: string;
  attachments?: Array<{ url: string; type: 'image' | 'document' | 'audio'; name?: string }>;
  metadata?: Record<string, unknown>;
  open_whatsapp?: boolean;
  log_only?: boolean;
  is_internal_note?: boolean;
}

export interface WhatsAppSettings {
  enabled?: boolean;
  webhook_url?: string;
  api_key?: string;
  phone_number_id?: string;
  default_country_code?: string; // e.g. '58', '57'
}
