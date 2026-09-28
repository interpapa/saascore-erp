'use client';

import { useEffect, useRef } from 'react';
import { Check, CheckCheck, Clock, AlertTriangle, MessageCircle, Lock } from 'lucide-react';
import { Message } from '@/types/whatsapp';
import { EmptyState } from '@/components/core/EmptyState';

interface MessageHistoryProps {
  messages: Message[];
  isLoading: boolean;
  activeClientName?: string;
}

export function MessageHistory({ messages, isLoading, activeClientName }: MessageHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex justify-center items-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-6">
        <EmptyState
          icon={<MessageCircle size={36} />}
          title="Sin mensajes en este chat"
          description={`Envía el primer mensaje a ${activeClientName || 'este contacto'} para iniciar la conversación.`}
          className="py-6"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {messages.map((msg) => {
        const isInternalNote = Boolean(msg.metadata?.is_internal_note);
        const isAgent = msg.sender_type === 'agent' || isInternalNote;
        const formattedTime = msg.timestamp
          ? new Date(msg.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
          : '';

        // Render Internal Note Card (Private Team Sticky)
        if (isInternalNote) {
          return (
            <div key={msg.id} className="flex justify-center my-3">
              <div className="w-full max-w-md rounded-2xl p-3.5 bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 shadow-xs space-y-1.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Lock size={13} />
                    <span>Nota Interna (Solo visible para el equipo)</span>
                  </span>
                  {formattedTime && <span className="text-[10px] text-slate-400 font-mono">{formattedTime}</span>}
                </div>
                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words font-medium">
                  {msg.text}
                </p>
                {msg.sender_name && (
                  <span className="block text-[10px] text-slate-400 text-right">
                    Registrado por: {msg.sender_name}
                  </span>
                )}
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`flex ${isAgent ? 'justify-end' : 'justify-start'} mb-2`}
          >
            <div
              className={`max-w-[75%] sm:max-w-[65%] rounded-2xl p-3.5 shadow-xs relative group ${
                isAgent
                  ? 'bg-emerald-600 dark:bg-emerald-700 text-white rounded-tr-xs'
                  : 'bg-white dark:bg-slate-800 text-foreground border border-border rounded-tl-xs'
              }`}
            >
              {!isAgent && msg.sender_name && (
                <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {msg.sender_name}
                </span>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words pb-4 pr-10">
                {msg.text}
              </p>

              <div
                className={`absolute bottom-2 right-3 flex items-center gap-1 text-[10px] ${
                  isAgent ? 'text-emerald-100 opacity-90' : 'text-slate-400'
                }`}
              >
                <span>{formattedTime}</span>
                {isAgent && (
                  <span>
                    {msg.status === 'delivered' || msg.status === 'read' ? (
                      <CheckCheck size={14} className="text-emerald-200" />
                    ) : msg.status === 'sent' ? (
                      <Check size={14} />
                    ) : msg.status === 'failed' ? (
                      <AlertTriangle size={14} className="text-red-300" />
                    ) : (
                      <Clock size={14} className="animate-pulse" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
