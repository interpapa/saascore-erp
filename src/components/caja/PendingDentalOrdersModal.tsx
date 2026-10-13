'use client';

import React from 'react';
import { X, ShoppingCart, User, Stethoscope, ChevronRight, FileText } from 'lucide-react';

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
      <div className="relative w-full max-w-xl bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
              <Stethoscope size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Consultas y Procedimientos por Cobrar
              </h3>
              <p className="text-[11px] text-slate-500">
                Órdenes enviadas desde sillón odontológico o consultas médicas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mx-auto text-xl">
                🦷
              </div>
              <p className="text-xs font-bold text-foreground">
                No hay órdenes de consulta pendientes en caja
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                Cuando los odontólogos o médicos despachen un paciente desde el sillón, aparecerá aquí con su desglose para ser cobrado.
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
                meta.doctor?.name ||
                meta.created_by_doctor ||
                (isClinica ? 'Médico Especialista' : 'Odontólogo Tratante');
              
              const patientName =
                order.entity?.name || meta.patient_name || meta.title || 'Paciente';

              const totalUSD = Number(order.total_amount || 0);
              const totalVES = totalUSD * exchangeRate;

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 bg-card shadow-sm ${
                    isClinica
                      ? 'border-rose-500/30 hover:border-rose-500 bg-rose-500/5'
                      : 'border-teal-500/30 hover:border-teal-500 bg-teal-500/5'
                  }`}
                >
                  {/* Fila 1: Odontólogo y Paciente destacados */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="space-y-1">
                      {/* Badge Odontólogo Tratante */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
                            isClinica
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20'
                          }`}
                        >
                          👨‍⚕️ {isClinica ? 'Médico' : 'Odontólogo'}: <strong>{doctorName}</strong>
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 px-1">
                          #{order.document_number}
                        </span>
                      </div>

                      {/* Paciente */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground pt-0.5">
                        <User size={13} className="text-slate-400 shrink-0" />
                        <span>Paciente:</span>
                        <span className="text-sm font-black text-foreground">{patientName}</span>
                      </div>
                    </div>

                    {/* Monto Total */}
                    <div className="text-left sm:text-right shrink-0">
                      <span
                        className={`text-base font-black font-mono block leading-none ${
                          isClinica ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'
                        }`}
                      >
                        ${totalUSD.toFixed(2)} USD
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        Bs. {totalVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Fila 2: Procedimientos y costes detallados */}
                  {items.length > 0 && (
                    <div className="space-y-1.5 py-1 text-xs">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                        Tratamientos Realizados en Sillón:
                      </span>
                      <div className="bg-slate-50/80 dark:bg-slate-900/80 rounded-xl p-2.5 border border-border/50 space-y-1.5">
                        {items.map((it: any, iIdx: number) => {
                          const label =
                            it.procedureName ||
                            it.description ||
                            it.name ||
                            'Procedimiento Odontológico';
                          const unitCost = Number(
                            it.cost ?? it.price ?? it.amount ?? 0
                          );
                          return (
                            <div
                              key={iIdx}
                              className="flex items-center justify-between text-foreground text-xs"
                            >
                              <span className="flex items-center gap-1.5">
                                <span className="text-teal-500 text-[10px]">•</span>
                                <span className="font-semibold">{label}</span>
                                {it.toothNum && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-md">
                                    Pieza {it.toothNum}
                                  </span>
                                )}
                              </span>
                              <span className="font-mono font-bold text-foreground shrink-0">
                                ${unitCost.toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Fila 3: Botón de Cobro Inmediato */}
                  <button
                    type="button"
                    onClick={() => onLoadOrder(order)}
                    className={`w-full py-2.5 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-2 btn-haptic ${
                      isClinica
                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                        : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
                    }`}
                  >
                    <ShoppingCart size={15} />
                    <span>Cargar al Ticket de Caja para Cobrar ➔</span>
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
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
