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
  updateConversationStatusAction,
} from '@/app/actions/whatsapp';
import { getEntitiesAction } from '@/app/actions/entities';
import { Conversation, Message, WhatsAppFilterState } from '@/types/whatsapp';
import { Entity } from '@/lib/api/entities';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatInbox } from '@/components/whatsapp/ChatInbox';
import { WhatsAppModal } from '@/components/whatsapp/WhatsAppModal';
import { useActionActor } from '@/hooks/useActionActor';

export default function WhatsAppPage() {
  const { currentTenant } = useERPStore();
  const actor = useActionActor();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);

  const [filter, setFilter] = useState<WhatsAppFilterState>({ search: '', tag_id: 'all', status: 'active' });
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

    const tempId = `temp-${Date.now()}`;

  // Fetch conversations from Server Action
  const loadConversations = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingConvs(true);
      const res = await getConversationsAction(currentTenant.id, filter);
      if (res?.success && res.conversations) {
        setConversations(res.conversations);
        if (!activeConvId && res.conversations.length > 0) {
          setActiveConvId(res.conversations[0].id);
        }
      }
    } catch (err: any) {
      console.error('[WhatsAppPage loadConversations Error]:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [currentTenant?.id, filter, activeConvId]);

  // Fetch messages for active conversation from Server Action
  const loadMessages = useCallback(async (convId: string) => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingMsgs(true);
      const res = await getMessagesAction(convId, currentTenant.id);
      if (res?.success && res.messages) {
        setMessages(res.messages);
      }
    } catch (err: any) {
      console.error('[WhatsAppPage loadMessages Error]:', err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoadingConvs(false);
    }, 2500);

    async function loadData() {
      if (!currentTenant?.id) return;
      try {
        await loadConversations();
        const custRes = await getEntitiesAction(currentTenant.id, 'customer');
        if (isSubscribed && custRes?.success && custRes.entities) {
          setClients(custRes.entities as Entity[]);
        }
      } catch (err: any) {
        console.error('[WhatsAppPage loadData Error]:', err);
      } finally {
        if (isSubscribed) setIsLoadingConvs(false);
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [currentTenant?.id, loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  // 12-second refetch polling for real-time synchronization
  useEffect(() => {
    if (!currentTenant) return;
    const interval = setInterval(() => {
      loadConversations();
      if (activeConvId) {
        loadMessages(activeConvId);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [currentTenant, loadConversations, loadMessages, activeConvId]);

  // Handle Send Message inline with Optimistic update
  const handleSendMessage = async (text: string) => {
    if (!currentTenant || !activeConvId) return;
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv) return;

    const tempId = `temp-${Date.now()}`;


    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      tenant_id: currentTenant.id,
      sender_type: 'agent',
      sender_name: actor.email,
      text,
      status: 'pending',
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendMessageAction(
      {
        conversation_id: activeConvId,
        client_id: activeConv.client_id,
        client_phone: activeConv.client_phone,
        text,
      },
      currentTenant.id,
      actor
    );

    if (res.success && res.message) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message! : m)));
      toast({ variant: 'success', title: 'Mensaje enviado', description: 'Entregado vía WhatsApp' });
      loadConversations();
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      toast({ variant: 'error', title: 'Error de envío', description: res.error || 'No se pudo enviar el mensaje' });
    }
  };

  // Handle Send Message from Modal
  const handleModalSendMessage = async (data: { entity_id: string; phone: string; message: string }) => {
    if (!currentTenant) return;


    const convId = data.entity_id;

    const res = await sendMessageAction(
      {
        conversation_id: convId,
        client_id: data.entity_id,
        client_phone: data.phone,
        text: data.message,
      },
      currentTenant.id,
      actor
    );

    if (res.success) {
      toast({ variant: 'success', title: 'Mensaje enviado', description: 'Mensaje enviado correctamente vía WhatsApp' });
      await loadConversations();
      setActiveConvId(convId);
      loadMessages(convId);
    } else {
      toast({ variant: 'error', title: 'Error de envío', description: res.error || 'Fallo en el envío del mensaje' });
    }
  };

  // Add tag to customer
  const handleAddTag = async (newTag: string) => {
    if (!currentTenant || !activeConvId) return;
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv) return;

    const currentTagNames = (activeConv.tags || []).map((t) => (typeof t === 'string' ? t : t.name));
    if (currentTagNames.includes(newTag)) return;

    const updatedTags = [...currentTagNames, newTag];


    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            tags: updatedTags.map((t) => ({ id: t, name: t, color: '' })),
          };
        }
        return c;
      })
    );

    const targetEntityId = activeConv.client_id || activeConv.id;
    const res = await updateCustomerTagAction(targetEntityId, updatedTags, currentTenant.id, actor);

    if (res.success) {
      toast({ variant: 'success', title: 'Etiqueta agregada', description: `Etiqueta "${newTag}" agregada` });
      loadConversations();
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar etiquetas' });
    }
  };

  // Remove tag from customer
  const handleRemoveTag = async (tagToRemove: string) => {
    if (!currentTenant || !activeConvId) return;
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv) return;

    const currentTagNames = (activeConv.tags || []).map((t) => (typeof t === 'string' ? t : t.name));
    const updatedTags = currentTagNames.filter((t) => t !== tagToRemove);


    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            tags: updatedTags.map((t) => ({ id: t, name: t, color: '' })),
          };
        }
        return c;
      })
    );

    const targetEntityId = activeConv.client_id || activeConv.id;
    const res = await updateCustomerTagAction(targetEntityId, updatedTags, currentTenant.id, actor);

    if (res.success) {
      toast({ variant: 'success', title: 'Etiqueta eliminada', description: `Etiqueta "${tagToRemove}" eliminada` });
      loadConversations();
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar etiquetas' });
    }
  };

  // Update Conversation Status (Archive/Unarchive)
  const handleUpdateStatus = async (newStatus: 'active' | 'archived') => {
    if (!currentTenant || !activeConvId) return;


    const res = await updateConversationStatusAction(activeConvId, newStatus, currentTenant.id, actor);

    if (res.success) {
      toast({
        variant: 'success',
        title: newStatus === 'archived' ? 'Conversación archivada' : 'Conversación desarchivada',
        description: `Estado actualizado a ${newStatus}`,
      });
      loadConversations();
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo actualizar estado' });
    }
  };

  // KPI Metrics Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const mensajesEnviadosHoy = messages.filter(
    (m) => m.sender_type === 'agent' && m.timestamp?.startsWith(todayStr)
  ).length;
  const entregados = messages.filter((m) => m.status === 'delivered' || m.status === 'read').length;
  const errores = messages.filter((m) => m.status === 'failed').length;

  const activeConversation = conversations.find((c) => c.id === activeConvId) || null;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">WhatsApp CRM</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Bandeja de entrada omnicanal y gestión de clientes</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-haptic shadow-sm"
        >
          <Send size={18} />
          Nuevo Mensaje
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Enviados Hoy</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
              <MessageCircle size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{mensajesEnviadosHoy}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Entregados</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{entregados}</p>
        </div>

        <div className="bg-card border border-border p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Errores / Rebotes</h3>
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
              <XCircle size={20} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{errores}</p>
        </div>
      </div>

      {/* Main Omnichannel CRM Chat View */}
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
          conversation={activeConversation}
          messages={messages}
          isLoadingMessages={isLoadingMsgs}
          onSendMessage={handleSendMessage}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          onUpdateStatus={handleUpdateStatus}
          onOpenNewModal={() => setIsModalOpen(true)}
        />
      </div>

      <WhatsAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleModalSendMessage}
        clients={clients}
      />
    </div>
  );
}
