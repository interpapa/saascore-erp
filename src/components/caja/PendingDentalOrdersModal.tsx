'use client';

import React from 'react';
import { X, ShoppingCart } from 'lucide-react';

interface PendingDentalOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: any[];
  exchangeRate: number;
  onLoadOrder: (order: any) => void;
}

export function PendingDentalOrdersModal({
  isOpen,
  onClose,
  orders,
  exchangeRate,
  onLoadOrder,
}: PendingDentalOrdersModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <span className="text-lg">🦷</span>
            <span>Consultas Odontológicas por Cobrar</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {orders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <p className="text-xs font-bold">
                No hay consultas odontológicas pendientes de cobro
              </p>
              <p className="text-[11px] text-slate-500">
                Cuando los odontólogos despachen una orden desde el sillón,
                aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const meta = order.metadata || {};
              const items = meta.items || [];
              const patientName =
                order.entity?.name || meta.title || 'Paciente';

              return (
                <div
                  key={order.id}
                  className="p-4 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 hover:border-teal-500/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-black text-foreground">
                        {patientName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Orden: #{order.document_number} · Dr:{' '}
                        {meta.created_by_doctor || 'Odontólogo'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black font-mono text-teal-600 dark:text-teal-400 block">
                        ${Number(order.total_amount || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Bs.{' '}
                        {(
                          Number(order.total_amount || 0) * exchangeRate
                        ).toLocaleString('es-VE', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  {/* Procedimientos incluidos */}
                  {items.length > 0 && (
                    <div className="space-y-1 py-1.5 border-t border-border/40 text-[11px]">
                      {items.map((it: any, iIdx: number) => (
                        <div
                          key={iIdx}
                          className="flex justify-between text-slate-600 dark:text-slate-300"
                        >
                          <span>
                            • {it.procedureName} (Pieza {it.toothNum})
                          </span>
                          <span className="font-mono font-bold">
                            ${Number(it.cost || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onLoadOrder(order)}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 btn-haptic"
                  >
                    <ShoppingCart size={14} />
                    <span>Cargar al Ticket de Caja</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-border shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
