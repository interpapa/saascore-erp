'use client';

import React, { useState } from 'react';
import { X, Package, Plus, RefreshCw, Save } from 'lucide-react';
import { createItemAction } from '@/app/actions/items';
import { ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

interface NewConsumableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  actor: ActionActor;
  onSuccess: (newItem: any) => void;
}

const COMMON_UNITS = ['Cárpules', 'Unidades', 'Cajas', 'Ampollas', 'Sobres', 'Frascos', 'Metros'];

export function NewConsumableModal({
  isOpen,
  onClose,
  tenantId,
  actor,
  onSuccess,
}: NewConsumableModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Insumos Odontológicos');
  const [stock, setStock] = useState('20');
  const [cost, setCost] = useState('1.50');
  const [unit, setUnit] = useState('Unidades');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ variant: 'warning', title: 'Nombre requerido', description: 'Por favor ingresa el nombre del insumo clínico.' });
      return;
    }

    try {
      setIsSubmitting(true);
      const parsedStock = Math.max(0, parseInt(stock, 10) || 0);
      const parsedCost = Math.max(0, parseFloat(cost) || 0);

      const res = await createItemAction(
        {
          name: name.trim(),
          type: 'product',
          category: category.trim() || 'Insumos',
          base_price: parsedCost * 1.5, // Precio sugerido de venta o recargo
          cost: parsedCost,
          stock_quantity: parsedStock,
          is_active: true,
          metadata: {
            is_consumable: true,
            unit: unit.trim() || 'Unidades',
            clinical_supply: true,
            created_from: 'dental_suite',
          },
        },
        tenantId,
        actor
      );

      if (res.success && res.item) {
        toast({
          variant: 'success',
          title: 'Insumo Registrado en Inventario',
          description: `${name} quedó registrado con ${parsedStock} ${unit} en existencias.`,
        });
        onSuccess(res.item);
        onClose();
        setName('');
        setStock('20');
        setCost('1.50');
      } else {
        toast({
          variant: 'error',
          title: 'Error al registrar',
          description: res.error || 'No se pudo guardar el insumo en inventario.',
        });
      }
    } catch (err: unknown) {
      toast({
        variant: 'error',
        title: 'Error de red',
        description: (err as Error).message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full shadow-2xl overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <Package size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground">Nuevo Insumo Clínico</h3>
              <p className="text-[10px] text-slate-400">Se agregará al catálogo de consumibles e inventario</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-foreground rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-500 block mb-1">Nombre del Insumo / Material *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Anestesia Lidocaína 2% con Epinefrina"
              className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-teal-500/30"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Categoría</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Insumos Odontológicos"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Unidad de Medida</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden"
              >
                {COMMON_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Stock Inicial</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="20"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Costo Unitario ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="1.50"
                className="w-full bg-background border border-input rounded-xl px-3 py-2 text-xs font-mono font-bold text-foreground focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-border text-slate-500 rounded-xl text-xs font-bold hover:text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 btn-haptic disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
              <span>Registrar Insumo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
