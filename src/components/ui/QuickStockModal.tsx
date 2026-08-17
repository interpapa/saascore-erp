'use client';

import React, { useState } from 'react';
import { X, PackagePlus, AlertCircle } from 'lucide-react';
import { adjustItemStockAction } from '@/app/actions/items';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';

interface QuickStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  items: any[];
  initialItemId?: string;
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
  const [quantityToAdd, setQuantityToAdd] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant?.id || !selectedItemId) {
      toast({ variant: 'warning', title: 'Selección requerida', description: 'Selecciona un producto para reponer.' });
      return;
    }

    if (quantityToAdd <= 0) {
      toast({ variant: 'warning', title: 'Cantidad inválida', description: 'La cantidad a reponer debe ser mayor a 0.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await adjustItemStockAction(
        selectedItemId,
        Number(quantityToAdd),
        currentTenant.id,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Stock Actualizado',
          description: `Se agregaron +${quantityToAdd} unidades. Nuevo stock: ${res.newStock} uds.`
        });
        onSuccess();
        onClose();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error de conexión', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2 font-sans">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <PackagePlus size={18} />
            </div>
            Entrada / Reposición de Stock
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleAdjustStock} className="space-y-4 font-sans">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Seleccionar Producto *</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              <option value="">-- Seleccionar de catálogo --</option>
              {items.filter(i => i.type === 'product').map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.stock ?? i.stock_quantity ?? 0} disp.)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1.5">Cantidad a Sumar al Stock *</label>
            <input
              type="number"
              min="1"
              value={quantityToAdd}
              onChange={(e) => {
                const val = e.target.value;
                setQuantityToAdd(val === '' ? 0 : Number(val));
              }}
              onFocus={(e) => e.target.select()}
              placeholder="Ej. 10"
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-[11px] text-slate-400 mt-1">El número ingresado se sumará al inventario actual al instante.</p>
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
              disabled={isSubmitting || !selectedItemId || quantityToAdd <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-haptic disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar Reposición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
