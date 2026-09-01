'use client';

import { useState } from 'react';
import { Send, Phone, Tag, Plus, Archive, MessageCircle, Mail, User, Info, Calendar, DollarSign, MapPin } from 'lucide-react';
import { Conversation, Message } from '@/types/whatsapp';
import { MessageHistory } from './MessageHistory';
import { CustomerTagBadge } from './CustomerTagBadge';
import { EmptyState } from '@/components/core/EmptyState';
import { Button } from '@/components/ui/Button';

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

const QUICK_REPLIES = [
  { label: '👋 Saludo', text: '¡Hola! Gracias por contactarnos. ¿En qué podemos ayudarte hoy?' },
  { label: '⏰ Horarios', text: 'Nuestro horario de atención es de Lunes a Viernes de 8:00 AM a 6:00 PM.' },
  { label: '💳 Pagos', text: 'Puedes realizar tus pagos mediante transferencia bancaria o tarjeta de crédito.' },
];

const PRESET_TAGS = ['VIP', 'Lead', 'Soporte', 'Cliente'];

export function ChatInbox({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  onAddTag,
  onRemoveTag,
  onUpdateStatus,
  onOpenNewModal,
}: ChatInboxProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showProfilePanel, setShowProfilePanel] = useState(false);

  if (!conversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 bg-slate-50/30 dark:bg-slate-900/20">
        <EmptyState
          icon={<MessageCircle size={48} />}
          title="WhatsApp CRM Omnicanal"
          description="Selecciona una conversación del menú izquierdo para chatear en tiempo real, o inicia una nueva."
          action={{
            label: 'Nuevo Mensaje',
            onClick: onOpenNewModal,
          }}
        />
      </div>
    );
  }

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    try {
      setIsSending(true);
      const text = inputText.trim();
      setInputText('');
      await onSendMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddTagSubmit = async (tag: string) => {
    if (!tag.trim()) return;
    await onAddTag(tag.trim());
    setCustomTagInput('');
    setShowTagMenu(false);
  };

  return (
    <div className="flex-1 flex h-full min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/50 h-full min-w-0">
        {/* Header & Profile Summary */}
        <div className="px-5 py-3.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
              {conversation.client_name ? conversation.client_name.substring(0, 2).toUpperCase() : 'WA'}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-foreground truncate">{conversation.client_name}</h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                {conversation.client_phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {conversation.client_phone}
                  </span>
                )}
                {conversation.client_email && (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {conversation.client_email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Tag Manager & Status Action */}
          <div className="flex items-center gap-2">
            {/* Render Tags */}
            <div className="hidden sm:flex items-center gap-1 flex-wrap">
              {conversation.tags?.map((t, idx) => (
                <CustomerTagBadge
                  key={typeof t === 'string' ? t + idx : t.id || idx}
                  tag={t}
                  onRemove={() => onRemoveTag(typeof t === 'string' ? t : t.name)}
                />
              ))}
            </div>

            {/* Add Tag Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowTagMenu(!showTagMenu)}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
                title="Agregar etiqueta"
              >
                <Tag size={14} />
                <span>+ Tag</span>
              </button>

              {showTagMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-slate-500 mb-1.5 px-2">Agregar Etiqueta</div>
                  <div className="space-y-1 mb-2">
                    {PRESET_TAGS.map((pt) => (
                      <button
                        key={pt}
                        onClick={() => handleAddTagSubmit(pt)}
                        className="w-full text-left px-2 py-1 text-xs rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-foreground flex items-center justify-between"
                      >
                        <span>{pt}</span>
                        <Plus size={12} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 border-t border-border flex gap-1">
                    <input
                      type="text"
                      placeholder="Personalizada..."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTagSubmit(customTagInput);
                      }}
                      className="w-full px-2 py-1 text-xs bg-background border border-input rounded-md text-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddTagSubmit(customTagInput)}
                      className="p-1 bg-primary text-primary-foreground rounded-md text-xs"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Update Status (Archive) */}
            {onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(conversation.status === 'archived' ? 'active' : 'archived')}
                className="p-1.5 rounded-lg border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors"
                title={conversation.status === 'archived' ? 'Desarchivar' : 'Archivar conversación'}
              >
                <Archive size={14} />
                <span className="hidden lg:inline">
                  {conversation.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                </span>
              </button>
            )}

            {/* Toggle Profile Panel */}
            <button
              onClick={() => setShowProfilePanel(!showProfilePanel)}
              className={`p-1.5 rounded-lg border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors ${
                showProfilePanel ? 'text-primary border-primary bg-primary/5' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Perfil de Cliente / CRM"
            >
              <User size={14} />
              <span className="hidden lg:inline">CRM</span>
            </button>
          </div>
        </div>

        {/* Message History */}
        <MessageHistory
          messages={messages}
          isLoading={isLoadingMessages}
          activeClientName={conversation.client_name}
        />

        {/* Quick Reply Chips & Message Input */}
        <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-border space-y-2.5 shrink-0">
          {/* Quick Replies */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">Respuestas rápidas:</span>
            {QUICK_REPLIES.map((qr, idx) => (
              <button
                key={idx}
                onClick={() => setInputText((prev) => (prev ? `${prev} ${qr.text}` : qr.text))}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border border-border"
              >
                {qr.label}
              </button>
            ))}
          </div>

          {/* Textarea Input + Send Button */}
          <div className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe un mensaje para ${conversation.client_name}... (Shift+Enter para salto de línea)`}
              rows={2}
              className="flex-1 bg-background border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
            />
            <Button
              onClick={handleSend}
              isLoading={isSending}
              disabled={!inputText.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground btn-haptic h-11 px-4 shadow-sm shrink-0"
              icon={<Send size={16} />}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {showProfilePanel && (
        <div className="w-80 border-l border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 p-5 overflow-y-auto hidden lg:block custom-scrollbar">
          {/* Resumen del Cliente */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xl font-bold flex items-center justify-center mx-auto">
              {conversation.client_name ? conversation.client_name.substring(0, 2).toUpperCase() : 'WA'}
            </div>
            <div>
              <h4 className="font-bold text-lg text-foreground">{conversation.client_name}</h4>
              <div className="text-xs text-slate-500 mt-1 space-y-1">
                {conversation.client_email && (
                  <p className="flex items-center justify-center gap-1">
                    <Mail size={12} />
                    {conversation.client_email}
                  </p>
                )}
                {conversation.client_phone && (
                  <p className="flex items-center justify-center gap-1">
                    <Phone size={12} />
                    {conversation.client_phone}
                  </p>
                )}
                <p className="flex items-center justify-center gap-1">
                  <MapPin size={12} />
                  {(conversation.metadata?.client_address as string) || 'Sin dirección registrada'}
                </p>
              </div>
            </div>
          </div>

          {/* Estado de Cuenta CRM */}
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 space-y-3">
            <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Info size={12} />
              <span>Estado de Cuenta CRM</span>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-amber-950 dark:text-amber-200">
                ${Number(((conversation.metadata?.client_metadata as { total_debt?: number }) || {}).total_debt || 0).toFixed(2)} USD
              </div>
              <div className="text-[10px] text-amber-700/80 dark:text-amber-400/80 uppercase font-semibold">Deuda Pendiente (Cuentas por Cobrar)</div>
            </div>
            <div className="space-y-1.5 border-t border-amber-200/50 dark:border-amber-900/30 pt-2">
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                <span>Estado de Crédito:</span>
                <span className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                  (((conversation.metadata?.client_metadata as { total_debt?: number }) || {}).total_debt || 0) > 0 
                    ? 'bg-red-500/10 text-red-500' 
                    : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {(((conversation.metadata?.client_metadata as { total_debt?: number }) || {}).total_debt || 0) > 0 ? 'Con Deuda' : 'Al Día / Solvente'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                <span>Último contacto:</span>
                <span className="font-semibold text-foreground">
                  {new Date(conversation.last_activity).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones Directas */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/calendario?client=${conversation.client_id}`}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors text-center"
              >
                <Calendar size={12} />
                <span>Agendar Cita</span>
              </a>
              <a
                href={`/caja?client=${conversation.client_id}`}
                className="flex items-center justify-center gap-1 px-2 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold transition-colors text-center"
              >
                <DollarSign size={12} />
                <span>Registrar Venta</span>
              </a>
            </div>
          </div>

          {/* Lista de etiquetas activas de este cliente */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Etiquetas del Cliente</div>
            <div className="flex flex-wrap gap-1">
              {conversation.tags?.length > 0 ? (
                conversation.tags.map((t, idx) => (
                  <CustomerTagBadge
                    key={typeof t === 'string' ? t + idx : t.id || idx}
                    tag={t}
                    onRemove={() => onRemoveTag(typeof t === 'string' ? t : t.name)}
                  />
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">Sin etiquetas</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
