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

  const filteredOrders = (orders || []).filter((d: any) => {
    const src = d?.metadata?.source;
    const isDental =
      src === 'dental_consultation' ||
      src === 'odontologia' ||
      (!src && d?.metadata?.payment_status === 'pending_cashier');
    const isClinica = src === 'clinica';
    return isDental || isClinica || d?.metadata?.payment_status === 'pending_cashier';
  });

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs animate-in fade-in"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <span className="text-lg">🩺</span>
            <span>Consultas Médicas y Odontológicas por Cobrar</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-1">
              <p className="text-xs font-bold">
                No hay consultas médicas u odontológicas pendientes de cobro
              </p>
              <p className="text-[11px] text-slate-500">
                Cuando los especialistas u odontólogos despachen una orden desde
                consulta, aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const meta = order.metadata || {};
              const items = meta.items || [];
              const isClinica = meta.source === 'clinica';
              const specialtyBadge = isClinica
                ? meta.specialty_name || 'Clínica Médica'
                : meta.specialty_name || 'Odontología';
              const doctorName =
                meta.doctor_name ||
                meta.created_by_doctor ||
                (isClinica ? 'Médico Especialista' : 'Odontólogo');
              const patientName =
                order.entity?.name || meta.patient_name || meta.title || 'Paciente';

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border border-border bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5 transition-all ${
                    isClinica
                      ? 'hover:border-rose-500/50'
                      : 'hover:border-teal-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-black text-foreground">
                          {patientName}
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isClinica
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                          }`}
                        >
                          {specialtyBadge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Orden: #{order.document_number} · Dr: {doctorName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-black font-mono block ${
                          isClinica
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-teal-600 dark:text-teal-400'
                        }`}
                      >
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

                  {/* Procedimientos o conceptos incluidos */}
                  {items.length > 0 && (
                    <div className="space-y-1 py-1.5 border-t border-border/40 text-[11px]">
                      {items.map((it: any, iIdx: number) => {
                        const label =
                          it.procedureName ||
                          it.description ||
                          it.name ||
                          'Servicio Médico';
                        const unitCost = Number(
                          it.cost ?? it.price ?? it.amount ?? 0
                        );
                        return (
                          <div
                            key={iIdx}
                            className="flex justify-between text-slate-600 dark:text-slate-300"
                          >
                            <span>
                              • {label}
                              {it.toothNum ? ` (Pieza ${it.toothNum})` : ''}
                            </span>
                            <span className="font-mono font-bold">
                              ${unitCost.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onLoadOrder(order)}
                    className={`w-full py-2 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 btn-haptic ${
                      isClinica
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-teal-600 hover:bg-teal-700'
                    }`}
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
