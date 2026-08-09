import React from 'react';
import { X, Package, Tag, DollarSign, Archive, Check, TrendingUp, AlertTriangle } from 'lucide-react';
import { Item } from '@/lib/api/items';

interface CatalogDrawerProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CatalogDrawer({ item, isOpen, onClose }: CatalogDrawerProps) {
  if (!item) return null;

  const isProduct = item.type === 'product';
  const margin = item.base_price - item.cost;
  const marginPercent = item.base_price > 0 ? (margin / item.base_price) * 100 : 0;
  
  const lowStock = isProduct && item.stock_quantity <= 5 && item.stock_quantity > 0;
  const outOfStock = isProduct && item.stock_quantity <= 0;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer (Floating Sheet) */}
      <div 
        className={`fixed top-4 bottom-4 right-4 w-[calc(100%-2rem)] sm:w-full max-w-md bg-white/85 dark:bg-slate-900/85 backdrop-blur-3xl rounded-[32px] shadow-2xl border border-slate-200 dark:border-white/10 z-50 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-[120%]'}`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-foreground rounded-full backdrop-blur-md transition-colors btn-haptic z-50"
        >
          <X size={20} />
        </button>

        <div className="flex-1 overflow-y-auto relative pb-8">
          {/* Banner Cover */}
          <div className={`h-32 w-full relative ${isProduct ? 'bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-cyan-500/20' : 'bg-gradient-to-r from-fuchsia-500/20 via-pink-500/20 to-rose-500/20'}`}></div>

          {/* Cabecera Flotante */}
          <div className="flex flex-col items-center -mt-12 mb-6 px-6 relative z-10">
            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center text-white shadow-xl border-4 border-white dark:border-slate-900 text-4xl rotate-3 hover:rotate-0 transition-transform duration-300 ${isProduct ? 'bg-gradient-to-br from-indigo-500 to-blue-600' : 'bg-gradient-to-br from-fuchsia-500 to-rose-600'}`}>
              {isProduct ? <Package size={40} /> : <Check size={40} />}
            </div>
            <div className="text-center mt-4">
              <h3 className="text-2xl font-black text-foreground leading-tight tracking-tight">{item.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-2">
                <p className="text-slate-500 font-medium text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">
                  SKU: {item.sku || 'N/A'}
                </p>
                <p className="text-slate-500 font-medium text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full inline-block">
                  {item.category || 'Sin Categoría'}
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 space-y-8">
            {/* Estado del Inventario */}
            {isProduct && (
              <div className={`p-4 rounded-2xl flex items-center gap-4 ${outOfStock ? 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20' : lowStock ? 'bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'}`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${outOfStock ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' : lowStock ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                  {outOfStock ? <AlertTriangle size={24} /> : <Archive size={24} />}
                </div>
                <div>
                  <h4 className={`font-bold ${outOfStock ? 'text-red-700 dark:text-red-400' : lowStock ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                    {outOfStock ? 'Agotado' : lowStock ? 'Stock Bajo' : 'En Stock'}
                  </h4>
                  <p className="text-sm opacity-80 text-foreground font-medium">
                    {item.stock_quantity} unidades disponibles
                  </p>
                </div>
              </div>
            )}

            {/* Precios y Finanzas */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[24px] space-y-6">
              <h4 className="font-bold text-foreground flex items-center gap-2">
                <DollarSign size={18} className="text-indigo-500" />
                Análisis Financiero
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm">Precio de Venta</p>
                  <p className="text-2xl font-black text-foreground">${Number(item.base_price).toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 text-sm">Costo Interno</p>
                  <p className="text-2xl font-black text-slate-400">${Number(item.cost).toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-slate-500 text-sm">Margen de Ganancia</p>
                  <span className="text-emerald-500 font-bold flex items-center gap-1 text-sm">
                    <TrendingUp size={14} />
                    {marginPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min(Math.max(marginPercent, 0), 100)}%` }}
                  />
                </div>
                <p className="text-right text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                  +${margin.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Metadatos Dinámicos */}
            {Object.keys(item.metadata || {}).length > 0 && (
              <div>
                <h4 className="font-bold text-foreground mb-4">Información Adicional</h4>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 overflow-x-auto">
                  <pre className="text-xs text-slate-500">
                    {JSON.stringify(item.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
