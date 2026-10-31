'use client';

import React, { useState, useMemo } from 'react';
import { Item } from '@/lib/api/items';
import { 
  Package, 
  Search, 
  Plus, 
  ChevronRight,
  PackagePlus,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Tag,
  AlertTriangle,
  CheckCircle2, 
  XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface InventarioExpressProps {
  items: Item[];
  tenantId: string;
  onStockChange?: (item: Item, newStock: number) => Promise<void> | void;
  onOpenAdjustmentModal: (itemId: string) => void;
  onNewItem: () => void;
  onSelectItem?: (item: Item) => void;
  onEditItem?: (item: Item) => void;
  auditLogs?: unknown[];
  isLoading?: boolean;
}

export function InventarioExpress({
  items,
  tenantId,
  onStockChange,
  onOpenAdjustmentModal,
  onNewItem,
  onSelectItem,
  onEditItem,
  isLoading = false
}: InventarioExpressProps) {
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'services'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categorías Únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Contadores simples
  const { physicalCount, serviceCount, totalCount } = useMemo(() => {
    let physical = 0;
    let service = 0;
    items.forEach((i) => {
      if (i.type === 'service') service++;
      else physical++;
    });
    return { physicalCount: physical, serviceCount: service, totalCount: items.length };
  }, [items]);

  // Filtrado reactivo táctil
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isService = item.type === 'service';
      if (activeTab === 'products' && isService) return false;
      if (activeTab === 'services' && !isService) return false;

      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.name?.toLowerCase().includes(query);
        const matchesSku = (item.sku || '').toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }

      // Filtro de categoría
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [items, activeTab, searchTerm, selectedCategory]);

  return (
    <div className="w-full space-y-4 pb-24 animate-in fade-in duration-200">
      {/* 1. Header Móvil & Botón de Creación Rápida */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inventario & Catálogo
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {totalCount} ítems registrados en tu catálogo
          </p>
        </div>

        <button
          type="button"
          onClick={onNewItem}
          className="h-11 px-4 rounded-2xl bg-primary text-primary-foreground font-black text-xs flex items-center gap-2 shadow-md active:scale-95 transition-all shrink-0 btn-haptic"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nuevo</span>
        </button>
      </div>

      {/* 2. Pestañas Grandes Táctiles (Todos / Productos / Servicios) */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl gap-1.5 border border-border/60">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all text-center ${
            activeTab === 'all'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          Todos ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'products'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <Package size={14} /> Físicos ({physicalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'services'
              ? 'bg-white dark:bg-slate-700 shadow-sm text-fuchsia-600 dark:text-fuchsia-400'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <Sparkles size={14} /> Servicios ({serviceCount})
        </button>
      </div>

      {/* 3. Buscador Ergonómico & Filtro de Categorías */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código SKU o categoría..."
            className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-2xs"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3.5 text-xs text-slate-400 hover:text-foreground bg-slate-100 dark:bg-slate-800 rounded-full w-5 h-5 flex items-center justify-center font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Chips de Categorías */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black'
                  : 'bg-card border border-border text-slate-500 hover:text-foreground'
              }`}
            >
              Todas
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black'
                    : 'bg-card border border-border text-slate-500 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. Listado Ultra-Limpio y Táctil - Tocar cualquier producto abre directamente la Ficha */}
      {filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-2">
          <Package className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
          <p className="text-sm font-black text-foreground">No se encontraron artículos</p>
          <p className="text-xs text-slate-500">Prueba con otro término de búsqueda o categoría.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isService = item.type === 'service';
            const stock = Number(item.stock_quantity ?? (item as any).stock ?? (item as any).quantity ?? 0);
            const minStock = Number((item.metadata as any)?.min_stock ?? 5);
            const isOut = !isService && stock <= 0;
            const isLow = !isService && stock > 0 && stock <= minStock;
            const price = Number(item.base_price || 0);
            const itemImage = item.metadata?.image_url || (item as any).image_url;
            const uom = (item.metadata as any)?.unit_of_measure || 'uds';

            return (
              <div
                key={item.id}
                onClick={() => onEditItem ? onEditItem(item) : (onSelectItem ? onSelectItem(item) : null)}
                className={`bg-card border rounded-3xl p-4 shadow-xs flex flex-col gap-3 transition-all cursor-pointer hover:border-primary/50 active:scale-99 ${
                  isOut 
                    ? 'border-red-200 dark:border-red-900/40 bg-red-50/10' 
                    : isLow 
                    ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/10'
                    : 'border-border'
                }`}
              >
                {/* Fila Principal: Foto + Info + Precio */}
                <div className="flex items-center justify-between gap-3">
                  {/* Foto 60x60 */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-border/60 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {itemImage ? (
                      <img
                        src={itemImage}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const parent = (e.target as HTMLElement).parentElement;
                          if (parent) parent.innerHTML = '<div class="text-xl">📦</div>';
                        }}
                      />
                    ) : (
                      <div className="text-slate-400">
                        {isService ? <span className="text-2xl">✂️</span> : <Package size={26} />}
                      </div>
                    )}
                  </div>

                  {/* Nombre en Alto Contraste y SKU */}
                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base line-clamp-1 leading-snug">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500 flex-wrap">
                      <span className="font-bold text-slate-600 dark:text-slate-400">
                        {item.category || (isService ? 'Servicio' : 'General')}
                      </span>
                      {item.sku && (
                        <>
                          <span>•</span>
                          <span className="font-mono font-bold text-[11px] text-slate-400">
                            {item.sku}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Precio Grande */}
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
                      ${price.toFixed(2)}
                    </span>
                    {isService && (
                      <span className="block mt-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-center">
                        Servicio
                      </span>
                    )}
                  </div>
                </div>

                {/* Fila Inferior Limpia: Badge de Stock de Alto Contraste + Acceso a Ficha */}
                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  {!isService ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAdjustmentModal(item.id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black font-mono border transition-all btn-haptic active:scale-95 ${
                        isOut
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : isLow
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                      title="Toca para ajustar stock o existencias físicas"
                    >
                      {isOut ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                          Agotado (0 uds)
                        </>
                      ) : isLow ? (
                        <>
                          <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
                          Bajo Stock: {stock} {uom}
                        </>
                      ) : (
                        <>
                          <Package size={13} className="text-emerald-600 dark:text-emerald-400" />
                          Stock: {stock} {uom}
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">
                      Servicio sin inventario físico
                    </span>
                  )}

                  <div className="flex items-center gap-1 text-xs font-black text-primary hover:underline">
                    <span>Editar Ficha</span>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Botón Flotante Inferior (FAB +) para Crear Rápido */}
      <button
        type="button"
        onClick={onNewItem}
        className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center btn-haptic active:scale-90 transition-transform md:hidden"
        title="Crear nuevo producto o servicio"
      >
        <Plus size={26} strokeWidth={3} />
      </button>
    </div>
  );
}
