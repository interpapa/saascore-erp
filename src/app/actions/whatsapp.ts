'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { assertModuleEnabled } from '@/lib/core/kernel/moduleRegistry';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { isValidUUID, isTemporaryId } from '@/lib/core/uuid';
import {
  Conversation,
  CustomerTag,
  Message,
  SendMessageInput,
  WhatsAppFilterState
} from '@/types/whatsapp';

function isMissingTableError(error: any): boolean {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'PGRST204' ||
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
}

/**
 * Sanitizes phone numbers to standard WhatsApp format (international, digits only).
 */
export async function sanitizeWhatsAppPhone(phone: string, defaultCountry = '58'): Promise<string> {
  let clean = phone.replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = defaultCountry + clean.slice(1);
  } else if (clean.length === 10 && (clean.startsWith('412') || clean.startsWith('414') || clean.startsWith('424') || clean.startsWith('416') || clean.startsWith('426'))) {
    clean = defaultCountry + clean;
  }
  return clean;
}

/**
 * Fetches active conversations for WhatsApp CRM inbox with fallback to 'documents' (whatsapp_log).
 */
export async function getConversationsAction(
  tenantId: string,
  filter: WhatsAppFilterState | undefined,
  actor: ActionActor
): Promise<{ success: boolean; conversations: Conversation[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', conversations: [] };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'whatsapp');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de WhatsApp está desactivado.', conversations: [] };
    }

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
        client_id: c.client_id || null,
        client_name: c.client?.name || c.client_name || 'Contacto WhatsApp',
        client_phone: c.client?.phone || c.client_phone || '',
        client_email: c.client?.email || c.client_email || null,
        unread_count: c.unread_count || 0,
        last_message: c.last_message || null,
        last_activity: c.last_activity,
        tags: c.tags || c.metadata?.tags || [],
        status: c.status || 'active',
        metadata: {
          ...c.metadata,
          client_metadata: c.client?.metadata || null,
          client_address: c.client?.address || null,
        }
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
          .in('type', ['whatsapp_log', 'invoice'])
          .order('created_at', { ascending: false }),
      ]);

      const conversationMap = new Map<string, Conversation>();

      (logs || []).forEach((log: any) => {
        const entityId = log.entity_id || log.document_number || 'unknown';
        const client = (customers || []).find((c: any) => c.id === log.entity_id);

        if (!conversationMap.has(entityId)) {
          const rawTags: string[] = client?.metadata?.tags || log.metadata?.tags || [];
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
            sender_name: log.metadata?.direction === 'inbound' ? (client?.name || log.metadata?.client_name || 'Cliente') : (log.metadata?.created_by || 'Rendo Bot'),
            text: log.notes || 'Mensaje de WhatsApp',
            status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
            timestamp: log.issue_date || log.created_at,
            metadata: log.metadata || {},
          };

          conversationMap.set(entityId, {
            id: entityId,
            tenant_id: tenantId,
            client_id: client ? client.id : null,
            client_name: client?.name || log.metadata?.client_name || log.document_number || 'Contacto WhatsApp',
            client_phone: client?.phone || log.document_number || '',
            client_email: client?.email || null,
            unread_count: 0,
            last_message: lastMsg,
            last_activity: log.issue_date || log.created_at,
            tags,
            status: 'active',
            metadata: {
              ...log.metadata,
              client_metadata: client?.metadata || null,
              client_address: client?.address || null,
            }
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
            metadata: {
              client_metadata: cust.metadata || null,
              client_address: cust.address || null,
            }
          });
        }
      });

      const list = Array.from(conversationMap.values());
      return { success: true, conversations: filterConversations(list, filter) };
    }

    throw new Error(error?.message || 'Error al obtener conversaciones.');
  } catch (err: any) {
    console.error('[getConversationsAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, conversations: [] };
  }
}

/**
 * Fetches messages for a conversation with fallback to 'documents' (whatsapp_log).
 */
export async function getMessagesAction(
  conversationId: string,
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; messages: Message[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', messages: [] };
    }

    const moduleCheck = await assertModuleEnabled(tenantId, 'whatsapp');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de WhatsApp está desactivado.', messages: [] };
    }

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
      let docQuery = supabaseAdmin
        .from('documents')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('type', 'whatsapp_log');

      if (isValidUUID(conversationId)) {
        docQuery = docQuery.or(`entity_id.eq.${conversationId},document_number.eq.${conversationId}`);
      } else {
        docQuery = docQuery.eq('document_number', conversationId);
      }

      const { data: logs, error: docErr } = await docQuery.order('created_at', { ascending: true });

      if (docErr) throw new Error(docErr.message);

      const messages: Message[] = (logs || []).map((log: any) => ({
        id: log.id,
        conversation_id: conversationId,
        tenant_id: log.tenant_id,
        sender_type: log.metadata?.direction === 'inbound' ? 'client' : 'agent',
        sender_name: log.metadata?.direction === 'inbound' ? (log.metadata?.client_name || 'Cliente') : (log.metadata?.created_by || 'Rendo Bot'),
        text: log.notes || log.metadata?.notes || log.metadata?.text || '',
        status: log.status === 'invoiced' ? 'delivered' : log.status === 'annulled' ? 'failed' : 'sent',
        timestamp: log.issue_date || log.metadata?.issue_date || log.created_at,
        metadata: log.metadata || {},
        created_at: log.created_at,
      }));

      return { success: true, messages };
    }

    throw new Error(error?.message || 'Error al obtener mensajes.');
  } catch (err: any) {
    console.error('[getMessagesAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message, messages: [] };
  }
}

/**
 * Sends a WhatsApp message with fallback to 'documents' (whatsapp_log)
 * and optional webhook dispatch.
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

    const moduleCheck = await assertModuleEnabled(tenantId, 'whatsapp');
    if (!moduleCheck.authorized) {
      return { success: false, error: moduleCheck.error || 'El módulo de WhatsApp está desactivado.' };
    }

    if (!tenantId || !input.conversation_id || !input.text) {
      throw new Error('Empresa, ID de conversación y texto del mensaje son requeridos.');
    }

    const timestamp = new Date().toISOString();
    const isInternalNote = Boolean(input.is_internal_note || input.metadata?.is_internal_note);
    const senderType = isInternalNote ? 'system' : 'agent';

    // 1. Primary Attempt: Insert into 'whatsapp_messages' table
    const { data: newMsg, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert([{
        conversation_id: input.conversation_id,
        tenant_id: tenantId,
        sender_type: senderType,
        sender_name: isInternalNote ? `Nota Interna (${actor.email})` : actor.email,
        text: input.text,
        status: isInternalNote ? 'delivered' : 'delivered',
        timestamp,
        metadata: {
          created_by: actor.email,
          is_internal_note: isInternalNote,
          ...input.metadata,
        },
      }])
      .select()
      .single();

    if (!error && newMsg) {
      // Update parent conversation's last_activity and last_message
      try {
        await supabaseAdmin
          .from('whatsapp_conversations')
          .update({
            last_message: newMsg,
            last_activity: timestamp,
            updated_at: timestamp,
          })
          .eq('id', input.conversation_id)
          .eq('tenant_id', tenantId);
      } catch {
        // Ignored if update fails
      }

      await writeAuditLog({
        tenant_id: tenantId,
        actor_email: actor.email,
        actor_role: actor.role,
        action: 'entity.updated',
        target_type: 'whatsapp_message',
        target_id: newMsg.id,
        metadata: { action: 'whatsapp_message_sent', phone: input.client_phone, length: input.text.length },
      });

      // Dispatch to optional external webhook if configured (only if not an internal note)
      if (!isInternalNote) {
        await dispatchOptionalWebhook(tenantId, input);
      }

      revalidatePath('/whatsapp');
      return { success: true, message: newMsg };
    }

    // 2. Fallback: Insert into 'documents' table (whatsapp_log)
    if (error && isMissingTableError(error)) {
      const candidateId = input.client_id || input.conversation_id;
      const safeEntityId = (candidateId && isValidUUID(candidateId) && !isTemporaryId(candidateId)) ? candidateId : null;

      let { data: newDoc, error: docErr } = await supabaseAdmin
        .from('documents')
        .insert([{
          tenant_id: tenantId,
          entity_id: safeEntityId,
          type: 'invoice',
          status: 'invoiced',
          document_number: input.client_phone || `WA-${Date.now().toString().slice(-6)}`,
          subtotal_amount: 0,
          tax_amount: 0,
          total_amount: 0,
          metadata: {
            actual_type: 'whatsapp_log',
            issue_date: timestamp,
            notes: input.text,
            platform: 'whatsapp',
            direction: isInternalNote ? 'internal' : 'outbound',
            created_by: actor.email,
            is_internal_note: isInternalNote,
            conversation_id: input.conversation_id,
            client_name: input.client_name,
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
        metadata: {
          action: isInternalNote ? 'whatsapp_internal_note_added' : 'whatsapp_message_sent',
          phone: input.client_phone,
          length: input.text.length,
        },
      });

      // Dispatch to optional external webhook if configured (only if not an internal note)
      if (!isInternalNote) {
        await dispatchOptionalWebhook(tenantId, input);
      }

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
    console.error('[sendMessageAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Converts a WhatsApp conversation/phone number into a registered customer entity in CRM.
 */
export async function createClientFromConversationAction(
  conversationId: string,
  clientData: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    notes?: string;
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; entity?: any; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !clientData.name || !clientData.phone) {
      throw new Error('Nombre y teléfono son obligatorios para crear el cliente.');
    }

    // 1. Insert new customer entity
    const { data: entity, error: entityErr } = await supabaseAdmin
      .from('entities')
      .insert([{
        tenant_id: tenantId,
        type: 'customer',
        name: clientData.name.trim(),
        phone: clientData.phone.trim(),
        email: clientData.email?.trim() || null,
        address: clientData.address?.trim() || null,
        metadata: {
          notes: clientData.notes?.trim() || 'Creado desde WhatsApp CRM',
          source: 'whatsapp_crm',
          created_by: actor.email,
        }
      }])
      .select()
      .single();

    if (entityErr || !entity) {
      throw new Error(entityErr?.message || 'Error al crear entidad de cliente.');
    }

    // 2. Link conversation to new entity in native table
    try {
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({
          client_id: entity.id,
          client_name: entity.name,
          client_phone: entity.phone,
          client_email: entity.email,
        })
        .eq('id', conversationId)
        .eq('tenant_id', tenantId);
    } catch {
      // Ignored if table does not exist
    }

    // 3. Link documents fallback logs to new entity
    try {
      await supabaseAdmin
        .from('documents')
        .update({ entity_id: entity.id })
        .eq('tenant_id', tenantId)
        .eq('type', 'whatsapp_log')
        .or(`entity_id.eq.${conversationId},document_number.eq.${clientData.phone.trim()}`);
    } catch {
      // Ignored
    }

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.created',
      target_type: 'entity',
      target_id: entity.id,
      metadata: { action: 'customer_created_from_whatsapp', conversation_id: conversationId },
    });

    revalidatePath('/whatsapp');
    revalidatePath('/clientes');

    return { success: true, entity };
  } catch (err: any) {
    console.error('[createClientFromConversationAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Logs an external WhatsApp message dispatch from other modules (e.g. Caja POS, Calendario, Compras).
 */
export async function logExternalWhatsAppMessageAction(
  input: {
    phone: string;
    client_name?: string;
    client_id?: string;
    text: string;
    module_source: 'caja' | 'calendario' | 'compras' | 'crm';
    metadata?: Record<string, unknown>;
  },
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!tenantId || !input.phone || !input.text) {
      return { success: false, error: 'Teléfono y texto son requeridos.' };
    }

    const cleanPhone = await sanitizeWhatsAppPhone(input.phone);
    const timestamp = new Date().toISOString();
    const convId = input.client_id || `conv-${cleanPhone}`;

    // Try primary table or fallback
    return await sendMessageAction(
      {
        conversation_id: convId,
        client_id: input.client_id,
        client_name: input.client_name,
        client_phone: cleanPhone,
        text: input.text,
        metadata: {
          source_module: input.module_source,
          ...input.metadata,
        }
      },
      tenantId,
      actor
    );
  } catch (err: any) {
    console.error('[logExternalWhatsAppMessageAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
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

    if (!fetchErr && entity) {
      const updatedMetadata = {
        ...(entity?.metadata || {}),
        tags,
      };

      await supabaseAdmin
        .from('entities')
        .update({ metadata: updatedMetadata })
        .eq('id', entityId)
        .eq('tenant_id', tenantId);
    }

    try {
      const { data: conv } = await supabaseAdmin
        .from('whatsapp_conversations')
        .select('metadata')
        .eq('client_id', entityId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const convMeta = (typeof conv?.metadata === 'object' && conv?.metadata !== null)
        ? conv.metadata
        : {};

      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ metadata: { ...convMeta, tags }, tags })
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
    console.error('[updateCustomerTagAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
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
    console.error('[updateConversationStatusAction Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}

// Internal Dispatcher for External Webhooks
async function dispatchOptionalWebhook(tenantId: string, input: SendMessageInput): Promise<void> {
  try {
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const webhookUrl = tenant?.metadata?.whatsapp_settings?.webhook_url;
    if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.startsWith('http')) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: input.client_phone,
          text: input.text,
          conversation_id: input.conversation_id,
          timestamp: new Date().toISOString(),
        }),
      }).catch((fetchErr) => {
        console.warn('[WhatsApp Webhook Dispatch Warning]:', fetchErr.message);
      });
    }
  } catch (e) {
    // Non-blocking dispatch
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
      const lastMsgMatch = c.last_message?.text.toLowerCase().includes(q);
      if (!nameMatch && !phoneMatch && !lastMsgMatch) return false;
    }
    if (filter.tag_id && filter.tag_id !== 'all') {
      const hasTag = c.tags.some((t: any) => typeof t === 'string' ? t === filter.tag_id : (t?.id === filter.tag_id || t?.name === filter.tag_id));
      if (!hasTag) return false;
    }
    if (filter.status && filter.status !== 'all') {
      if (c.status !== filter.status) return false;
    }
    if (filter.unread_only && c.unread_count === 0) return false;
    if (filter.debt_only) {
      const debt = Number((c.metadata?.client_metadata as any)?.total_debt || 0);
      const isDeudorTag = c.tags.some((t: any) =>
        typeof t === 'string' ? t.toLowerCase().includes('deud') : t?.name?.toLowerCase().includes('deud')
      );
      if (debt <= 0 && !isDeudorTag) return false;
    }
    if (filter.birthday_only) {
      const birthDate = (c.metadata?.client_metadata as any)?.birth_date;
      if (!birthDate) return false;
      try {
        const b = new Date(birthDate);
        const now = new Date();
        if (b.getUTCMonth() !== now.getUTCMonth()) return false;
      } catch {
        return false;
      }
    }
    return true;
  });
}
