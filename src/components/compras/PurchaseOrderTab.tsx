'use client';

import { useState } from 'react';
import { Entity } from '@/lib/api/entities';
import { createDocumentAction } from '@/app/actions/documents';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { ShoppingCart, Plus, AlertCircle } from 'lucide-react';

interface PurchaseOrderTabProps {
  purchaseOrders: unknown[];
  suppliers: Entity[];
  catalogItems: unknown[];
  tenantId: string;
  onRefresh: () => void;
  initialItem?: string | null;
}

export function PurchaseOrderTab({
  purchaseOrders,
  suppliers,
  catalogItems,
  tenantId,
  onRefresh,
  initialItem,
}: PurchaseOrderTabProps) {
  const actor = useActionActor();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poLines, setPoLines] = useState<Array<{
    item_id: string;
    description: string;
    quantity: number;
    unit_price: number;
  }>>([]);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState(0);

  useEffect(() => {
    if (initialItem && catalogItems.length > 0 && !isModalOpen) {
      const item = catalogItems.find((i: any) => i.id === initialItem);
      if (item) {
        setIsModalOpen(true);
        setSelectedItemId(initialItem);
        setItemCost(item.cost || item.base_price || 0);
      }
    }
  }, [initialItem, catalogItems]);

  const handleAddLine = () => {
    if (!selectedItemId) return;
    const itemObj = catalogItems.find(i => i.id === selectedItemId);
    if (!itemObj) return;

    const uom = itemObj.metadata?.unit_of_measure || itemObj.metadata?.unit || 'Unidad';

    setPoLines([
      ...poLines,
      {
        item_id: itemObj.id,
        description: `${itemObj.name} (${uom})`,
        quantity: Number(itemQty),
        unit_price: Number(itemCost || itemObj.cost || itemObj.base_price),
      },
    ]);

    setSelectedItemId('');
    setItemQty(1);
    setItemCost(0);
  };

  const handleRemoveLine = (idx: number) => {
    setPoLines(poLines.filter((_, i) => i !== idx));
  };

  const calculateTotal = () => {
    return poLines.reduce((acc, line) => acc + (line.quantity * line.unit_price), 0);
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const activeLines = [...poLines];
    
    // Si hay un producto seleccionado en los inputs del formulario rápido, agregarlo automáticamente como línea
    if (selectedItemId) {
      const itemObj = catalogItems.find(i => i.id === selectedItemId);
      if (itemObj) {
        const uom = itemObj.metadata?.unit_of_measure || itemObj.metadata?.unit || 'Unidad';
        activeLines.push({
          item_id: itemObj.id,
          description: `${itemObj.name} (${uom})`,
          quantity: Number(itemQty),
          unit_price: Number(itemCost || itemObj.cost || itemObj.base_price),
        });
      }
    }

    if (activeLines.length === 0) {
      toast({ variant: 'error', title: 'Sin Productos', description: 'Selecciona al menos un producto del catálogo e introduce la cantidad.' });
      return;
    }

    // Traducir errores de base de datos o tokens para usuarios finales
    const sanitizeUserError = (err: string) => {
      const lower = err.toLowerCase();
      if (lower.includes('entity_id') || lower.includes('foreign key') || lower.includes('provider')) {
        return 'Por favor, selecciona un proveedor válido de la lista.';
      }
      if (lower.includes('notes') || lower.includes('due_date') || lower.includes('column') || lower.includes('cache')) {
        return 'Se detectó un cambio en el servidor. La base de datos se actualizó automáticamente, por favor intenta presionar Emitir nuevamente.';
      }
      if (lower.includes('token') || lower.includes('session') || lower.includes('unauthorized')) {
        return 'Tu sesión de usuario ha expirado. Por favor, recarga la página para continuar.';
      }
      return err;
    };

    try {
      setIsSubmitting(true);
      const res = await createDocumentAction(
        {
          type: 'purchase_order',
          status: 'in_progress',
          entity_id: selectedSupplierId || null,
          notes: poNotes || null,
          lines: activeLines.map(l => ({
            item_id: l.item_id,
            description: l.description,
            quantity: l.quantity,
            unit_price: l.unit_price,
            tax_amount: 0,
          })),
        },
        tenantId,
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Orden Creada', description: `Orden de compra ${res.document?.document_number || ''} emitida correctamente.` });
        setPoLines([]);
        setPoNotes('');
        setSelectedSupplierId('');
        setSelectedItemId('');
        setItemQty(1);
        setItemCost(0);
        setIsModalOpen(false);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Atención', description: sanitizeUserError(res.error || 'No se pudo crear la orden de compra.') });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Atención', description: sanitizeUserError((err as Error).message) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ShoppingCart size={20} className="text-orange-500" />
            Órdenes de Compra (PO)
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Registro de compromisos de compra con proveedores e inventario en tránsito
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-haptic shadow-xs"
        >
          <Plus size={16} />
          Nueva Orden de Compra
        </button>
      </div>

      {/* Grid / Feed de Órdenes */}
      {purchaseOrders.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-3xl space-y-3">
          <ShoppingCart size={36} className="mx-auto text-slate-400 opacity-50" />
          <p className="text-sm font-bold text-foreground">No hay órdenes de compra registradas</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Emite órdenes de compra a tus proveedores para recibir mercancía e iniciar la verificación 3-Way Match.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchaseOrders.map((po) => (
            <div key={po.id} className="bg-card border border-border rounded-2xl p-5 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-xs">
                  PO
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground text-sm">{po.document_number}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {po.status === 'in_progress' ? 'En Proceso' : po.status === 'draft' ? 'Borrador' : po.status === 'completed' ? 'Completado' : po.status === 'pending' ? 'Pendiente' : po.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Proveedor: <span className="font-semibold text-foreground">{po.entity?.name || 'Proveedor General'}</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-black text-foreground">${Number(po.total_amount || 0).toFixed(2)}</p>
                <span className="text-[11px] text-slate-400">
                  {new Date(po.issue_date || po.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Asistente de Creación PO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground mb-4">Emitir Orden de Compra (PO)</h3>

            <form onSubmit={handleCreatePO} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Seleccionar Proveedor *</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">-- Seleccionar Proveedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.tax_id || 'Sin RIF'})</option>
                  ))}
                </select>
              </div>

              {/* Agregar ítems a la orden */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-bold text-foreground">Agregar Producto del Catálogo</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Producto *</label>
                    <select
                      value={selectedItemId}
                      onChange={(e) => {
                        setSelectedItemId(e.target.value);
                        const item = catalogItems.find(i => i.id === e.target.value);
                        if (item) setItemCost(item.cost || item.base_price || 0);
                      }}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="">-- Seleccionar --</option>
                      {catalogItems.map(i => (
                        <option key={i.id} value={i.id}>{i.name} (${i.cost || i.base_price})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Number(e.target.value))}
                      placeholder="Cant."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 block mb-1 uppercase tracking-wider">Costo Pactado (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(Number(e.target.value))}
                      placeholder="Costo U."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Indicador de Unidad de Medida (UoM) dinámico */}
                {selectedItemId && (() => {
                  const item = catalogItems.find(i => i.id === selectedItemId);
                  const uom = item?.metadata?.unit_of_measure || item?.metadata?.unit || 'Unidad';
                  return (
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-orange-600 dark:text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/10 w-fit">
                      Medida de Compra: <span className="underline uppercase">{uom}</span>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleAddLine}
                  className="w-full bg-slate-200 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-700 dark:text-slate-300 py-1.5 rounded-xl text-xs font-bold transition-all"
                >
                  + Agregar Otro Producto (Múltiples Líneas)
                </button>
              </div>

              {/* Tabla de Líneas Agregadas */}
              {poLines.length > 0 && (
                <div className="border border-border rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                      <tr>
                        <th className="p-3">Descripción</th>
                        <th className="p-3 text-center">Cant.</th>
                        <th className="p-3 text-right">Costo U.</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {poLines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-foreground">{line.description}</td>
                          <td className="p-3 text-center">{line.quantity}</td>
                          <td className="p-3 text-right">${line.unit_price.toFixed(2)}</td>
                          <td className="p-3 text-right font-bold">${(line.quantity * line.unit_price).toFixed(2)}</td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(idx)}
                              className="text-red-500 hover:underline font-bold"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 text-right font-black text-sm border-t border-border">
                    Total Orden: ${calculateTotal().toFixed(2)} USD
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Notas / Observaciones</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Condiciones de pago, fecha estimada de entrega..."
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || (poLines.length === 0 && !selectedItemId)}
                  className="bg-primary text-primary-foreground px-5 py-2 rounded-xl text-xs font-bold btn-haptic disabled:opacity-50"
                >
                  {isSubmitting ? 'Emitiendo...' : 'Emitir Orden de Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
