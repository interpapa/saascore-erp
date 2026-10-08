'use client';

import React, { useState } from 'react';
import { X, PackagePlus, MinusCircle, PlusCircle, AlertTriangle } from 'lucide-react';
import { adjustItemStockAction } from '@/app/actions/items';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';

interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedItem?: any) => void;
  items: unknown[];
  initialItemId?: string;
  tenantId: string;
}

export function QuickStockModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  initialItemId = '',
  tenantId
}: QuickStockModalProps) {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId);
  const [operationType, setOperationType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('Reposición de mercancía');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados financieros para compras y egresos
  const [recordExpense, setRecordExpense] = useState<boolean>(true);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<'cash' | 'payable' | 'other'>('cash');
  const [supplierName, setSupplierName] = useState<string>('');

  const selectedItem = (items as any[])?.find((i) => i.id === selectedItemId);

  // Sincronizar selección y costos cuando se abre el modal o cambia el ID inicial
  React.useEffect(() => {
    if (isOpen) {
      let targetId = initialItemId;
      if (!targetId && !selectedItemId && (items as any[])?.length > 0) {
        const firstProd = (items as any[]).find((i) => i.type === 'product' || !i.type);
        if (firstProd) targetId = firstProd.id;
      }
      if (targetId) {
        setSelectedItemId(targetId);
        const itemObj = (items as any[])?.find((i) => i.id === targetId);
        const costVal = Number(itemObj?.cost || 0);
        setUnitCost(costVal);
        setTotalCost(costVal * quantity);
      }
    }
  }, [isOpen, initialItemId, items]);

  // Actualizar costos cuando cambia el producto seleccionado
  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    const itemObj = (items as any[])?.find((i) => i.id === itemId);
    const costVal = Number(itemObj?.cost || 0);
    setUnitCost(costVal);
    setTotalCost(costVal * quantity);
  };

  // Actualizar cantidad y recalcular total
  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(1, newQty);
    setQuantity(validQty);
    setTotalCost(Math.round(unitCost * validQty * 100) / 100);
  };

  // Cambio manual de costo unitario
  const handleUnitCostChange = (cost: number) => {
    const validCost = Math.max(0, cost);
    setUnitCost(validCost);
    setTotalCost(Math.round(validCost * quantity * 100) / 100);
  };

  // Cambio manual de costo total
  const handleTotalCostChange = (total: number) => {
    const validTotal = Math.max(0, total);
    setTotalCost(validTotal);
    if (quantity > 0) {
      setUnitCost(Math.round((validTotal / quantity) * 100) / 100);
    }
  };

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@Rendo.com',
    role: session?.role || ('owner' as const),
    token: session?.token,
  };

  const currentStock = selectedItem ? Number(selectedItem.stock ?? selectedItem.stock_quantity ?? 0) : 0;
  const quantityDelta = operationType === 'add' ? quantity : -quantity;
  const resultingStock = Math.max(0, currentStock + quantityDelta);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveTenantId = tenantId || selectedItem?.tenant_id || currentTenant?.id || session?.tenantId;

    if (!selectedItemId) {
      toast({ variant: 'warning', title: 'Selección requerida', description: 'Selecciona un producto para ajustar.' });
      return;
    }

    if (!effectiveTenantId) {
      toast({ variant: 'warning', title: 'Empresa requerida', description: 'No se detectó la empresa activa para realizar el ajuste.' });
      return;
    }

    if (quantity <= 0) {
      toast({ variant: 'warning', title: 'Cantidad inválida', description: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const expensePayload = operationType === 'add' && recordExpense ? {
        recordExpense: true,
        unitCost,
        totalCost,
        paymentSource,
        supplierName: supplierName.trim() || undefined,
      } : undefined;

      const res = await adjustItemStockAction(
        selectedItemId,
        quantityDelta,
        effectiveTenantId,
        actor,
        reason,
        expensePayload
      );

      if (res.success) {
        const expenseNotice = (expensePayload && totalCost > 0) 
          ? ` • Gasto asentado: $${totalCost.toFixed(2)} USD (${paymentSource === 'cash' ? 'Caja Chica' : 'Por pagar'})`
          : '';

        toast({
          variant: 'success',
          title: 'Stock Actualizado con Éxito',
          description: `${operationType === 'add' ? '+' : '-'}${quantity} uds. Nuevo stock: ${res.newStock} uds.${expenseNotice}`
        });

        // Envía el ítem actualizado a la pantalla padre para reflejo optimista inmediato
        onSuccess(res.item);
        onClose();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error || 'No se pudo actualizar el stock.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de conexión', description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-sm ${operationType === 'add' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              <PackagePlus size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-foreground">
                Ajuste de Existencias Físicas
              </h3>
              <p className="text-xs text-slate-500">Conteo físico, reposición rápida o mermas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdjustStock} className="space-y-4">
          {/* Selector de Tipo de Movimiento */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setOperationType('add')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${operationType === 'add' ? 'bg-white dark:bg-slate-700 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-foreground'}`}
            >
              <PlusCircle size={15} /> Entrada (+)
            </button>
            <button
              type="button"
              onClick={() => setOperationType('subtract')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${operationType === 'subtract' ? 'bg-white dark:bg-slate-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-slate-500 hover:text-foreground'}`}
            >
              <MinusCircle size={15} /> Salida / Merma (-)
            </button>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Producto a Ajustar *</label>
            <select
              value={selectedItemId}
              onChange={(e) => handleItemSelect(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="">-- Seleccionar de inventario --</option>
              {items.filter((i: any) => i.type !== 'service').map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.name} — Stock actual: {i.stock ?? i.stock_quantity ?? 0} uds
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Cantidad *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                placeholder="1"
                className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Stock Resultante</label>
              <div className="w-full bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl px-3.5 py-2.5 text-sm font-black text-foreground">
                {resultingStock} uds
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Motivo del Ajuste (Kardex) *</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="Reposición de mercancía">📦 Reposición de mercancía</option>
              <option value="Ajuste por conteo físico">📋 Ajuste por conteo físico</option>
              <option value="Merma o producto dañado">⚠️ Merma / Daño / Vencimiento</option>
              <option value="Devolución de cliente">↩️ Devolución de cliente</option>
              <option value="Inventario inicial">🚀 Carga de inventario inicial</option>
            </select>
          </div>

          {/* Sección Financiera: Registro de Gasto / Compra al reponer mercancía */}
          {operationType === 'add' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-border rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                  <input
                    type="checkbox"
                    checked={recordExpense}
                    onChange={(e) => setRecordExpense(e.target.checked)}
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <span>¿Registrar egreso / gasto de compra?</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Caja & Compras
                </span>
              </div>

              {recordExpense && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Costo Unitario ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCost}
                        onChange={(e) => handleUnitCostChange(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Total Compra ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalCost}
                        onChange={(e) => handleTotalCostChange(Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs font-black text-emerald-600 dark:text-emerald-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Método de Pago</label>
                      <select
                        value={paymentSource}
                        onChange={(e) => setPaymentSource(e.target.value as any)}
                        className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-hidden text-foreground"
                      >
                        <option value="cash">💵 Caja Chica POS (Efectivo)</option>
                        <option value="payable">⏳ Cuenta por Pagar (Crédito)</option>
                        <option value="other">🏦 Banco / Transferencia</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">Proveedor (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ej: Mayorista Central"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-hidden text-foreground"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Se generará la orden de compra y se asentará el egreso en la gaveta activa.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedItemId || quantity <= 0}
              className={`px-5 py-2.5 rounded-xl text-xs font-black text-white btn-haptic shadow-md disabled:opacity-50 ${operationType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {isSubmitting ? 'Guardando...' : `Confirmar ${operationType === 'add' ? 'Entrada (+)' : 'Salida (-)'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
