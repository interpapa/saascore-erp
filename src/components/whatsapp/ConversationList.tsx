'use client';

import { Search, MessageCircle, Plus, Archive, Inbox, DollarSign, Gift } from 'lucide-react';
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

const FILTER_TAGS = ['all', 'VIP', 'Lead', 'Soporte', 'Cliente', 'Deudor', 'Proveedor'];

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  filter,
  onFilterChange,
  isLoading,
  onNewChatClick,
}: ConversationListProps) {
  const currentStatus = filter.status || 'active';

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
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors btn-haptic flex items-center gap-1 text-xs font-bold cursor-pointer"
            title="Nueva Conversación"
          >
            <Plus size={15} />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Status Tabs: Activas vs Archivadas */}
        <div className="grid grid-cols-2 gap-1 bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => onFilterChange({ ...filter, status: 'active' })}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currentStatus === 'active'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <Inbox size={13} />
            <span>Activas</span>
          </button>
          <button
            onClick={() => onFilterChange({ ...filter, status: 'archived' })}
            className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              currentStatus === 'archived'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-slate-500 hover:text-foreground'
            }`}
          >
            <Archive size={13} />
            <span>Archivadas</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono o mensaje..."
            value={filter.search || ''}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950 border border-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 font-medium text-foreground"
          />
        </div>

        {/* Smart Filters: Con Deuda, Cumpleaños, Tags */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {/* Quick Toggle: Con Deuda */}
          <button
            onClick={() => onFilterChange({ ...filter, debt_only: !filter.debt_only })}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              filter.debt_only
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-card text-slate-600 dark:text-slate-400 border border-border hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <DollarSign size={11} />
            <span>Con Deuda</span>
          </button>

          {/* Quick Toggle: Cumpleaños */}
          <button
            onClick={() => onFilterChange({ ...filter, birthday_only: !filter.birthday_only })}
            className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ${
              filter.birthday_only
                ? 'bg-pink-600 text-white shadow-xs'
                : 'bg-card text-slate-600 dark:text-slate-400 border border-border hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Gift size={11} />
            <span>Cumpleaños</span>
          </button>

          {FILTER_TAGS.map((tagKey) => {
            const isActive = !filter.debt_only && !filter.birthday_only && (filter.tag_id || 'all') === tagKey;
            const label = tagKey === 'all' ? 'Todos' : tagKey;
            return (
              <button
                key={tagKey}
                onClick={() => onFilterChange({ ...filter, tag_id: tagKey, debt_only: false, birthday_only: false })}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-card text-slate-600 dark:text-slate-400 border border-border hover:bg-slate-100 dark:hover:bg-slate-800'
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
              const debt = Number((conv.metadata?.client_metadata as { total_debt?: number })?.total_debt || 0);

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`p-3.5 text-left border-b border-border transition-colors flex items-start gap-3 relative cursor-pointer ${
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

                    <div className="flex items-center justify-between text-[11px] mb-1">
                      {conv.client_phone && (
                        <span className="font-mono text-slate-400 truncate">
                          +{conv.client_phone.replace(/[^0-9]/g, '')}
                        </span>
                      )}
                      {debt > 0 && (
                        <span className="font-bold text-red-500 bg-red-500/10 px-1.5 py-0.2 rounded-md text-[10px]">
                          ${debt.toFixed(0)}
                        </span>
                      )}
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
