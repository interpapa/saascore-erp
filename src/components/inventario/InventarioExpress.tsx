'use client';

import React, { useState, useMemo } from 'react';
import { Item } from '@/lib/api/items';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  Plus, 
  Minus, 
  CheckCircle2, 
  SlidersHorizontal,
  Barcode,
  Layers,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';

interface InventarioExpressProps {
  items: Item[];
  tenantId: string;
  onStockChange: (item: Item, newStock: number) => Promise<void> | void;
  onOpenAdjustmentModal: (itemId: string) => void;
  onNewItem: () => void;
  isLoading?: boolean;
}

export function InventarioExpress({
  items,
  tenantId,
  onStockChange,
  onOpenAdjustmentModal,
  onNewItem,
  isLoading = false
}: InventarioExpressProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'low_stock' | 'out_of_stock' | 'products'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtrado reactivo optimizado
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = (item.sku || '').toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }

      const currentStock = item.stock_quantity ?? (item as any).stock ?? 0;
      const minStock = (item.metadata as any)?.min_stock ?? 5;

      if (filterType === 'products') {
        return item.type !== 'service';
      }
      if (filterType === 'out_of_stock') {
        return item.type !== 'service' && currentStock <= 0;
      }
      if (filterType === 'low_stock') {
        return item.type !== 'service' && currentStock > 0 && currentStock <= minStock;
      }

      return true;
    });
  }, [items, searchTerm, filterType]);

  // Métricas rápidas para la barra superior
  const metrics = useMemo(() => {
    let outOfStock = 0;
    let lowStock = 0;
    let totalStock = 0;

    items.forEach((item) => {
      if (item.type !== 'service') {
        const stock = item.stock_quantity ?? (item as any).stock ?? 0;
        const minStock = (item.metadata as any)?.min_stock ?? 5;
        totalStock += stock;
        if (stock <= 0) outOfStock++;
        else if (stock <= minStock) lowStock++;
      }
    });

    return { outOfStock, lowStock, totalStock };
  }, [items]);

  const handleStep = async (item: Item, delta: number) => {
    const current = item.stock_quantity ?? (item as any).stock ?? 0;
    const target = Math.max(0, current + delta);
    setUpdatingId(item.id);
    try {
      await onStockChange(item, target);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full space-y-4 pb-24 animate-in fade-in duration-200">
      {/* Banner de Modo Pasillo */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 rounded-2xl p-4 text-white shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/25 shrink-0">
              <Barcode size={22} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight leading-tight">Modo Pasillo / Conteo Físico</h2>
                <span className="bg-white/25 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full">Express</span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">Control de existencias rápido con botones táctiles de 1-toque</p>
            </div>
          </div>
          <button
            onClick={onNewItem}
            className="btn-haptic shrink-0 bg-white text-indigo-900 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={15} />
            <span>Nuevo</span>
          </button>
        </div>

        {/* Resumen táctil rápido */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/20 text-center">
          <div className="bg-white/10 rounded-xl py-1.5 px-2">
            <span className="text-[10px] uppercase font-bold text-white/70 block">Unidades</span>
            <span className="text-base font-black text-white">{metrics.totalStock}</span>
          </div>
          <div 
            onClick={() => setFilterType('low_stock')}
            className={`rounded-xl py-1.5 px-2 cursor-pointer transition-colors ${filterType === 'low_stock' ? 'bg-amber-400 text-amber-950 font-black' : 'bg-white/10 text-white'}`}
          >
            <span className="text-[10px] uppercase font-bold text-white/70 block">Bajo Stock</span>
            <span className="text-base font-black text-amber-200">{metrics.lowStock}</span>
          </div>
          <div 
            onClick={() => setFilterType('out_of_stock')}
            className={`rounded-xl py-1.5 px-2 cursor-pointer transition-colors ${filterType === 'out_of_stock' ? 'bg-red-500 text-white font-black' : 'bg-white/10 text-white'}`}
          >
            <span className="text-[10px] uppercase font-bold text-white/70 block">Agotados</span>
            <span className="text-base font-black text-red-200">{metrics.outOfStock}</span>
          </div>
        </div>
      </div>

      {/* Buscador y Filtros Táctiles */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU, código de barras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ×
            </button>
          )}
        </div>

        {/* Chips de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card border border-border text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos ({items.length})
          </button>
          <button
            onClick={() => setFilterType('products')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              filterType === 'products'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-card border border-border text-slate-600 dark:text-slate-300'
            }`}
          >
            Solo Físicos
          </button>
          <button
            onClick={() => setFilterType('low_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1 ${
              filterType === 'low_stock'
                ? 'bg-amber-500 text-amber-950 font-black shadow-xs'
                : 'bg-card border border-border text-amber-600 dark:text-amber-400'
            }`}
          >
            <AlertTriangle size={13} />
            Stock Bajo ({metrics.lowStock})
          </button>
          <button
            onClick={() => setFilterType('out_of_stock')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors ${
              filterType === 'out_of_stock'
                ? 'bg-red-600 text-white font-black shadow-xs'
                : 'bg-card border border-border text-red-600 dark:text-red-400'
            }`}
          >
            Agotados ({metrics.outOfStock})
          </button>
        </div>
      </div>

      {/* Lista de Artículos para Conteo Táctil */}
      {filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-2xl p-8 text-center space-y-2">
          <Package className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <p className="text-sm font-bold text-foreground">No se encontraron artículos</p>
          <p className="text-xs text-slate-500">Prueba con otro término de búsqueda o cambia de filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isService = item.type === 'service';
            const stock = item.stock_quantity ?? (item as any).stock ?? 0;
            const minStock = (item.metadata as any)?.min_stock ?? 5;
            const isOut = !isService && stock <= 0;
            const isLow = !isService && stock > 0 && stock <= minStock;
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                className={`bg-card border rounded-2xl p-4 shadow-xs transition-all ${
                  isOut 
                    ? 'border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10' 
                    : isLow 
                    ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Info del Producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-foreground tracking-tight truncate">
                        {item.name}
                      </span>
                      {item.category && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
                      {item.sku && (
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                          {item.sku}
                        </span>
                      )}
                      <span className="font-bold text-foreground">
                        ${Number(item.base_price || 0).toFixed(2)}
                      </span>
                      {isService && (
                        <span className="text-teal-600 dark:text-teal-400 font-bold text-[11px]">
                          ⚡ Servicio
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Badge de Estado del Stock */}
                  {!isService && (
                    <div className="text-right shrink-0">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          Agotado
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                          Bajo ({minStock} mín)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          Disponible
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Controles Táctiles de Conteo Rápido (Solo para productos físicos) */}
                {!isService && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                    {/* Cantidad Actual Táctil */}
                    <div 
                      onClick={() => onOpenAdjustmentModal(item.id)}
                      className="cursor-pointer flex items-center gap-2 group active:scale-95 transition-transform"
                      title="Toca para ajustar el número exacto"
                    >
                      <div className={`text-2xl font-black font-mono tracking-tight px-3 py-1 rounded-xl border ${
                        isOut 
                          ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400' 
                          : isLow 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 border-border text-foreground'
                      }`}>
                        {stock}
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        <span className="font-bold text-foreground block">unidades</span>
                        <span className="text-[10px] text-primary group-hover:underline">Ajustar ✎</span>
                      </div>
                    </div>

                    {/* Botonera de Toque Rápido */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStep(item, -1)}
                        disabled={isUpdating || stock <= 0}
                        className="w-11 h-11 rounded-xl bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-black text-lg flex items-center justify-center btn-haptic disabled:opacity-40 disabled:pointer-events-none active:scale-90 transition-transform"
                        title="Restar 1 unidad"
                      >
                        <Minus size={18} />
                      </button>

                      <button
                        onClick={() => handleStep(item, +1)}
                        disabled={isUpdating}
                        className="w-11 h-11 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-black text-lg flex items-center justify-center btn-haptic active:scale-90 transition-transform"
                        title="Sumar 1 unidad"
                      >
                        <Plus size={18} />
                      </button>

                      <button
                        onClick={() => handleStep(item, +5)}
                        disabled={isUpdating}
                        className="h-11 px-3 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center btn-haptic active:scale-90 transition-transform"
                        title="Sumar paquete (+5 unidades)"
                      >
                        +5
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
