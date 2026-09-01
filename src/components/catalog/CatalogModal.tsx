'use client';

import { useState, useEffect } from 'react';
import { X, Package, Tag, DollarSign, Archive, Check } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CreateItemInput } from '@/lib/api/items';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CreateItemInput) => Promise<void>;
  editItem?: unknown | null;
}

export function CatalogModal({ isOpen, onClose, onSave, editItem }: CatalogModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'product' | 'service'>('product');

  useEffect(() => {
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItemType(editItem.type);
    } else {
       
      setItemType('product');
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const basePrice = Number(formData.get('base_price') || 0);

    const itemData: CreateItemInput = {
      type: itemType,
      name: formData.get('name') as string,
      sku: (formData.get('sku') as string) || null,
      category: (formData.get('category') as string) || null,
      description: null,
      base_price: basePrice,
      cost: 0,
      stock_quantity: itemType === 'product' ? Number(formData.get('stock_quantity') || 0) : 0,
      metadata: {
        unit_of_measure: (formData.get('unit_of_measure') as string) || 'unidad'
      },
      is_active: true
    };

    try {
      await onSave(itemData);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar el ítem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-5 border-b border-border/50 bg-white/40 dark:bg-slate-900/40">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${itemType === 'product' ? 'bg-indigo-500' : 'bg-fuchsia-500'}`}>
              <Package size={18} />
            </div>
            {editItem ? 'Editar Elemento' : 'Nuevo Elemento'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors btn-haptic"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Type Selector (Pills) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setItemType('product')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${itemType === 'product' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Package size={16} /> Repuesto
            </button>
            <button
              type="button"
              onClick={() => setItemType('service')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${itemType === 'service' ? 'bg-white dark:bg-slate-700 shadow-sm text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              <Check size={16} /> Servicio
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-1 sm:col-span-2">
              <Input
                name="name"
                label="Nombre del Producto / Servicio *"
                placeholder="Ej: Producto A o Servicio B"
                defaultValue={editItem?.name || ''}
                icon={<Package size={18} />}
                required
                autoFocus
              />
            </div>
            <Input
              name="sku"
              label="Código SKU"
              placeholder="Ej. FIL-001"
              defaultValue={editItem?.sku || ''}
              icon={<Archive size={18} />}
            />
            <Input
              name="category"
              label="Categoría"
              placeholder="Ej. Frenos"
              defaultValue={editItem?.category || ''}
              icon={<Tag size={18} />}
            />
          </div>

          <div>
            <Input
              name="base_price"
              label="Precio de Venta ($) *"
              type="number"
              step="0.01"
              placeholder="0.00"
              defaultValue={editItem?.base_price || ''}
              icon={<DollarSign size={18} />}
              required
            />
          </div>

          {/* Ocultar campos de stock y medida si es servicio */}
          <div className={`transition-all duration-300 overflow-hidden space-y-4 ${itemType === 'product' ? 'max-h-[160px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="stock_quantity"
                label="Stock Inicial (Opcional)"
                type="number"
                placeholder="0"
                defaultValue={editItem?.stock_quantity ?? ''}
                icon={<Archive size={18} />}
              />
              
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Unidad de Medida (UoM)</label>
                <select
                  name="unit_of_measure"
                  defaultValue={editItem?.metadata?.unit_of_measure || 'unidad'}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="unidad">📦 Unidad (unidad)</option>
                  <option value="docena">📦 Docena (12 uds)</option>
                  <option value="caja de 50">📦 Caja de 50 uds</option>
                  <option value="caja de 100">📦 Caja de 100 uds</option>
                  <option value="paquete">📦 Paquete</option>
                  <option value="litro">🧪 Litro</option>
                  <option value="kilogramo">⚖️ Kilogramo</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3 sticky bottom-0 bg-card mt-auto">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full rounded-xl"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full rounded-xl"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (editItem ? 'Guardar Cambios' : 'Añadir al Catálogo')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
