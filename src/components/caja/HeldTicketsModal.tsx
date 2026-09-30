'use client';

import React from 'react';
import { Pause, X, Trash2, Play, Clock } from 'lucide-react';

export interface HeldTicketLine {
  item: any;
  quantity: number;
}

export interface HeldTicket {
  id: string;
  timestamp: string;
  customer: string;
  customerName: string;
  lines: HeldTicketLine[];
  docType: 'delivery_order' | 'fiscal_invoice';
  paymentMethod: 'cash_usd' | 'cash_ves' | 'pago_movil' | 'card' | 'transfer' | 'zelle' | 'mixed' | 'credit';
  totalUSD: number;
  totalVES: number;
}

interface HeldTicketsModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldTickets: HeldTicket[];
  onDiscard: (id: string) => void;
  onResume: (ticket: HeldTicket) => void;
}

export function HeldTicketsModal({
  isOpen,
  onClose,
  heldTickets,
  onDiscard,
  onResume,
}: HeldTicketsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-black">
              <Pause size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">Tickets en Espera</h3>
              <p className="text-xs text-slate-500 font-medium">
                {heldTickets.length === 1 ? '1 ticket pausado' : `${heldTickets.length} tickets pausados`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-border flex items-center justify-center text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {heldTickets.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Pause size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No hay tickets en espera</p>
              <p className="text-xs text-slate-500 mt-0.5">Pausa una venta activa para atender a otro cliente.</p>
            </div>
          ) : (
            heldTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="p-3.5 rounded-2xl border border-border bg-background hover:border-amber-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-foreground block">
                      {ticket.customerName}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Clock size={11} />
                      <span>Pausado a las {ticket.timestamp}</span>
                      <span>•</span>
                      <span>{ticket.lines.reduce((sum, l) => sum + l.quantity, 0)} ítem(s)</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-foreground block">
                      ${ticket.totalUSD.toFixed(2)}
                    </span>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold block">
                      Bs. {ticket.totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/30 rounded-xl p-2 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 max-h-24 overflow-y-auto">
                  {ticket.lines.map((l, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate pr-2">• {l.item.name} x{l.quantity}</span>
                      <span className="font-mono font-bold shrink-0">${((l.item.base_price || 0) * l.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onDiscard(ticket.id)}
                    className="px-3 py-1.5 rounded-xl border border-border hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Trash2 size={13} />
                    <span>Descartar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onResume(ticket)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-xs btn-haptic"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Recuperar Ticket</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-foreground font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
