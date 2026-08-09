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
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  client_id: string; // entity_id from entities table
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
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppFilterState {
  search?: string;
  tag_id?: string | 'all';
  status?: 'active' | 'archived' | 'all';
  unread_only?: boolean;
}

export interface SendMessageInput {
  conversation_id: string;
  client_id?: string;
  client_phone: string;
  text: string;
  attachments?: Array<{ url: string; type: 'image' | 'document' | 'audio'; name?: string }>;
  metadata?: Record<string, any>;
}
