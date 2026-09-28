'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingBag, DollarSign, Calendar, ChevronDown, ChevronUp, Receipt, FileText } from 'lucide-react';
import { getCustomerHistoryAction, CustomerHistoryResult } from '@/app/actions/customers';

interface ClientHistoryTabProps {
  entityId: string;
  tenantId: string;
  actor: any;
  clientName: string;
}

export function ClientHistoryTab({ entityId, tenantId, actor, clientName }: ClientHistoryTabProps) {
  const [data, setData] = useState<CustomerHistoryResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !entityId || !actor) return;
    setIsLoading(true);
    getCustomerHistoryAction(tenantId, entityId, actor)
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
          if (res.data.purchases.length > 0) {
            setExpandedDocId(res.data.purchases[0].id);
          }
        }
      })
      .catch((err) => console.error('Error cargando historial de compras:', err))
      .finally(() => setIsLoading(false));
  }, [entityId, tenantId]);

  const toggleExpand = (id: string) => {
    setExpandedDocId((prev) => (prev === id ? null : id));
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Consultando facturas y compras en caja...</p>
      </div>
    );
  }

  if (!data || data.purchases.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-2xl p-6 text-slate-400 space-y-2">
        <ShoppingBag size={32} className="mx-auto opacity-30 text-amber-500" />
        <p className="text-xs font-bold text-foreground">Sin compras registradas</p>
        <p className="text-[11px] max-w-xs mx-auto">
          Cuando este cliente realice una compra en el Punto de Venta (Caja POS), sus facturas y órdenes aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tarjetas KPI de Compras */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Invertido</span>
          <span className="text-base font-black text-foreground font-mono block">${data.metrics.totalSpentUSD.toFixed(2)}</span>
          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold font-mono block">
            ≈ Bs. {data.metrics.totalSpentVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Compras Realizadas</span>
          <span className="text-base font-black text-foreground font-mono block">{data.metrics.purchaseCount}</span>
          <span className="text-[10px] text-slate-400 block truncate">
            Ticket prom: ${data.metrics.averageTicketUSD.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Lista de Comprobantes */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Comprobantes Emitidos ({data.purchases.length})
        </h4>

        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {data.purchases.map((doc) => {
            const isExpanded = expandedDocId === doc.id;
            const dateObj = new Date(doc.created_at);
            const dateStr = dateObj.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });

            return (
              <div key={doc.id} className="border border-border rounded-2xl bg-card overflow-hidden transition-all">
                <div
                  onClick={() => toggleExpand(doc.id)}
                  className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      doc.doc_subtype === 'fiscal_invoice' ? 'bg-primary text-primary-foreground' : 'bg-indigo-500/10 text-indigo-600'
                    }`}>
                      {doc.doc_subtype === 'fiscal_invoice' ? <Receipt size={13} /> : <FileText size={13} />}
                    </div>
                    <div className="min-w-0">
                      <span className="font-mono font-black text-foreground block truncate">{doc.document_number}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span className="capitalize">{doc.payment_method.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="font-mono font-black text-xs text-foreground block">${doc.total_amount.toFixed(2)}</span>
                      <span className="font-mono text-[9px] text-slate-400 block">
                        Bs. {doc.total_local.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-border/40 bg-slate-50/50 dark:bg-slate-900/30 text-[11px] space-y-1.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ítems comprados:</span>
                    {doc.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                        <span className="truncate pr-2">• <strong>{it.quantity}x</strong> {it.description}</span>
                        <span className="font-mono font-bold text-foreground shrink-0">${it.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
