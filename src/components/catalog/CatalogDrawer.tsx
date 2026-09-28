'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, DollarSign, Archive, Check, AlertTriangle, TrendingUp, MapPin, Building2, ShoppingCart, Edit3, Trash2 } from 'lucide-react';
import { Item } from '@/lib/api/items';
import { useRouter } from 'next/navigation';

interface CatalogDrawerProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: Item) => void;
  onDelete?: (id: string) => void;
  onQuickStock?: (item: Item) => void;
}

export function CatalogDrawer({ item, isOpen, onClose, onEdit, onDelete, onQuickStock }: CatalogDrawerProps) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) {
      setShowConfirmDelete(false);
    }
  }, [isOpen]);

  if (!item) return null;

  const isProduct = item.type === 'product';
  const stockQty = item.stock_quantity ?? (item as any).stock ?? 0;
  const cost = Number(item.cost || 0);
  const price = Number(item.base_price || 0);
  const minStock = Number(item.metadata?.min_stock || 5);
  
  const lowStock = isProduct && stockQty <= minStock && stockQty > 0;
  const outOfStock = isProduct && stockQty <= 0;

  const profitUnit = Math.max(0, price - cost);
  const marginPct = price > 0 ? ((profitUnit / price) * 100).toFixed(1) : '0';
  const totalValuationCost = (cost * stockQty).toFixed(2);
  const totalValuationSale = (price * stockQty).toFixed(2);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-xs z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-3 bottom-3 right-3 w-[calc(100%-1.5rem)] sm:w-full max-w-lg bg-card border border-border rounded-[28px] shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-[110%]'}`}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-background/80 hover:bg-background text-foreground rounded-full border border-border transition-colors btn-haptic z-50"
        >
          <X size={18} />
        </button>

        <div className="flex-1 overflow-y-auto relative pb-6">
          {/* Banner de Cabecera */}
          <div className={`h-28 w-full relative ${isProduct ? 'bg-gradient-to-r from-primary/20 via-blue-500/15 to-teal-500/20' : 'bg-gradient-to-r from-fuchsia-500/20 via-pink-500/15 to-rose-500/20'}`} />

          {/* Icono & Título Flotante */}
          <div className="flex flex-col items-center -mt-10 mb-5 px-6 relative z-10">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-card ${isProduct ? 'bg-primary' : 'bg-fuchsia-600'}`}>
              {isProduct ? <Package size={36} /> : <Check size={36} />}
            </div>
            <div className="text-center mt-3">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {item.category || 'General'}
              </span>
              <h3 className="text-xl font-black text-foreground mt-1 leading-snug">{item.name}</h3>
              <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-mono text-slate-500 bg-background px-2.5 py-0.5 rounded-lg border border-border">
                  SKU: {item.sku || 'Sin código'}
                </span>
                {item.metadata?.brand && (
                  <span className="text-xs font-semibold text-slate-500 bg-background px-2.5 py-0.5 rounded-lg border border-border">
                    {item.metadata.brand}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 space-y-6">
            {/* Estado del Inventario & Alerta */}
            {isProduct && (
              <div className={`p-4 rounded-2xl flex items-center justify-between border ${outOfStock ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400' : lowStock ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${outOfStock ? 'bg-red-500/20' : lowStock ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                    {outOfStock ? <AlertTriangle size={20} /> : <Archive size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      {outOfStock ? 'Agotado' : lowStock ? 'Stock Bajo (Bajo mínimo)' : 'Existencias Normales'}
                    </h4>
                    <p className="text-xs font-medium opacity-90">
                      {stockQty} unidades físicas disponibles
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onQuickStock && onQuickStock(item)}
                  className="btn-base btn-sm bg-background border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground font-bold text-xs shadow-xs"
                >
                  Ajustar
                </button>
              </div>
            )}

            {/* Análisis Financiero y de Costeo Odoo */}
            <div className="bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <DollarSign size={15} className="text-primary" />
                  Estructura de Precios & Costos
                </h4>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  {marginPct}% margen
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background p-3 rounded-xl border border-border">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Costo Adquisición</p>
                  <p className="text-lg font-black text-foreground">${cost.toFixed(2)}</p>
                  <span className="text-[10px] text-slate-400">Base de compra</span>
                </div>
                <div className="bg-background p-3 rounded-xl border border-border">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Precio de Venta</p>
                  <p className="text-lg font-black text-primary">${price.toFixed(2)}</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">+${profitUnit.toFixed(2)} ganancia/ud</span>
                </div>
              </div>

              {isProduct && (
                <div className="pt-2 border-t border-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Valuación al Costo (Activo):</span>
                    <span className="font-mono font-black text-foreground text-sm">${totalValuationCost}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Valuación en Venta:</span>
                    <span className="font-mono font-black text-foreground text-sm">${totalValuationSale}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Logística de Bodega y Almacén */}
            {isProduct && (
              <div className="bg-slate-50/80 dark:bg-slate-800/40 p-5 rounded-2xl border border-border space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <MapPin size={15} className="text-primary" />
                  Almacén & Reglas de Reorden
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Ubicación física:</span>
                    <span className="font-bold text-foreground">{item.metadata?.location || 'Sin asignar'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Unidad de Medida:</span>
                    <span className="font-bold text-foreground capitalize">{item.metadata?.unit_of_measure || 'Unidad'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Stock Mínimo (Alerta):</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{minStock} uds</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-bold">Proveedor Habitual:</span>
                    <span className="font-bold text-foreground truncate block">{item.metadata?.preferred_supplier_name || 'No especificado'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones Rápidas Odoo-Flow */}
            <div className="space-y-2.5 pt-2">
              {isProduct && (
                <button
                  onClick={() => router.push(`/compras?item=${item.id}`)}
                  className="w-full btn-base bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={15} />
                  Emitir Orden de Compra para Reponer
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit && onEdit(item)}
                  className="flex-1 btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-bold text-xs py-2.5 rounded-xl border border-border flex items-center justify-center gap-2"
                >
                  <Edit3 size={15} />
                  Editar Ficha
                </button>

                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="btn-base bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold text-xs py-2.5 px-4 rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={15} />
                  Eliminar
                </button>
              </div>

              {showConfirmDelete && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                  <p className="text-xs text-red-600 dark:text-red-400 font-bold text-center">
                    ¿Estás seguro de que deseas eliminar &quot;{item.name}&quot;? Esta acción no se puede deshacer.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDelete && onDelete(item.id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl text-xs font-black transition-all btn-haptic flex items-center justify-center"
                    >
                      Sí, Eliminar
                    </button>
                    <button
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground py-2 rounded-xl text-xs font-bold transition-all btn-haptic flex items-center justify-center"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
