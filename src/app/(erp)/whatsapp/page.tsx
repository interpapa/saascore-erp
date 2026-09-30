/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { MessageCircle, Send, CheckCircle2, XCircle, UserPlus, X } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useToast } from '@/components/core/ToastProvider';
import {
  getConversationsAction,
  getMessagesAction,
  sendMessageAction,
  updateCustomerTagAction,
  updateConversationStatusAction,
  createClientFromConversationAction,
} from '@/app/actions/whatsapp';
import { getEntitiesAction } from '@/app/actions/entities';
import { Conversation, Message, WhatsAppFilterState } from '@/types/whatsapp';
import { Entity } from '@/lib/api/entities';
import { ConversationList } from '@/components/whatsapp/ConversationList';
import { ChatInbox } from '@/components/whatsapp/ChatInbox';
import { WhatsAppModal } from '@/components/whatsapp/WhatsAppModal';
import { useActionActor } from '@/hooks/useActionActor';
import { Button } from '@/components/ui/Button';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function WhatsAppPageContent() {
  const currentTenant = useERPStore((s) => s.currentTenant);
  const actor = useActionActor();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialClientParam = searchParams.get('client');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [clients, setClients] = useState<Entity[]>([]);

  const [filter, setFilter] = useState<WhatsAppFilterState>({ search: '', tag_id: 'all', status: 'active' });
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMsgs, setIsLoadingMsgs] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Conversion to CRM state
  const [convertTargetConv, setConvertTargetConv] = useState<Conversation | null>(null);
  const [convertName, setConvertName] = useState('');
  const [convertPhone, setConvertPhone] = useState('');
  const [convertEmail, setConvertEmail] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Fetch conversations from Server Action
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConvs(true);
      if (!currentTenant?.id || !actor) return;
      const res = await getConversationsAction(currentTenant.id, filter, actor);
      if (res?.success && res.conversations) {
        setConversations(res.conversations);
        if (initialClientParam) {
          const existingConv = res.conversations.find((c: any) => c.client_id === initialClientParam);
          if (existingConv) {
            setActiveConvId(existingConv.id);
          } else {
            setIsModalOpen(true);
          }
        } else {
          setActiveConvId((prev) => prev || (res.conversations.length > 0 ? res.conversations[0].id : null));
        }
      }
    } catch (err: unknown) {
      console.error('[WhatsAppPage loadConversations Error]:', err);
    } finally {
      setIsLoadingConvs(false);
    }
  }, [currentTenant?.id, filter, initialClientParam, actor]);

  // Fetch messages for active conversation from Server Action
  const loadMessages = useCallback(async (convId: string) => {
    if (!currentTenant?.id || !actor) return;
    try {
      setIsLoadingMsgs(true);
      const res = await getMessagesAction(convId, currentTenant.id, actor);
      if (res?.success && res.messages) {
        setMessages(res.messages);
      }
    } catch (err: unknown) {
      console.error('[WhatsAppPage loadMessages Error]:', err);
    } finally {
      setIsLoadingMsgs(false);
    }
  }, [currentTenant?.id, actor]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoadingConvs(false);
    }, 2500);

    async function loadData() {
      if (!currentTenant?.id || !actor) return;
      try {
        await loadConversations();
        const custRes = await getEntitiesAction(currentTenant.id, 'customer', 100, actor);
        if (isSubscribed && custRes?.success && custRes.entities) {
          setClients(custRes.entities as Entity[]);
        }
      } catch (err: unknown) {
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
  }, [currentTenant?.id, actor, loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, loadMessages]);

  // Supabase Realtime WebSocket Subscription (Instant <100ms updates)
  useEffect(() => {
    if (!currentTenant?.id) return;

    const channel = supabase
      .channel(`realtime-wa-${currentTenant.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (payload.eventType === 'INSERT') {
            if (activeConvId && newMsg.conversation_id === activeConvId) {
              setMessages((prev) => {
                const exists = prev.some((m) => m.id === newMsg.id);
                if (exists) return prev;
                const tempIndex = prev.findIndex(
                  (m) => m.id.startsWith('temp-') && m.text === newMsg.text && m.sender_type === newMsg.sender_type
                );
                if (tempIndex !== -1) {
                  const updated = [...prev];
                  updated[tempIndex] = newMsg;
                  return updated;
                }
                return [...prev, newMsg];
              });
            }
            loadConversations();
          } else if (payload.eventType === 'UPDATE') {
            if (activeConvId && newMsg.conversation_id === activeConvId) {
              setMessages((prev) => prev.map((m) => (m.id === newMsg.id ? newMsg : m)));
            }
            loadConversations();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `tenant_id=eq.${currentTenant.id}`,
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentTenant?.id, activeConvId, loadConversations]);

  // Fallback heartbeat polling (30s) in case WebSocket reconnects
  useEffect(() => {
    if (!currentTenant) return;
    const interval = setInterval(() => {
      loadConversations();
      if (activeConvId) {
        loadMessages(activeConvId);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentTenant, loadConversations, loadMessages, activeConvId]);

  // Handle Send Message inline with Optimistic update
  const handleSendMessage = async (text: string, openWa = false, isInternalNote = false) => {
    if (!currentTenant || !activeConvId) return;
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }
    const activeConv = conversations.find((c) => c.id === activeConvId);
    if (!activeConv) return;

    const tempId = `temp-${Date.now()}`;

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: activeConvId,
      tenant_id: currentTenant.id,
      sender_type: isInternalNote ? 'system' : 'agent',
      sender_name: isInternalNote ? `Nota Interna (${actor.email})` : actor.email,
      text,
      status: 'pending',
      timestamp: new Date().toISOString(),
      metadata: { is_internal_note: isInternalNote },
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    const res = await sendMessageAction(
      {
        conversation_id: activeConvId,
        client_id: activeConv.client_id,
        client_name: activeConv.client_name,
        client_phone: activeConv.client_phone,
        text,
        open_whatsapp: openWa,
        is_internal_note: isInternalNote,
      },
      currentTenant.id,
      actor
    );

    if (res.success && res.message) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? res.message! : m)));
      toast({
        variant: 'success',
        title: isInternalNote ? 'Nota interna guardada' : 'Mensaje registrado',
        description: isInternalNote ? 'Visible solo para el equipo' : 'Guardado en el historial de WhatsApp',
      });
      loadConversations();
    } else {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      toast({ variant: 'error', title: 'Error', description: res.error || 'No se pudo registrar' });
    }
  };

  // Handle Send Message from Modal
  const handleModalSendMessage = async (data: {
    entity_id?: string | null;
    phone: string;
    client_name?: string;
    message: string;
    open_whatsapp?: boolean;
  }) => {
    if (!currentTenant) return;
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }

    const convId = data.entity_id || `conv-${data.phone}`;

    const res = await sendMessageAction(
      {
        conversation_id: convId,
        client_id: data.entity_id || null,
        client_name: data.client_name,
        client_phone: data.phone,
        text: data.message,
        open_whatsapp: data.open_whatsapp,
      },
      currentTenant.id,
      actor
    );

    if (res.success) {
      toast({ variant: 'success', title: 'Conversación iniciada', description: 'Mensaje registrado en WhatsApp CRM' });
      await loadConversations();
      setActiveConvId(convId);
      loadMessages(convId);
    } else {
      toast({ variant: 'error', title: 'Error', description: res.error || 'Fallo al iniciar conversación' });
    }
  };

  // Add tag to customer
  const handleAddTag = async (newTag: string) => {
    if (!currentTenant || !activeConvId) return;
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }
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
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }
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
    if (!actor) {
      toast({ variant: 'error', title: 'Error', description: 'Tu sesión ha expirado. Por favor, recarga la página.' });
      return;
    }

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

  // Convert Contact to CRM Client
  const openConvertModal = (conv: Conversation) => {
    setConvertTargetConv(conv);
    setConvertName(conv.client_name.startsWith('+') ? '' : conv.client_name);
    setConvertPhone(conv.client_phone);
    setConvertEmail(conv.client_email || '');
  };

  const handleExecuteConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant || !convertTargetConv || !actor) return;
    if (!convertName.trim() || !convertPhone.trim()) {
      toast({ variant: 'warning', title: 'Campos requeridos', description: 'Nombre y teléfono son obligatorios.' });
      return;
    }

    try {
      setIsConverting(true);
      const res = await createClientFromConversationAction(
        convertTargetConv.id,
        {
          name: convertName.trim(),
          phone: convertPhone.trim(),
          email: convertEmail.trim() || undefined,
        },
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Cliente registrado', description: `${convertName} ahora es cliente en el CRM.` });
        setConvertTargetConv(null);
        await loadConversations();
        const custRes = await getEntitiesAction(currentTenant.id, 'customer', 100, actor);
        if (custRes?.success && custRes.entities) {
          setClients(custRes.entities as Entity[]);
        }
      } else {
        toast({ variant: 'error', title: 'Error al registrar', description: res.error || 'No se pudo crear el cliente.' });
      }
    } finally {
      setIsConverting(false);
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
          <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">
            Bandeja omnicanal soberana y comunicación directa con clientes y contactos
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 btn-haptic shadow-sm"
        >
          <Send size={16} />
          Nuevo Mensaje
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enviados Hoy</h3>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{mensajesEnviadosHoy}</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Registrados en Inbox</h3>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-foreground">{entregados}</p>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-xs hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Errores / Fallidos</h3>
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center">
              <XCircle size={18} />
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
          onConvertToClient={openConvertModal}
          tenantSlug={currentTenant?.slug}
          tenantName={currentTenant?.name}
        />
      </div>

      {/* Start New Conversation Modal */}
      <WhatsAppModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSend={handleModalSendMessage}
        clients={clients}
        initialClientId={initialClientParam}
      />

      {/* Convert to CRM Client Modal */}
      {convertTargetConv && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConvertTargetConv(null)} />
          <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl p-6 z-10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <UserPlus size={18} className="text-blue-600" />
                Registrar Cliente en CRM
              </h3>
              <button
                onClick={() => setConvertTargetConv(null)}
                className="p-1.5 text-slate-400 hover:text-foreground rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteConvert} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: María Rodríguez"
                  value={convertName}
                  onChange={(e) => setConvertName(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  value={convertPhone}
                  onChange={(e) => setConvertPhone(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={convertEmail}
                  onChange={(e) => setConvertEmail(e.target.value)}
                  className="w-full bg-background border border-input rounded-xl px-3.5 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setConvertTargetConv(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  isLoading={isConverting}
                >
                  Guardar en CRM
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[500px]">Cargando WhatsApp CRM...</div>}>
      <WhatsAppPageContent />
    </Suspense>
  );
}
