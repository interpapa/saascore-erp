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
  onSuccess: () => void;
  items: unknown[];
  initialItemId?: string;
  tenantId: string;
}

export function QuickStockModal({
  isOpen,
  onClose,
  onSuccess,
  items,
  initialItemId = ''
}: QuickStockModalProps) {
  const currentTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();

  const [selectedItemId, setSelectedItemId] = useState<string>(initialItemId);
  const [operationType, setOperationType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('Reposición de mercancía');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@Rendo.com',
    role: session?.role || ('owner' as const),
    token: session?.token,
  };

  const selectedItem = (items as any[]).find((i) => i.id === selectedItemId);
  const currentStock = selectedItem ? (selectedItem.stock ?? selectedItem.stock_quantity ?? 0) : 0;
  const quantityDelta = operationType === 'add' ? quantity : -quantity;
  const resultingStock = Math.max(0, currentStock + quantityDelta);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !selectedItemId) {
      toast({ variant: 'warning', title: 'Selección requerida', description: 'Selecciona un producto para ajustar.' });
      return;
    }

    if (quantity <= 0) {
      toast({ variant: 'warning', title: 'Cantidad inválida', description: 'La cantidad debe ser mayor a 0.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adjustItemStockAction(
        selectedItemId,
        quantityDelta,
        currentTenant.id,
        actor,
        reason
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Stock Actualizado',
          description: `${operationType === 'add' ? '+' : '-'}${quantity} uds. Nuevo stock disponible: ${res.newStock} uds.`
        });
        onSuccess();
        onClose();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error de conexión', description: (err as Error).message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
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
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="">-- Seleccionar de inventario --</option>
              {items.filter((i: any) => i.type === 'product').map((i: any) => (
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
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 0))}
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
