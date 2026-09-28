'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  Clock, 
  Receipt, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard,
  ExternalLink,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { getCustomerHistoryAction, CustomerHistoryResult } from '@/app/actions/customers';
import { voidSaleAction } from '@/app/actions/cashRegister';
import { useToast } from '@/components/core/ToastProvider';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName?: string;
  tenantId: string;
  actor: any;
}

export function CustomerHistoryModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  tenantId,
  actor
}: CustomerHistoryModalProps) {
  const [data, setData] = useState<CustomerHistoryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const { toast } = useToast();

  const handleVoidSale = async (docId: string, docNumber: string) => {
    const reason = window.prompt(`¿Estás seguro de anular la factura ${docNumber}?\nIndica el motivo de la anulación / devolución (se reingresará el stock al inventario):`);
    if (!reason || !reason.trim()) return;

    setIsVoiding(docId);
    try {
      const res = await voidSaleAction(docId, reason.trim(), tenantId, actor);
      if (res.success) {
        toast({ 
          variant: 'success', 
          title: 'Venta Anulada', 
          description: `La factura ${docNumber} fue anulada con éxito y el inventario restituido.` 
        });
        if (customerId) {
          const fresh = await getCustomerHistoryAction(tenantId, customerId, actor);
          if (fresh.success && fresh.data) setData(fresh.data);
        }
      } else {
        toast({ variant: 'error', title: 'Error al anular', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsVoiding(null);
    }
  };

  useEffect(() => {
    if (isOpen && customerId && customerId !== 'generic_counter_customer') {
      setIsLoading(true);
      setError(null);
      getCustomerHistoryAction(tenantId, customerId, actor)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
            if (res.data.purchases.length > 0) {
              setExpandedDocId(res.data.purchases[0].id);
            }
          } else {
            setError(res.error || 'No se pudo cargar el historial.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Error al consultar el historial.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, customerId, tenantId, actor]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedDocId(prev => prev === id ? null : id);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card/95 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between p-5 border-b border-border/50 bg-white/40 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-base shrink-0 border border-indigo-500/20">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {data?.customer.name || customerName || 'Historial del Cliente'}
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {data?.customer.tax_id && (
                  <span className="font-mono font-bold text-slate-500">{data.customer.tax_id}</span>
                )}
                {data?.customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone size={11} /> {data.customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors btn-haptic"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-medium">Consultando registros y compras históricas...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/20 text-rose-600 text-xs text-center font-bold">
              {error}
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No hay datos disponibles para este cliente.
            </div>
          ) : (
            <>
              {/* Tarjetas KPI del Cliente */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Total Invertido
                  </span>
                  <span className="text-base font-black text-foreground font-mono block">
                    ${data.metrics.totalSpentUSD.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-indigo-500 font-bold font-mono block">
                    ≈ Bs. {data.metrics.totalSpentVES.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Compras
                  </span>
                  <span className="text-base font-black text-foreground font-mono block">
                    {data.metrics.purchaseCount}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    operaciones
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Ticket Promedio
                  </span>
                  <span className="text-base font-black text-foreground font-mono block">
                    ${data.metrics.averageTicketUSD.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    por visita
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Pago Habitual
                  </span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block truncate capitalize">
                    {data.metrics.favoritePaymentMethod.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    más frecuente
                  </span>
                </div>
              </div>

              {/* Datos de Contacto */}
              {(data.customer.address || data.customer.email) && (
                <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/10 rounded-2xl flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-300">
                  {data.customer.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={13} className="text-indigo-500" />
                      <span>{data.customer.email}</span>
                    </div>
                  )}
                  {data.customer.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-indigo-500" />
                      <span>{data.customer.address}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Línea de Tiempo de Compras */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Historial de Compras ({data.purchases.length})</span>
                  <span className="text-[10px] lowercase text-slate-500 font-normal">ordenadas cronológicamente</span>
                </h3>

                {data.purchases.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 border border-dashed border-border rounded-2xl space-y-1">
                    <ShoppingBag size={28} className="mx-auto opacity-30" />
                    <p className="text-xs font-bold">Sin compras registradas aún</p>
                    <p className="text-[11px]">Cuando este cliente compre en caja, sus tickets aparecerán aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.purchases.map((doc) => {
                      const isExpanded = expandedDocId === doc.id;
                      const dateObj = new Date(doc.created_at);
                      const formattedDate = dateObj.toLocaleDateString('es-VE', { 
                        day: '2-digit', 
                        month: 'short', 
                        year: 'numeric' 
                      });
                      const formattedTime = dateObj.toLocaleTimeString('es-VE', { 
                        hour: '2-digit', 
                        minute: '2-digit',
                        hour12: true 
                      });

                      return (
                        <div 
                          key={doc.id}
                          className="border border-border rounded-2xl bg-card overflow-hidden transition-all hover:border-indigo-500/30"
                        >
                          <div 
                            onClick={() => toggleExpand(doc.id)}
                            className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 ${
                                doc.doc_subtype === 'fiscal_invoice' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {doc.doc_subtype === 'fiscal_invoice' ? <Receipt size={14} /> : <FileText size={14} />}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-xs text-foreground">
                                    {doc.document_number}
                                  </span>
                                  {doc.status === 'annulled' ? (
                                    <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                      ANULADA
                                    </span>
                                  ) : (
                                    <span className={`px-1.5 py-0.2 text-[9px] font-extrabold rounded-md ${
                                      doc.doc_subtype === 'fiscal_invoice'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-indigo-500/10 text-indigo-600'
                                    }`}>
                                      {doc.doc_label}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{formattedDate} • {formattedTime}</span>
                                  <span>•</span>
                                  <span className="capitalize">{doc.payment_method.replace('_', ' ')}</span>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <div className="text-right">
                                <span className={`font-mono font-black text-xs block ${doc.status === 'annulled' ? 'line-through text-slate-400' : 'text-foreground'}`}>
                                  ${doc.total_amount.toFixed(2)}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {doc.currency_symbol} {doc.total_local.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                              <button 
                                type="button" 
                                className="text-slate-400 hover:text-foreground p-1"
                              >
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            </div>
                          </div>

                          {/* Desglose de Productos Comprados */}
                          {isExpanded && (
                            <div className="px-4 pb-3.5 pt-1 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/30 text-xs space-y-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Artículos adquiridos ({doc.items.length}):
                              </span>
                              
                              {doc.items.length === 0 ? (
                                <p className="text-[11px] text-slate-400 italic">Detalle de líneas no disponible en este comprobante.</p>
                              ) : (
                                <div className="space-y-1">
                                  {doc.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                                      <span className="truncate pr-2">
                                        <strong className="font-mono text-foreground mr-1.5">{it.quantity}x</strong>
                                        {it.description}
                                      </span>
                                      <span className="font-mono font-bold text-foreground shrink-0">
                                        ${it.total.toFixed(2)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-slate-400">
                                <span>Atendido por: {doc.processed_by}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono">ID: {doc.id.slice(0, 8)}</span>
                                  {doc.status !== 'annulled' && (
                                    <button
                                      type="button"
                                      disabled={isVoiding === doc.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleVoidSale(doc.id, doc.document_number);
                                      }}
                                      className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Anular venta y restituir inventario"
                                    >
                                      <RotateCcw size={10} />
                                      <span>{isVoiding === doc.id ? 'Anulando...' : 'Anular Venta'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Pie */}
        <div className="p-4 border-t border-border/50 bg-white/40 dark:bg-slate-900/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-foreground text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all btn-haptic"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
