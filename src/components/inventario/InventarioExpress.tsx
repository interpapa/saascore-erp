'use client';

import React, { useState, useMemo } from 'react';
import { Item } from '@/lib/api/items';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  Plus, 
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
  Laptop,
  CheckCircle2,
  XCircle,
  Warehouse
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useViewModeStore } from '@/store/useViewModeStore';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

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
  auditLogs = [],
  isLoading = false
}: InventarioExpressProps) {
  const router = useRouter();
  const { toggleViewMode } = useViewModeStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'products' | 'services' | 'critical' | 'audit'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categorías Únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Métricas rápidas de inventario
  const metrics = useMemo(() => {
    let physicalCount = 0;
    let serviceCount = 0;
    let totalStockUnits = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach((item) => {
      const isService = item.type === 'service';
      if (isService) {
        serviceCount++;
      } else {
        physicalCount++;
        const stock = item.stock_quantity ?? (item as any).stock ?? 0;
        const minStock = Number((item.metadata as any)?.min_stock ?? 5);
        totalStockUnits += stock;
        if (stock <= 0) {
          outOfStockCount++;
        } else if (stock <= minStock) {
          lowStockCount++;
        }
      }
    });

    const criticalCount = lowStockCount + outOfStockCount;
    return { physicalCount, serviceCount, totalStockUnits, lowStockCount, outOfStockCount, criticalCount };
  }, [items]);

  // Filtrado reactivo optimizado para móvil
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const isService = item.type === 'service';
      const stock = item.stock_quantity ?? (item as any).stock ?? 0;
      const minStock = Number((item.metadata as any)?.min_stock ?? 5);

      // Filtro por Tab
      if (activeTab === 'products' && isService) return false;
      if (activeTab === 'services' && !isService) return false;
      if (activeTab === 'critical') {
        if (isService) return false;
        if (stock > minStock) return false;
      }

      // Filtro de búsqueda
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = (item.sku || '').toLowerCase().includes(query);
        const matchesCat = (item.category || '').toLowerCase().includes(query);
        const matchesLoc = ((item.metadata as any)?.location || '').toLowerCase().includes(query);
        if (!matchesName && !matchesSku && !matchesCat && !matchesLoc) return false;
      }

      // Filtro de categoría
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [items, activeTab, searchTerm, selectedCategory]);

  return (
    <div className="w-full space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Cabecera Principal Adaptada a Pantalla Móvil */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-4 sm:p-5 text-white shadow-lg border border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 backdrop-blur-xs flex items-center justify-center border border-indigo-400/30 shrink-0 text-indigo-300">
              <Package size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">Inventario Móvil</h2>
                <span className="bg-indigo-500/30 text-indigo-200 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-indigo-400/30">
                  Touch
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">Gestión ágil de existencias, ajustes auditados y compras</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Conmutador a Vista Completa Desktop */}
            <button
              onClick={toggleViewMode}
              className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs p-2 sm:px-3 sm:py-2 rounded-xl border border-white/15 flex items-center gap-1.5 transition-all btn-haptic"
              title="Cambiar a vista de escritorio completa"
            >
              <Laptop size={15} />
              <span className="hidden sm:inline">Vista Completa</span>
            </button>

            {/* Nuevo Artículo */}
            <button
              onClick={onNewItem}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 btn-haptic"
            >
              <Plus size={15} />
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {/* Resumen Táctil de Métricas */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-center">
          <div 
            onClick={() => setActiveTab('products')}
            className={`rounded-2xl py-2 px-1 transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-slate-300 block truncate">Productos</span>
            <span className="text-sm sm:text-base font-black text-white">{metrics.physicalCount}</span>
          </div>

          <div className="bg-white/5 rounded-2xl py-2 px-1">
            <span className="text-[10px] uppercase font-bold text-slate-300 block truncate">Existencias</span>
            <span className="text-sm sm:text-base font-black text-indigo-200 font-mono">{metrics.totalStockUnits}</span>
          </div>

          <div 
            onClick={() => setActiveTab('critical')}
            className={`rounded-2xl py-2 px-1 transition-all cursor-pointer ${
              activeTab === 'critical' ? 'bg-amber-500/30 ring-1 ring-amber-400/50' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-amber-300 block truncate">Bajo Stock</span>
            <span className="text-sm sm:text-base font-black text-amber-200 font-mono">{metrics.lowStockCount}</span>
          </div>

          <div 
            onClick={() => setActiveTab('critical')}
            className={`rounded-2xl py-2 px-1 transition-all cursor-pointer ${
              activeTab === 'critical' ? 'bg-rose-500/30 ring-1 ring-rose-400/50' : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-[10px] uppercase font-bold text-rose-300 block truncate">Agotados</span>
            <span className="text-sm sm:text-base font-black text-rose-200 font-mono">{metrics.outOfStockCount}</span>
          </div>
        </div>
      </div>

      {/* Pestañas Táctiles Ergonómicas */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 btn-haptic ${
            activeTab === 'products'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-300'
          }`}
        >
          <Package size={14} />
          <span>Productos ({metrics.physicalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 btn-haptic ${
            activeTab === 'services'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-300'
          }`}
        >
          <Sparkles size={14} />
          <span>Servicios ({metrics.serviceCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('critical')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 btn-haptic ${
            activeTab === 'critical'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-card border border-border text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Críticos ({metrics.criticalCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 btn-haptic ${
            activeTab === 'audit'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'bg-card border border-border text-slate-600 dark:text-slate-300'
          }`}
        >
          <History size={14} />
          <span>Kardex / Historial</span>
        </button>
      </div>

      {/* Contenido si está en Pestaña Kardex */}
      {activeTab === 'audit' ? (
        <div className="bg-card border border-border rounded-3xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-sm font-black text-foreground">Bitácora de Kardex</h3>
              <p className="text-xs text-slate-500">Historial inmutable de movimientos y ajustes de existencias</p>
            </div>
            <button
              onClick={() => onOpenAdjustmentModal('')}
              className="bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 btn-haptic"
            >
              <PackagePlus size={14} />
              <span>Ajustar Stock</span>
            </button>
          </div>
          <AuditTrailSection logs={auditLogs as any} isLoading={isLoading} />
        </div>
      ) : (
        <>
          {/* Barra de Búsqueda y Filtro de Categoría */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, SKU, ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-card border border-border rounded-2xl pl-10 pr-9 py-2.5 text-xs font-medium text-foreground placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Botón de Ajuste Rápido Global */}
              <button
                onClick={() => onOpenAdjustmentModal('')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl shadow-xs flex items-center gap-1.5 shrink-0 btn-haptic cursor-pointer"
                title="Ajustar existencias con motivo y justificación"
              >
                <PackagePlus size={15} />
                <span className="hidden sm:inline">Ajuste de Stock</span>
              </button>
            </div>

            {/* Chips de Categorías */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold'
                      : 'bg-card border border-border text-slate-500 hover:text-foreground'
                  }`}
                >
                  Todas las categorías
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold shrink-0 transition-colors ${
                      selectedCategory === cat
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-extrabold'
                        : 'bg-card border border-border text-slate-500 hover:text-foreground'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Listado de Artículos Adaptado a Teléfono */}
          {filteredItems.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-3xl p-8 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
              <p className="text-sm font-bold text-foreground">No se encontraron artículos</p>
              <p className="text-xs text-slate-500">Prueba ajustando el término de búsqueda o cambia de filtro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isService = item.type === 'service';
                const stock = item.stock_quantity ?? (item as any).stock ?? 0;
                const minStock = Number((item.metadata as any)?.min_stock ?? 5);
                const isOut = !isService && stock <= 0;
                const isLow = !isService && stock > 0 && stock <= minStock;
                const price = Number(item.base_price || 0);
                const cost = Number(item.cost || 0);
                const uom = (item.metadata as any)?.unit_of_measure || (item.metadata as any)?.unit || 'uds';
                const location = (item.metadata as any)?.location;

                return (
                  <div
                    key={item.id}
                    className={`bg-card border rounded-3xl p-4 shadow-xs transition-all ${
                      isOut 
                        ? 'border-red-300 dark:border-red-900/50 bg-red-50/20 dark:bg-red-950/10' 
                        : isLow 
                        ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-border'
                    }`}
                  >
                    {/* Fila Superior: Categoría, SKU y Estado de Stock */}
                    <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.category}
                          </span>
                        )}
                        {item.sku && (
                          <span className="font-mono text-[10px] text-slate-400 bg-background px-1.5 py-0.5 rounded-md border border-border">
                            {item.sku}
                          </span>
                        )}
                      </div>

                      {/* Insignia de Stock */}
                      {!isService ? (
                        <div>
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/40">
                              Agotado (0 {uom})
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                              Bajo: {stock} {uom} (mín {minStock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                              Stock: {stock} {uom}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                          ⚡ Servicio
                        </span>
                      )}
                    </div>

                    {/* Nombre del Artículo */}
                    <h3 
                      onClick={() => onSelectItem ? onSelectItem(item) : (onEditItem ? onEditItem(item) : null)}
                      className="text-base font-black text-foreground hover:text-primary transition-colors cursor-pointer leading-tight mb-2"
                    >
                      {item.name}
                    </h3>

                    {/* Fila de Precios y Ubicación */}
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-border/60">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Precio</span>
                          <span className="font-black text-foreground text-sm font-mono">${price.toFixed(2)}</span>
                        </div>
                        {cost > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 block uppercase">Costo</span>
                            <span className="font-semibold text-slate-500 font-mono text-xs">${cost.toFixed(2)}</span>
                          </div>
                        )}
                      </div>

                      {location && (
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">Ubicación</span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 justify-end">
                            <MapPin size={11} className="text-slate-400" /> {location}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Barra de Acciones del Flujo Real (Táctil y Auditada) */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      {!isService ? (
                        <>
                          {/* Botón 1: Ajuste de Stock Auditado (Entrada/Salida con Motivo) */}
                          <button
                            type="button"
                            onClick={() => onOpenAdjustmentModal(item.id)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 btn-haptic cursor-pointer"
                            title="Ajustar stock con motivo e historial"
                          >
                            <PackagePlus size={14} />
                            <span>+ Stock / Ajustar</span>
                          </button>

                          {/* Botón 2: Emitir Orden de Compra formal al Proveedor */}
                          <button
                            type="button"
                            onClick={() => router.push(`/compras?item=${item.id}`)}
                            className="bg-orange-600/10 hover:bg-orange-600/20 text-orange-700 dark:text-orange-400 border border-orange-500/25 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 btn-haptic cursor-pointer"
                            title="Comprar al proveedor"
                          >
                            <ShoppingCart size={14} />
                            <span>Comprar</span>
                          </button>

                          {/* Botón 3: Ver Ficha Detallada / Editar */}
                          <button
                            type="button"
                            onClick={() => onSelectItem ? onSelectItem(item) : (onEditItem ? onEditItem(item) : null)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground font-bold text-xs p-2 rounded-xl border border-border flex items-center justify-center btn-haptic cursor-pointer"
                            title="Ver detalles o editar"
                          >
                            <Eye size={15} />
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onSelectItem ? onSelectItem(item) : (onEditItem ? onEditItem(item) : null)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground font-bold text-xs py-2 px-3 rounded-xl border border-border flex items-center gap-1.5 btn-haptic cursor-pointer"
                          >
                            <Eye size={14} />
                            <span>Ver / Editar Servicio</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
