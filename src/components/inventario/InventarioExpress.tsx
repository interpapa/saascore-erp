'use client';

import React, { useState, useMemo } from 'react';
import { Item } from '@/lib/api/items';
import { 
  Package, 
  Search, 
  Plus, 
  Minus,
  ShoppingCart,
  PackagePlus,
  Eye,
  SlidersHorizontal,
  Layers,
  Sparkles,
  ArrowUpDown,
  History,
  Tag,
  MapPin,
  CheckCircle2, 
  XCircle,
  Warehouse
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
      {/* 1. Cabecera Móvil Limpia y Ergonómica */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h2 className="text-xl font-black text-foreground tracking-tight">Catálogo de Artículos</h2>
          <p className="text-xs text-slate-500 font-medium">
            {totalCount} productos y servicios en sistema
          </p>
        </div>

        <button
          type="button"
          onClick={onNewItem}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-3.5 py-2.5 rounded-2xl shadow-xs flex items-center gap-1.5 btn-haptic shrink-0"
        >
          <Plus size={16} />
          <span>Crear</span>
        </button>
      </div>

      {/* 2. Pestañas Limpias Táctiles: [ Todos ] [ Productos ] [ Servicios ] */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`py-2 px-1 rounded-xl text-xs font-black transition-all text-center btn-haptic truncate ${
            activeTab === 'all'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          Todos ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`py-2 px-1 rounded-xl text-xs font-black transition-all text-center btn-haptic truncate ${
            activeTab === 'products'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          📦 Productos ({physicalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={`py-2 px-1 rounded-xl text-xs font-black transition-all text-center btn-haptic truncate ${
            activeTab === 'services'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          ✂️ Servicios ({serviceCount})
        </button>
      </div>

      {/* 3. Buscador Amplio y Chips de Categorías */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, SKU o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-9 py-2.5 text-xs font-bold text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Chips de Categorías Deslizables */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black'
                  : 'bg-card border border-border text-slate-500 hover:text-foreground'
              }`}
            >
              Todas ({items.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-colors ${
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

      {/* 4. Listado Compacto Ultra-Ergonómico con Fotos Grandes y Alto Contraste */}
      {filteredItems.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-2">
          <Package className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
          <p className="text-sm font-black text-foreground">No se encontraron artículos</p>
          <p className="text-xs text-slate-500">Prueba con otro término de búsqueda o categoría.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => {
            const isService = item.type === 'service';
            const stock = Number(item.stock_quantity ?? (item as any).stock ?? (item as any).quantity ?? 0);
            const minStock = Number((item.metadata as any)?.min_stock ?? 5);
            const isOut = !isService && stock <= 0;
            const isLow = !isService && stock > 0 && stock <= minStock;
            const price = Number(item.base_price || 0);
            const itemImage = item.metadata?.image_url || (item as any).image_url;

            return (
              <div
                key={item.id}
                onClick={() => onSelectItem ? onSelectItem(item) : (onEditItem ? onEditItem(item) : null)}
                className={`bg-card border rounded-2xl p-3 shadow-xs flex items-center justify-between gap-3 transition-all cursor-pointer hover:border-primary/50 active:scale-99 ${
                  isOut 
                    ? 'border-red-200 dark:border-red-900/40 bg-red-50/10' 
                    : isLow 
                    ? 'border-amber-200 dark:border-amber-900/40 bg-amber-50/10'
                    : 'border-border'
                }`}
              >
                {/* Columna Izquierda: Imagen / Foto 56x56 */}
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-border/60 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
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
                      {isService ? <span className="text-xl">✂️</span> : <Package size={22} />}
                    </div>
                  )}
                </div>

                {/* Columna Centro: Nombre en Alto Contraste y SKU */}
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm line-clamp-1 leading-snug">
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

                {/* Columna Derecha: Stock con Stepper Rápido Táctil y Precio Prominente */}
                <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white leading-tight">
                    ${price.toFixed(2)}
                  </span>

                  {!isService ? (
                    <div className="flex items-center gap-1">
                      {onStockChange ? (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-border shadow-2xs"
                        >
                          <button
                            type="button"
                            disabled={stock <= 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStockChange(item, Math.max(0, stock - 1));
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-card disabled:opacity-30 disabled:pointer-events-none active:scale-90 transition-transform btn-haptic"
                            title="Restar 1 unidad"
                          >
                            <Minus size={11} strokeWidth={3} />
                          </button>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenAdjustmentModal(item.id);
                            }}
                            className={`px-1.5 text-[11px] font-black font-mono cursor-pointer hover:underline ${
                              isOut
                                ? 'text-rose-600 dark:text-rose-400'
                                : isLow
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                            title="Toca para ajustar existencias con motivo"
                          >
                            {stock}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onStockChange(item, stock + 1);
                            }}
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-card active:scale-90 transition-transform btn-haptic"
                            title="Sumar 1 unidad"
                          >
                            <Plus size={11} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}
                        >
                          {isOut ? 'Agotado' : `${stock} disp.`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      Servicio
                    </span>
                  )}
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
