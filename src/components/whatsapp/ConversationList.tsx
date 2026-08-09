'use client';

import { Search, MessageCircle, Plus } from 'lucide-react';
import { Conversation, WhatsAppFilterState } from '@/types/whatsapp';
import { CustomerTagBadge } from './CustomerTagBadge';
import { EmptyState } from '@/components/core/EmptyState';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  filter: WhatsAppFilterState;
  onFilterChange: (filter: WhatsAppFilterState) => void;
  isLoading: boolean;
  onNewChatClick: () => void;
}

const FILTER_TAGS = ['all', 'VIP', 'Lead', 'Soporte', 'Cliente'];

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  filter,
  onFilterChange,
  isLoading,
  onNewChatClick,
}: ConversationListProps) {
  return (
    <div className="w-full md:w-1/3 border-r border-border bg-slate-50/50 dark:bg-slate-900/50 flex flex-col h-full shrink-0">
      {/* Header & Search */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground flex items-center gap-2">
            <MessageCircle size={18} className="text-emerald-600 dark:text-emerald-400" />
            Conversaciones
          </h2>
          <button
            onClick={onNewChatClick}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors btn-haptic flex items-center gap-1 text-xs font-bold"
            title="Nueva Conversación"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={filter.search || ''}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium text-foreground"
          />
        </div>

        {/* Tag Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {FILTER_TAGS.map((tagKey) => {
            const isActive = (filter.tag_id || 'all') === tagKey;
            const label = tagKey === 'all' ? 'Todos' : tagKey;
            return (
              <button
                key={tagKey}
                onClick={() => onFilterChange({ ...filter, tag_id: tagKey })}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-border hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation Cards List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={36} />}
            title="Sin conversaciones"
            description="No se encontraron chats con el filtro o búsqueda actual."
            className="py-8"
          />
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => {
              const isSelected = activeConversationId === conv.id;
              const lastText = conv.last_message?.text || 'Sin mensajes';
              const lastTime = conv.last_activity
                ? new Date(conv.last_activity).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`p-3.5 text-left border-b border-border transition-colors flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center shrink-0 text-sm">
                    {conv.client_name ? conv.client_name.substring(0, 2).toUpperCase() : 'WA'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h4 className="font-bold text-sm text-foreground truncate pr-2">{conv.client_name}</h4>
                      {lastTime && <span className="text-[10px] text-slate-400 shrink-0">{lastTime}</span>}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-1.5">{lastText}</p>

                    {/* Customer Tags preview */}
                    {conv.tags && conv.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {conv.tags.slice(0, 2).map((t, idx) => (
                          <CustomerTagBadge key={typeof t === 'string' ? t + idx : t.id || idx} tag={t} size="sm" />
                        ))}
                      </div>
                    )}
                  </div>

                  {conv.unread_count > 0 && (
                    <span className="shrink-0 bg-emerald-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow-xs">
                      {conv.unread_count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
