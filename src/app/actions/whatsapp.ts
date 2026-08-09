'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import {
  Conversation,
  CustomerTag,
  Message,
  QuickReply,
  SendMessageInput,
  WhatsAppFilterState
} from '@/types/whatsapp';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = error.message || '';
  return code === 'PGRST204' || code === '42P01' || msg.includes('does not exist');
}

/**
 * Fetches active conversations for WhatsApp CRM inbox with fallback to 'documents' (whatsapp_log).
 */
export async function getConversationsAction(
  tenantId: string,
  filter?: WhatsAppFilterState
): Promise<{ success: boolean; conversations: Conversation[]; error?: string }> {
  try {
    if (!tenantId) return { success: true, conversations: [] };

    // 1. Primary Attempt: Query 'whatsapp_conversations' table
    const { data: convs, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        *,
        client:entities!client_id (id, name, phone, email, metadata)
      `)
      .eq('tenant_id', tenantId)
      .order('last_activity', { ascending: false });

    if (!error && convs) {
      const formatted: Conversation[] = convs.map((c: any) => ({
        id: c.id,
        tenant_id: c.tenant_id,
        client_id: c.client_id,
        client_name: c.client?.name || c.client_name || 'Cliente',
        client_phone: c.client?.phone || c.client_phone || '',
        client_email: c.client?.email || null,
        unread_count: c.unread_count || 0,
        last_message: c.last_message || null,
        last_activity: c.last_activity,
        tags: c.metadata?.tags || [],
        status: c.status || 'active',
      }));

      return { success: true, conversations: filterConversations(formatted, filter) };
    }

    // 2. Fallback: Aggregate from 'documents' (type = whatsapp_log) and 'entities' (type = customer)
    if (error && isMissingTableError(error)) {
      const [{ data: customers }, { data: logs }] = await Promise.all([
        supabaseAdmin.from('entities').select('*').eq('tenant_id', tenantId).eq('type', 'customer'),
        supabaseAdmin
          .from('documents')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('type', 'whatsapp_log')
          .order('issue_date', { ascending: false }),
      ]);

      const conversationMap = new Map<string, Conversation>();

      (logs || []).forEach((log: any) => {
        const entityId = log.entity_id || log.document_number || 'unknown';
        const client = (customers || []).find((c: any) => c.id === log.entity_id);

        if (!conversationMap.has(entityId)) {
          const rawTags: string[] = client?.metadata?.tags || [];
          const tags: CustomerTag[] = rawTags.map((t) => ({
            id: t,
            name: t,
            color: getTagColor(t),
          }));

          const lastMsg: Message = {
            id: log.id,
            conversation_id: entityId,
            tenant_id: log.tenant_id,
            sender_type: log.metadata?.direction === 'inbound' ? 'client' : 'agent',
            text: log.notes || 'Mensaje de WhatsApp',
            status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
            timestamp: log.issue_date || log.created_at,
            metadata: log.metadata || {},
          };

          conversationMap.set(entityId, {
            id: entityId,
            tenant_id: tenantId,
            client_id: log.entity_id || '',
            client_name: client?.name || log.metadata?.client_name || log.document_number || 'Cliente CRM',
            client_phone: client?.phone || log.document_number || '',
            client_email: client?.email || null,
            unread_count: 0,
            last_message: lastMsg,
            last_activity: log.issue_date || log.created_at,
            tags,
            status: 'active',
          });
        }
      });

      // Include registered customers who don't have messages yet
      (customers || []).forEach((cust: any) => {
        if (!conversationMap.has(cust.id)) {
          const rawTags: string[] = cust.metadata?.tags || [];
          const tags: CustomerTag[] = rawTags.map((t) => ({
            id: t,
            name: t,
            color: getTagColor(t),
          }));

          conversationMap.set(cust.id, {
            id: cust.id,
            tenant_id: tenantId,
            client_id: cust.id,
            client_name: cust.name,
            client_phone: cust.phone || '',
            client_email: cust.email || null,
            unread_count: 0,
            last_message: null,
            last_activity: cust.created_at,
            tags,
            status: 'active',
          });
        }
      });

      const list = Array.from(conversationMap.values());
      return { success: true, conversations: filterConversations(list, filter) };
    }

    throw new Error(error?.message || 'Error al obtener conversaciones.');
  } catch (err: any) {
    console.error('[getConversationsAction Error]:', err.message);
    return { success: false, error: err.message, conversations: [] };
  }
}

/**
 * Fetches messages for a conversation with fallback to 'documents' (whatsapp_log).
 */
export async function getMessagesAction(
  conversationId: string,
  tenantId: string
): Promise<{ success: boolean; messages: Message[]; error?: string }> {
  try {
    if (!conversationId || !tenantId) return { success: true, messages: [] };

    // 1. Primary Attempt: Query 'whatsapp_messages' table
    const { data: msgs, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('timestamp', { ascending: true });

    if (!error && msgs) {
      return { success: true, messages: msgs };
    }

    // 2. Fallback: Query 'documents' table (whatsapp_log)
    if (error && isMissingTableError(error)) {
      const { data: logs, error: docErr } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'whatsapp_log')
        .or(`entity_id.eq.${conversationId},document_number.eq.${conversationId}`)
        .order('issue_date', { ascending: true });

      if (docErr) throw new Error(docErr.message);

      const messages: Message[] = (logs || []).map((log: any) => ({
        id: log.id,
        conversation_id: conversationId,
        tenant_id: log.tenant_id,
        sender_type: log.metadata?.direction === 'inbound' ? 'client' : 'agent',
        sender_name: log.metadata?.direction === 'inbound' ? 'Cliente' : (log.metadata?.created_by || 'SaaSCore Bot'),
        text: log.notes || '',
        status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
        timestamp: log.issue_date || log.created_at,
        metadata: log.metadata || {},
        created_at: log.created_at,
      }));

      return { success: true, messages };
    }

    throw new Error(error?.message || 'Error al obtener mensajes.');
  } catch (err: any) {
    console.error('[getMessagesAction Error]:', err.message);
    return { success: false, error: err.message, messages: [] };
  }
}

/**
 * Sends a WhatsApp message with fallback to 'documents' (whatsapp_log).
 */
export async function sendMessageAction(
  input: SendMessageInput,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.conversation_id || !input.text) {
      throw new Error('Empresa, ID de conversación y texto del mensaje son requeridos.');
    }

    const timestamp = new Date().toISOString();

    // 1. Primary Attempt: Insert into 'whatsapp_messages' table
    const { data: newMsg, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert([{
        conversation_id: input.conversation_id,
        tenant_id: tenantId,
        sender_type: 'agent',
        sender_name: actor.email,
        text: input.text,
        status: 'delivered',
        timestamp,
        metadata: { created_by: actor.email, ...input.metadata },
      }])
      .select()
      .single();

    if (!error && newMsg) {
      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'whatsapp_message',
        target_id: newMsg.id,
        metadata: { action: 'whatsapp_message_sent', phone: input.client_phone, length: input.text.length },
      });

      revalidatePath('/whatsapp');
      return { success: true, message: newMsg };
    }

    // 2. Fallback: Insert into 'documents' table (whatsapp_log)
    if (error && isMissingTableError(error)) {
      const { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: input.client_id || input.conversation_id,
          type: 'whatsapp_log',
          status: 'invoiced',
          document_number: input.client_phone || `WA-${Date.now().toString().slice(-6)}`,
          issue_date: timestamp,
          due_date: null,
          subtotal_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          notes: input.text,
          metadata: {
            platform: 'whatsapp',
            direction: 'outbound',
            created_by: actor.email,
            conversation_id: input.conversation_id,
            ...input.metadata,
          },
        }])
        .select()
        .single();

      if (docErr) throw new Error('Error al enviar mensaje en respaldo: ' + docErr.message);

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'document',
        target_id: newDoc.id,
        metadata: { action: 'whatsapp_message_sent', phone: input.client_phone, length: input.text.length },
      });

      revalidatePath('/whatsapp');

      return {
        success: true,
        message: {
          id: newDoc.id,
          conversation_id: input.conversation_id,
          tenant_id: tenantId,
          sender_type: 'agent',
          sender_name: actor.email,
          text: input.text,
          status: 'delivered',
          timestamp: newDoc.issue_date,
          metadata: newDoc.metadata,
          created_at: newDoc.created_at,
        },
      };
    }

    throw new Error(error?.message || 'Error al enviar el mensaje de WhatsApp.');
  } catch (err: any) {
    console.error('[sendMessageAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Updates customer tags in customer entity metadata and conversation metadata.
 */
export async function updateCustomerTagAction(
  entityId: string,
  tags: string[],
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; tags?: string[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!entityId || !tenantId) throw new Error('ID de cliente y Empresa requeridos.');

    const { data: entity, error: fetchErr } = await supabaseAdmin
      .from('entities')
      .select('metadata')
      .eq('id', entityId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchErr) throw new Error('Cliente no encontrado: ' + fetchErr.message);

    const updatedMetadata = {
      ...(entity?.metadata || {}),
      tags,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('entities')
      .update({ metadata: updatedMetadata })
      .eq('id', entityId)
      .eq('tenant_id', tenantId);

    if (updateErr) throw new Error('Error al actualizar etiquetas: ' + updateErr.message);

    try {
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ metadata: { tags } })
        .eq('client_id', entityId)
        .eq('tenant_id', tenantId);
    } catch {
      // Ignored if table does not exist
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'entity',
      target_id: entityId,
      metadata: { action: 'customer_tags_updated', tags },
    });

    revalidatePath('/whatsapp');
    return { success: true, tags };
  } catch (err: any) {
    console.error('[updateCustomerTagAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Updates the status of a WhatsApp conversation (e.g. 'active', 'archived', 'blocked').
 */
export async function updateConversationStatusAction(
  conversationId: string,
  status: 'active' | 'archived' | 'blocked',
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!conversationId || !tenantId) throw new Error('ID de conversación y Empresa requeridos.');

    const { error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .update({ status })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId);

    if (error && !isMissingTableError(error)) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.updated',
      target_type: 'whatsapp_conversation',
      target_id: conversationId,
      metadata: { action: 'conversation_status_updated', status },
    });

    revalidatePath('/whatsapp');
    return { success: true };
  } catch (err: any) {
    console.error('[updateConversationStatusAction Error]:', err.message);
    return { success: false, error: err.message };
  }
}

// Helpers
function getTagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes('vip')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (t.includes('lead')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
  if (t.includes('soporte')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
  if (t.includes('deudor')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
}

function filterConversations(list: Conversation[], filter?: WhatsAppFilterState): Conversation[] {
  if (!filter) return list;
  return list.filter((c) => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const nameMatch = c.client_name.toLowerCase().includes(q);
      const phoneMatch = c.client_phone.includes(q);
      if (!nameMatch && !phoneMatch) return false;
    }
    if (filter.tag_id && filter.tag_id !== 'all') {
      const hasTag = c.tags.some((t: any) => typeof t === 'string' ? t === filter.tag_id : (t?.id === filter.tag_id || t?.name === filter.tag_id));
      if (!hasTag) return false;
    }
    if (filter.unread_only && c.unread_count === 0) return false;
    return true;
  });
}
