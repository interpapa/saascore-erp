# Milestone 3 Analysis & Implementation Strategy: Specialized UI for `/whatsapp` (CRM Inbox Omnicanal)

## 1. Observation

### Current Implementation Audit (`src/app/(erp)/whatsapp/page.tsx`)
- **Direct API & Fallback Dependency**: The current `/whatsapp/page.tsx` directly calls legacy client functions `getDocuments('whatsapp_log')` and `getEntities('customer')` from `@/lib/api/documents` and `@/lib/api/entities` (lines 27-28), ignoring the dedicated server actions in `src/app/actions/whatsapp.ts`.
- **Client-side Manual Grouping**: It aggregates conversation threads manually in memory via `messages.map(m => m.entity_id)` (lines 72-86), missing support for filtering by customer tag, unread status, or conversation status (`active` / `archived`).
- **Modal-only Messaging**: Sending messages relies on opening `WhatsAppModal` via `createDocumentWithLines` (lines 43-63), lacking an inline chat input composer inside the active conversation window (lines 260-269).
- **Hardcoded Visual Assets & Static UI**: Line 204 uses an external hardcoded image `bg-[url('https://i.ibb.co/3W6qWq9/wa-bg.png')]` for the chat background. Line 233 contains a static text badge `Historial de mensajes enviados`.
- **Missing Toast & Feedback Systems**: Uses `console.error` and modal error state without leveraging `@/components/core/ToastProvider`.

### Server Actions Audit (`src/app/actions/whatsapp.ts`)
- **Implemented Actions**:
  - `getConversationsAction(tenantId, filter)` (lines 27-150): Queries `whatsapp_conversations` table or falls back to aggregating `documents` (`type = whatsapp_log`) and `entities` (`type = customer`). Supports `WhatsAppFilterState` (`search`, `tag_id`, `status`, `unread_only`).
  - `getMessagesAction(conversationId, tenantId)` (lines 155-207): Queries `whatsapp_messages` table or falls back to `documents` (`type = whatsapp_log`).
  - `sendMessageAction(input, tenantId, actor)` (lines 212-323): Validates security access (`validateUserTenantAccess`), inserts into `whatsapp_messages` or fallback `documents`, records audit log (`writeAuditLog`), and calls `revalidatePath('/whatsapp')`.
  - `updateCustomerTagAction(entityId, tags, tenantId, actor)` (lines 328-390): Updates customer tags in `entities.metadata.tags` and `whatsapp_conversations.metadata.tags`.
- **Action Gaps Identified**:
  - Missing explicit action `updateConversationStatusAction(conversationId, status, tenantId, actor)` to archive or block conversations.
  - Missing explicit helper action `addConversationTagAction(entityId, tag, tenantId, actor)` to append single tags cleanly.

### Domain Types (`src/types/whatsapp.ts`)
- Complete and well-defined: `MessageSenderType`, `MessageDeliveryStatus`, `CustomerTag`, `QuickReply`, `Message`, `Conversation`, `WhatsAppFilterState`, `SendMessageInput`.

### Components Directory (`src/components/whatsapp/`)
- Existing: `WhatsAppModal.tsx` (142 lines).
- Missing: `CustomerTagBadge.tsx`, `ConversationList.tsx`, `MessageHistory.tsx`, `ChatInbox.tsx`.

---

## 2. Logic Chain

1. **Connecting `/whatsapp/page.tsx` to Server Actions**: By replacing `getDocuments`/`getEntities` with `getConversationsAction`, `getMessagesAction`, `sendMessageAction`, and `updateCustomerTagAction`, the page gains access to both primary database tables (`whatsapp_conversations`/`whatsapp_messages`) and automatic fallback to `documents`/`entities`.
2. **Server Action Completion**: Adding `updateConversationStatusAction` and `addConversationTagAction` (or extending `updateCustomerTagAction`) allows complete CRM workflow management (archiving chats, tagging leads/VIPs) directly from the server.
3. **Modular UI Decomposition**:
   - Extracting customer badges into `CustomerTagBadge.tsx` ensures uniform color-coding for `VIP`, `Lead`, `Soporte`, and `Cliente`.
   - Extracting `ConversationList.tsx` isolates search, tag filter pills, unread count badges, and selection highlight logic.
   - Extracting `MessageHistory.tsx` handles scroll auto-bottom, bubble styling (incoming vs outgoing), timestamps, and delivery status icons.
   - Extracting `ChatInbox.tsx` combines conversation header, profile summary, customer tag quick manager, `MessageHistory`, and inline message composer input.
4. **Optimistic Updates & Toast Synchronization**: When a user sends a message, an optimistic `Message` object with status `'pending'` is appended to local state immediately. Once `sendMessageAction` resolves, it updates status to `'delivered'` and triggers a success Toast. If an error occurs, it marks the message as `'failed'` and displays an error Toast.
5. **Layout Estandarización (R1 & R2)**: Wrapping `/whatsapp/page.tsx` in `w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 flex flex-col md:flex-row gap-6 space-y-0` guarantees alignment with all other ERP modules, respecting the 80px FloatingHeader spacing and ensuring no z-index conflicts.

---

## 3. Caveats

- **Database Table Presence**: The server actions handles both existing tables (`whatsapp_conversations`/`whatsapp_messages`) and non-existing tables by gracefully falling back to `documents` (`type: 'whatsapp_log'`) and `entities` (`type: 'customer'`). No database schema migration is strictly required for UI execution.
- **Real-Time Polling vs WebSockets**: Periodic polling (e.g. every 12 seconds) combined with optimistic client updates provides a robust real-time feel without introducing complex WebSocket state management or connection leaks in Next.js Server Actions environments.

---

## 4. Conclusion & Implementation Strategy

### A. Enhancements to `src/app/actions/whatsapp.ts`
Add `updateConversationStatusAction` and `addConversationTagAction`:

```typescript
export async function updateConversationStatusAction(
  conversationId: string,
  status: 'active' | 'archived' | 'blocked',
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) return { success: false, error: securityCheck.error };

    const { error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .update({ status })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId);

    if (error && !isMissingTableError(error)) throw new Error(error.message);

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
    return { success: false, error: err.message };
  }
}
```

### B. New Component Plans in `src/components/whatsapp/`

#### 1. `src/components/whatsapp/CustomerTagBadge.tsx`
- **Purpose**: Render color-coded customer badges with optional removal button.
- **Color Mapping**:
  - `VIP`: `bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50`
  - `Lead`: `bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50`
  - `Soporte`: `bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700/50`
  - `Cliente` (default): `bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50`
- **Props**: `{ tag: string | CustomerTag; onRemove?: () => void; size?: 'sm' | 'md' }`

#### 2. `src/components/whatsapp/ConversationList.tsx`
- **Purpose**: Conversation sidebar with real-time search, tag filter pills, unread count badges, active chat highlight.
- **Props**:
  ```typescript
  interface ConversationListProps {
    conversations: Conversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    filter: WhatsAppFilterState;
    onFilterChange: (filter: WhatsAppFilterState) => void;
    isLoading: boolean;
    onNewChatClick: () => void;
  }
  ```
- **Features**:
  - Search input for client name / phone number.
  - Tag filter buttons (`Todos`, `VIP`, `Lead`, `Soporte`, `Cliente`).
  - Unread count badge (styled pill `bg-emerald-500 text-white font-bold`).
  - EmptyState integration when no results match search or filters.

#### 3. `src/components/whatsapp/MessageHistory.tsx`
- **Purpose**: Render message stream with incoming vs outgoing styling, timestamps, delivery status icons, and dynamic auto-scroll.
- **Props**: `{ messages: Message[]; isLoading: boolean; activeClientName?: string }`
- **Features**:
  - Outgoing message bubble: `bg-emerald-600 dark:bg-emerald-700 text-white rounded-2xl rounded-tr-xs`
  - Incoming message bubble: `bg-white dark:bg-slate-800 text-foreground border border-border rounded-2xl rounded-tl-xs`
  - Status icons: `CheckCheck` (delivered/read), `Check` (sent), `Clock` (pending), `AlertTriangle` (failed).
  - Auto-scroll to bottom using `useRef<HTMLDivElement>(null)` and `useEffect` on `messages.length`.

#### 4. `src/components/whatsapp/ChatInbox.tsx`
- **Purpose**: Active chat header, customer profile summary, customer tag quick badges, `MessageHistory`, and inline chat composer input.
- **Props**:
  ```typescript
  interface ChatInboxProps {
    conversation: Conversation | null;
    messages: Message[];
    isLoadingMessages: boolean;
    onSendMessage: (text: string) => Promise<void>;
    onAddTag: (tag: string) => Promise<void>;
    onRemoveTag: (tag: string) => Promise<void>;
    onUpdateStatus?: (status: 'active' | 'archived') => Promise<void>;
    onOpenNewModal: () => void;
  }
  ```
- **Features**:
  - Chat Header with customer avatar, phone, quick tag management, and action dropdown menu.
  - Inline input bar with text area, quick reply templates, and send button (`btn-haptic bg-primary`).
  - EmptyState view when no conversation is selected.

### C. Refactored Page Flow for `src/app/(erp)/whatsapp/page.tsx`

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, CheckCircle2, XCircle } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useToast } from '@/components/core/ToastProvider';
import {
  getConversationsAction,
  getMessagesAction,
  sendMessageAction,
  updateCustomerTagAction,
  updateConversationStatusAction
} from '@/app/actions/whatsapp';
import { Conversation, Message, WhatsAppFilterState } from '@/types/whatsapp';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatInbox } from '@/components/whatsapp/ChatInbox';
import { WhatsAppModal } from '@/components/whatsapp/WhatsAppModal';
import { getEntities, Entity } from '@/lib/api/entities';

export default function WhatsAppPage() {
  const { currentTenant, currentUser } = useERPStore();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);
  
  const [filter, setFilter] = useState<WhatsAppFilterState>({ search: '', tag_id: 'all', status: 'active' });
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!currentTenant) return;
    const res = await getConversationsAction(currentTenant.id, filter);
    if (res.success) {
      setConversations(res.conversations);
      if (!activeConvId && res.conversations.length > 0) {
        setActiveConvId(res.conversations[0].id);
      }
    }
    setIsLoadingConvs(false);
  }, [currentTenant, filter, activeConvId]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    if (!currentTenant) return;
    setIsLoadingMsgs(true);
    const res = await getMessagesAction(convId, currentTenant.id);
    if (res.success) {
      setMessages(res.messages);
    }
    setIsLoadingMsgs(false);
  }, [currentTenant]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId, loadMessages]);

  // Polling every 12 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadConversations();
      if (activeConvId) loadMessages(activeConvId);
    }, 12000);
    return () => clearInterval(timer);
  }, [loadConversations, loadMessages, activeConvId]);

  // Optimistic Send Message
  const handleSendMessage = async (text: string) => {
    if (!currentTenant || !activeConvId) return;
    const activeConv = conversations.find(c => c.id === activeConvId);
    if (!activeConv) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      tenant_id: currentTenant.id,
      sender_type: 'agent',
      sender_name: currentUser?.email || 'Agente',
      text,
      status: 'pending',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);

    const actor = { email: currentUser?.email || 'user@saascore.com', role: 'admin' };
    const res = await sendMessageAction({
      conversation_id: activeConvId,
      client_id: activeConv.client_id,
      client_phone: activeConv.client_phone,
      text
    }, currentTenant.id, actor);

    if (res.success && res.message) {
      setMessages(prev => prev.map(m => m.id === tempId ? res.message! : m));
      toast({ variant: 'success', title: 'Mensaje enviado', description: 'Entregado vía WhatsApp' });
      loadConversations();
    } else {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      toast({ variant: 'error', title: 'Error de envío', description: res.error || 'No se pudo enviar el mensaje' });
    }
  };

  // KPIs calculation
  const totalEnviados = conversations.reduce((acc, c) => acc + (c.last_message ? 1 : 0), 0);
  const entregados = messages.filter(m => m.status === 'delivered' || m.status === 'read').length;
  const errores = messages.filter(m => m.status === 'failed').length;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & KPI cards */}
      ...
      {/* CRM Inbox Split View */}
      <div className="bg-card border border-border rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row h-[650px]">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConvId}
          onSelectConversation={setActiveConvId}
          filter={filter}
          onFilterChange={setFilter}
          isLoading={isLoadingConvs}
          onNewChatClick={() => setIsModalOpen(true)}
        />
        <ChatInbox
          conversation={conversations.find(c => c.id === activeConvId) || null}
          messages={messages}
          isLoadingMessages={isLoadingMsgs}
          onSendMessage={handleSendMessage}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onOpenNewModal={() => setIsModalOpen(true)}
        />
      </div>
      ...
    </div>
  );
}
```

---

## 5. Verification Method

1. **Compilation Check**:
   Execute `cmd /c "npx tsc --noEmit"` in root directory to confirm 0 TypeScript compilation errors.
2. **Component File Verification**:
   Inspect that the following files exist in `src/components/whatsapp/`:
   - `CustomerTagBadge.tsx`
   - `ConversationList.tsx`
   - `MessageHistory.tsx`
   - `ChatInbox.tsx`
   - `WhatsAppModal.tsx`
3. **Invalidation Conditions**:
   - TypeScript compilation failure (`npx tsc --noEmit` fails).
   - Direct hardcoded mock arrays remaining in `src/app/(erp)/whatsapp/page.tsx`.
   - Missing fallback logic or broken server action signatures.
