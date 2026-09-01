'use client';

import React from 'react';
import { User, Clock, FileText, HelpCircle } from 'lucide-react';

interface AuditLogItem {
  id: string;
  created_at: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string;
  target_id?: string;
  metadata?: Record<string, unknown>;
}

interface AuditTrailSectionProps {
  logs: AuditLogItem[];
  isLoading?: boolean;
}

/**
 * AuditTrailSection — SaaSCore Design System
 * 
 * Dibuja una línea de tiempo interactiva con los cambios realizados
 * en el módulo, formateando las acciones en lenguaje natural.
 */
export function AuditTrailSection({ logs, isLoading = false }: AuditTrailSectionProps) {
  
  // Traducir acciones técnicas a lenguaje de negocio comprensible
  const getActionLabel = (action: string, metadata?: Record<string, unknown>) => {
    switch (action) {
      case 'invoice.created':
        return `Creó la factura por ${metadata?.amount ? `$${metadata.amount}` : 'monto no especificado'}`;
      case 'invoice.voided':
        return 'Anuló factura de venta';
      case 'payment.recorded':
        return `Registró pago de cliente por ${metadata?.amount ? `$${metadata.amount}` : ''}`;
      case 'payroll.processed':
        return `Procesó desembolso de nómina de ${metadata?.period || 'período'}`;
      case 'item.deleted':
        return `Eliminó ítem "${metadata?.name || 'desconocido'}" del catálogo`;
      case 'item.updated':
        return `Actualizó ítem "${metadata?.name || 'desconocido'}"`;
      case 'entity.updated':
        return `Modificó datos de ${metadata?.name || 'cliente/proveedor'}`;
      case 'journal_entry.created':
        return `Creó asiento diario contable por $${metadata?.amount || '0.00'}`;
      default:
        // Quitar puntos y mayúscula inicial para texto fluido
        return action.replace('.', ' ');
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('invoice') || action.includes('journal')) return <FileText size={14} />;
    if (action.includes('payroll') || action.includes('payment')) return <Clock size={14} />;
    if (action.includes('entity') || action.includes('employee')) return <User size={14} />;
    if (action.includes('item')) return <FileText size={14} />;
    return <HelpCircle size={14} />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="skeleton w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-3 w-1/3 rounded" />
              <div className="skeleton h-2 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-border">
        <p className="text-sm font-semibold">Sin registros de auditoría</p>
        <p className="text-xs mt-1 text-slate-400">Las acciones críticas del módulo se registrarán aquí.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-border/80 ml-4 pl-6 space-y-6 py-2 animate-in fade-in duration-300">
      {logs.map((log) => {
        const time = new Date(log.created_at).toLocaleTimeString('es', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        const date = new Date(log.created_at).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
        });

        return (
          <div key={log.id} className="relative group">
            {/* Círculo indicador de línea de tiempo */}
            <span 
              className="absolute -left-[35px] top-1 w-[18px] h-[18px] rounded-full border-2 border-card bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors group-hover:bg-primary-50 group-hover:text-primary"
              title={log.action}
            >
              {getActionIcon(log.action)}
            </span>

            {/* Fila */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
              <div>
                <p className="text-sm font-semibold text-foreground leading-snug">
                  {getActionLabel(log.action, log.metadata)}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{log.actor_email}</span>
                  <span>·</span>
                  <span className="capitalize px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded text-[9px] font-bold">
                    {log.actor_role}
                  </span>
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-xs font-bold text-slate-400">{date}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">{time}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
