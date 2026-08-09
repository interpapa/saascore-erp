'use client';

import { X, User, ClipboardList, Calendar, AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Document } from '@/lib/api/documents';
import { Button } from '@/components/ui/Button';

interface TicketDrawerProps {
  ticket: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (ticketId: string, newStatus: string) => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft:       { label: 'Pendiente',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',   icon: Clock },
  in_progress: { label: 'En Proceso',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',       icon: AlertTriangle },
  invoiced:    { label: 'Completado',  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle2 },
  annulled:    { label: 'Cancelado',   color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',            icon: X },
};

const NEXT_STATUS: Record<string, { value: string; label: string }> = {
  draft:       { value: 'in_progress', label: 'Iniciar Trabajo' },
  in_progress: { value: 'invoiced',    label: 'Marcar Completado' },
};

export function TicketDrawer({ ticket, isOpen, onClose, onStatusChange }: TicketDrawerProps) {
  if (!isOpen || !ticket) return null;

  const status = STATUS_CONFIG[ticket.status] || STATUS_CONFIG['draft'];
  const StatusIcon = status.icon;
  const nextStep = NEXT_STATUS[ticket.status];
  const meta = ticket.metadata || {};

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full mb-3 ${status.color}`}>
              <StatusIcon size={12} />
              {status.label}
            </div>
            <h2 className="text-lg font-black text-foreground leading-tight">{meta.title || 'Orden de Trabajo'}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">#{ticket.document_number}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cliente */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <User size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cliente</p>
              <p className="text-sm font-bold text-foreground">{(ticket.entity as any)?.name || 'Sin cliente'}</p>
              {(ticket.entity as any)?.phone && (
                <p className="text-xs text-slate-500">{(ticket.entity as any).phone}</p>
              )}
            </div>
          </div>

          {/* Descripción */}
          {meta.description && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Problema Reportado</h3>
              <p className="text-sm text-foreground bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl leading-relaxed">{meta.description}</p>
            </div>
          )}

          {/* Detalles */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Detalles</h3>
            <div className="space-y-2">
              {[
                { label: 'Prioridad', value: meta.priority === 'high' ? '🔴 Alta' : meta.priority === 'low' ? '🟢 Baja' : '🟡 Media' },
                { label: 'Creado', value: new Date(ticket.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <span className="text-slate-500 font-medium">{item.label}</span>
                  <span className="font-semibold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — Acción de cambio de estado */}
        {nextStep && (
          <div className="p-6 border-t border-border">
            <Button
              className="w-full"
              onClick={() => onStatusChange(ticket.id, nextStep.value)}
            >
              {nextStep.label}
              <ChevronRight size={16} className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
