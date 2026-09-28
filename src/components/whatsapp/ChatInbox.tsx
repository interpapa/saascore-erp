/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
import {
  Send,
  Phone,
  Tag,
  Plus,
  Archive,
  MessageCircle,
  Mail,
  User,
  Info,
  Calendar,
  DollarSign,
  MapPin,
  ExternalLink,
  UserPlus,
  Sparkles,
  Lock,
  Gift,
  CreditCard,
  Clock,
  ShoppingBag,
} from 'lucide-react';
import { Conversation, Message } from '@/types/whatsapp';
import { MessageHistory } from './MessageHistory';
import { CustomerTagBadge } from './CustomerTagBadge';
import { EmptyState } from '@/components/core/EmptyState';
import { Button } from '@/components/ui/Button';

interface ChatInboxProps {
  conversation: Conversation | null;
  messages: Message[];
  isLoadingMessages: boolean;
  onSendMessage: (text: string, openWa?: boolean, isInternalNote?: boolean) => Promise<void>;
  onAddTag: (tag: string) => Promise<void>;
  onRemoveTag: (tag: string) => Promise<void>;
  onUpdateStatus?: (status: 'active' | 'archived') => Promise<void>;
  onOpenNewModal: () => void;
  onConvertToClient?: (conversation: Conversation) => void;
  tenantSlug?: string;
  tenantName?: string;
  bankDetails?: string;
}

const PRESET_TAGS = ['VIP', 'Lead', 'Soporte', 'Cliente', 'Deudor', 'Proveedor'];

export function ChatInbox({
  conversation,
  messages,
  isLoadingMessages,
  onSendMessage,
  onAddTag,
  onRemoveTag,
  onUpdateStatus,
  onOpenNewModal,
  onConvertToClient,
  tenantSlug,
  tenantName,
  bankDetails,
}: ChatInboxProps) {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [autoOpenWa, setAutoOpenWa] = useState(false);
  const [isInternalNote, setIsInternalNote] = useState(false);

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

  const cleanPhone = conversation.client_phone.replace(/[^0-9]/g, '');

  const totalDebt = Number(
    ((conversation.metadata?.client_metadata as { total_debt?: number }) || {}).total_debt || 0
  );

  const clientBirthDate = (conversation.metadata?.client_metadata as any)?.birth_date;

  const catalogUrl = tenantSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/c/${tenantSlug}` : '';

  const defaultBankInfo = bankDetails || 'Pago Móvil: Banesco (0134) - V-12345678 - 04141234567 | Transferencia Bancaria Nacional o Zelle.';

  // Slash commands registry
  const slashCommands = [
    {
      cmd: '/pago',
      title: 'Datos de Pago y Cuentas',
      desc: 'Cuentas bancarias y Pago Móvil del negocio',
      icon: CreditCard,
      text: `Hola ${conversation.client_name}, aquí te compartimos nuestros datos bancarios para realizar tu pago:\n\n${defaultBankInfo}\n\nPor favor envíanos el comprobante por este medio al completar la operación.`,
    },
    {
      cmd: '/deuda',
      title: 'Recordatorio de Cobro',
      desc: 'Saldo adeudado y conciliación amigable',
      icon: DollarSign,
      text: totalDebt > 0
        ? `Hola ${conversation.client_name}, te saludamos de ${tenantName || 'administración'}. Te recordamos amablemente que mantienes un saldo pendiente de $${totalDebt.toFixed(2)} USD en tu cuenta. ¿Deseas los datos para realizar la transferencia hoy?`
        : `Hola ${conversation.client_name}, tu estado de cuenta se encuentra al día y solvente. ¡Muchas gracias por tu puntualidad!`,
    },
    {
      cmd: '/catalogo',
      title: 'Catálogo Digital',
      desc: 'Enlace a la tienda en línea',
      icon: ShoppingBag,
      text: catalogUrl
        ? `Hola ${conversation.client_name}, puedes revisar todos nuestros productos disponibles y realizar tu pedido en línea aquí: ${catalogUrl}`
        : `¡Con gusto te compartimos nuestra lista de productos disponibles!`,
    },
    {
      cmd: '/horario',
      title: 'Horarios de Atención',
      desc: 'Jornada de atención y apertura',
      icon: Clock,
      text: `Nuestro horario de atención en ${tenantName || 'nuestra sede'} es de Lunes a Viernes de 8:00 AM a 6:00 PM y Sábados de 9:00 AM a 2:00 PM. ¡Te esperamos!`,
    },
    {
      cmd: '/cumple',
      title: 'Felicitación de Cumpleaños',
      desc: 'Cupón especial y saludo festivo',
      icon: Gift,
      text: `¡Feliz cumpleaños ${conversation.client_name}! 🎉 De parte de todo el equipo de ${tenantName || 'nuestra empresa'}, te deseamos un excelente día. Para celebrarlo, tienes un 10% de descuento especial en tu próxima compra durante este mes. ¡Disfrútalo!`,
    },
    {
      cmd: '/cita',
      title: 'Recordatorio de Cita',
      desc: 'Confirmación de turno agendado',
      icon: Calendar,
      text: `Hola ${conversation.client_name}, te recordamos tu cita agendada en ${tenantName || 'nuestro centro'}. Por favor responde a este mensaje para confirmar tu asistencia o reprogramar si lo necesitas. ¡Te esperamos!`,
    },
  ];

  // Filter slash commands matching input
  const showSlashMenu = inputText.startsWith('/') && !isInternalNote;
  const filteredCommands = slashCommands.filter(sc => sc.cmd.toLowerCase().startsWith(inputText.toLowerCase()));

  const handleApplyCommand = (text: string) => {
    setInputText(text);
  };

  const handleSend = async (openWa = false) => {
    if (!inputText.trim() || isSending) return;
    try {
      setIsSending(true);
      const text = inputText.trim();
      setInputText('');
      await onSendMessage(text, openWa || (autoOpenWa && !isInternalNote), isInternalNote);

      if (!isInternalNote && (openWa || autoOpenWa) && cleanPhone) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (showSlashMenu && filteredCommands.length > 0) {
        e.preventDefault();
        handleApplyCommand(filteredCommands[0].text);
        return;
      }
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

  const openExternalWhatsApp = () => {
    if (!cleanPhone) return;
    const url = inputText.trim() && !isInternalNote
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(inputText.trim())}`
      : `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank');
  };

  return (
    <div className="flex-1 flex h-full min-w-0 overflow-hidden">
      <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-950/50 h-full min-w-0">
        {/* Header & Profile Summary */}
        <div className="px-4 sm:px-5 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center shrink-0">
              {conversation.client_name ? conversation.client_name.substring(0, 2).toUpperCase() : 'WA'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground truncate">{conversation.client_name}</h3>
                {!conversation.client_id && onConvertToClient && (
                  <button
                    onClick={() => onConvertToClient(conversation)}
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold hover:bg-blue-500/20 transition-colors cursor-pointer"
                    title="Registrar número como cliente en el CRM"
                  >
                    <UserPlus size={11} />
                    <span>+ CRM</span>
                  </button>
                )}
                {totalDebt > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 text-[10px] font-bold">
                    Deuda: ${totalDebt.toFixed(0)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                {conversation.client_phone && (
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Phone size={11} />
                    {conversation.client_phone}
                  </span>
                )}
                {conversation.client_email && (
                  <span className="flex items-center gap-1">
                    <Mail size={11} />
                    {conversation.client_email}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions: wa.me, tags, archive, CRM drawer */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Open directly in WhatsApp Web / App */}
            {cleanPhone && (
              <button
                onClick={openExternalWhatsApp}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 transition-colors btn-haptic cursor-pointer"
                title="Abrir chat en WhatsApp Web / Desktop"
              >
                <ExternalLink size={13} />
                <span className="hidden sm:inline">WhatsApp Web</span>
              </button>
            )}

            {/* Render Tags */}
            <div className="hidden xl:flex items-center gap-1 flex-wrap">
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
                className="p-1.5 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Agregar etiqueta"
              >
                <Tag size={13} />
                <span className="hidden sm:inline">+ Tag</span>
              </button>

              {showTagMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-bold text-slate-500 mb-1.5 px-2">Agregar Etiqueta</div>
                  <div className="space-y-1 mb-2">
                    {PRESET_TAGS.map((pt) => (
                      <button
                        key={pt}
                        onClick={() => handleAddTagSubmit(pt)}
                        className="w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-foreground flex items-center justify-between cursor-pointer"
                      >
                        <span>{pt}</span>
                        <Plus size={12} className="text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <div className="pt-1.5 border-t border-border flex gap-1">
                    <input
                      type="text"
                      placeholder="Personalizada..."
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTagSubmit(customTagInput);
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-background border border-input rounded-lg text-foreground focus:outline-none"
                    />
                    <button
                      onClick={() => handleAddTagSubmit(customTagInput)}
                      className="p-1.5 bg-primary text-primary-foreground rounded-lg text-xs cursor-pointer"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Archive / Unarchive */}
            {onUpdateStatus && (
              <button
                onClick={() => onUpdateStatus(conversation.status === 'archived' ? 'active' : 'archived')}
                className="p-1.5 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                title={conversation.status === 'archived' ? 'Desarchivar conversación' : 'Archivar conversación'}
              >
                <Archive size={13} />
                <span className="hidden lg:inline">
                  {conversation.status === 'archived' ? 'Desarchivar' : 'Archivar'}
                </span>
              </button>
            )}

            {/* CRM Drawer Toggle */}
            <button
              onClick={() => setShowProfilePanel(!showProfilePanel)}
              className={`p-1.5 rounded-xl border border-border bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                showProfilePanel ? 'text-primary border-primary bg-primary/5' : 'text-slate-600 dark:text-slate-300'
              }`}
              title="Ficha del Cliente / CRM"
            >
              <User size={13} />
              <span className="hidden sm:inline">CRM</span>
            </button>
          </div>
        </div>

        {/* Message History */}
        <MessageHistory
          messages={messages}
          isLoading={isLoadingMessages}
          activeClientName={conversation.client_name}
        />

        {/* Quick Reply Templates & Composer */}
        <div className="p-3 sm:p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-border space-y-2.5 shrink-0 relative">
          {/* Slash Command Suggestions Autocomplete */}
          {showSlashMenu && (
            <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 max-h-56 overflow-y-auto space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1 flex items-center justify-between">
                <span>Atajos y Comandos Disponibles:</span>
                <span className="text-[9px] font-normal text-slate-400">Presiona Enter o haz clic para insertar</span>
              </div>
              {filteredCommands.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 italic">No se encontró ningún comando para &quot;{inputText}&quot;</div>
              ) : (
                filteredCommands.map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.cmd}
                      type="button"
                      onClick={() => handleApplyCommand(sc.text)}
                      className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Icon size={14} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <span className="font-mono text-emerald-600 dark:text-emerald-400">{sc.cmd}</span>
                            <span>— {sc.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate max-w-sm">{sc.desc}</p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono group-hover:text-foreground">Insertar ↵</span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Quick Reply Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 flex items-center gap-1">
              <Sparkles size={11} />
              Atajos:
            </span>
            {slashCommands.slice(0, 4).map((sc) => (
              <button
                key={sc.cmd}
                onClick={() => setInputText(sc.text)}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border border-border cursor-pointer flex items-center gap-1"
              >
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{sc.cmd}</span>
                <span>{sc.title}</span>
              </button>
            ))}
          </div>

          {/* Textarea Input + Composer Actions */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isInternalNote
                    ? `Escribe una nota interna para el equipo... (Solo visible en el ERP)`
                    : `Escribe un mensaje para ${conversation.client_name}... (Escribe '/' para ver atajos)`
                }
                rows={2}
                className={`w-full bg-background border rounded-2xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 resize-none transition-all ${
                  isInternalNote
                    ? 'border-amber-400/60 bg-amber-500/5 focus:ring-amber-500/30'
                    : 'border-input focus:ring-emerald-500/30'
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                onClick={() => handleSend(false)}
                isLoading={isSending}
                disabled={!inputText.trim()}
                className={`font-bold btn-haptic h-11 px-4 rounded-xl shadow-sm text-white ${
                  isInternalNote
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                icon={isInternalNote ? <Lock size={15} /> : <Send size={15} />}
                title={isInternalNote ? 'Guardar nota interna de equipo' : 'Enviar mensaje al cliente'}
              >
                {isInternalNote ? 'Guardar Nota' : 'Enviar'}
              </Button>
            </div>
          </div>

          {/* Controls Bar: Internal Note Toggle & Auto-wa.me */}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-0.5 gap-2">
            <div className="flex items-center gap-4">
              {/* Internal Note Toggle */}
              <button
                type="button"
                onClick={() => setIsInternalNote(!isInternalNote)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isInternalNote
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    : 'text-slate-500 hover:text-foreground'
                }`}
              >
                <Lock size={12} />
                <span>{isInternalNote ? 'Modo: Nota Interna Activo' : 'Crear Nota Interna'}</span>
              </button>

              {!isInternalNote && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoOpenWa}
                    onChange={(e) => setAutoOpenWa(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 border-border"
                  />
                  <span>Abrir WhatsApp Web al enviar</span>
                </label>
              )}
            </div>

            {cleanPhone && (
              <span className="font-mono text-slate-400">+{cleanPhone}</span>
            )}
          </div>
        </div>
      </div>

      {/* Side CRM Profile Panel */}
      {showProfilePanel && (
        <div className="w-80 border-l border-border bg-slate-50/50 dark:bg-slate-900/50 p-5 overflow-y-auto hidden lg:block custom-scrollbar">
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
                  <p className="flex items-center justify-center gap-1 font-mono">
                    <Phone size={12} />
                    {conversation.client_phone}
                  </p>
                )}
                {clientBirthDate && (
                  <p className="flex items-center justify-center gap-1 text-pink-600 dark:text-pink-400 font-semibold">
                    <Gift size={12} />
                    Cumpleaños: {new Date(clientBirthDate).toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })}
                  </p>
                )}
                <p className="flex items-center justify-center gap-1">
                  <MapPin size={12} />
                  {(conversation.metadata?.client_address as string) || 'Sin dirección registrada'}
                </p>
              </div>
            </div>

            {/* Quick Convert Button if not yet a CRM client */}
            {!conversation.client_id && onConvertToClient && (
              <Button
                variant="outline"
                className="w-full text-xs font-bold border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 cursor-pointer"
                onClick={() => onConvertToClient(conversation)}
                icon={<UserPlus size={14} />}
              >
                Crear Ficha de Cliente
              </Button>
            )}
          </div>

          {/* Estado de Cuenta CRM */}
          <div className="mt-5 bg-card border border-border rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Info size={13} />
              <span>Estado de Cuenta CRM</span>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground">
                ${totalDebt.toFixed(2)} USD
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">
                Deuda Pendiente (Cuentas por Cobrar)
              </div>
            </div>

            {/* Botón de Cobranza Rápida */}
            {totalDebt > 0 && (
              <button
                type="button"
                onClick={() => {
                  const debtCmd = slashCommands.find(c => c.cmd === '/deuda');
                  if (debtCmd) setInputText(debtCmd.text);
                }}
                className="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <DollarSign size={13} />
                <span>Generar Recordatorio de Cobro</span>
              </button>
            )}

            <div className="space-y-1.5 border-t border-border pt-2">
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Estado:</span>
                <span
                  className={`font-bold text-[10px] uppercase px-2 py-0.5 rounded-full ${
                    totalDebt > 0
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-emerald-500/10 text-emerald-500'
                  }`}
                >
                  {totalDebt > 0 ? 'Con Deuda' : 'Al Día / Solvente'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-500">
                <span>Último contacto:</span>
                <span className="font-semibold text-foreground">
                  {new Date(conversation.last_activity).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Acciones Directas */}
          <div className="mt-5 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones Directas</div>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={conversation.client_id ? `/calendario?client=${conversation.client_id}` : '/calendario'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-xl text-xs font-bold transition-colors text-center"
              >
                <Calendar size={13} />
                <span>Cita</span>
              </a>
              <a
                href={conversation.client_id ? `/caja?client=${conversation.client_id}` : '/caja'}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors text-center shadow-xs"
              >
                <DollarSign size={13} />
                <span>Venta POS</span>
              </a>
            </div>
          </div>

          {/* Lista de etiquetas activas de este cliente */}
          <div className="mt-5 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Etiquetas del Contacto</div>
            <div className="flex flex-wrap gap-1.5">
              {conversation.tags?.length > 0 ? (
                conversation.tags.map((t, idx) => (
                  <CustomerTagBadge
                    key={typeof t === 'string' ? t + idx : t.id || idx}
                    tag={t}
                    onRemove={() => onRemoveTag(typeof t === 'string' ? t : t.name)}
                  />
                ))
              ) : (
                <span className="text-xs text-slate-400 italic">Sin etiquetas</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
