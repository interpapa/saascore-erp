'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction } from '@/app/actions/entities';
import { getDocumentsAction } from '@/app/actions/documents';
import { getItemsAction } from '@/app/actions/items';
import { Entity } from '@/lib/api/entities';
import { ShoppingCart, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { SupplierTab } from '@/components/compras/SupplierTab';
import { PurchaseOrderTab } from '@/components/compras/PurchaseOrderTab';
import { MatchValidationTab } from '@/components/compras/MatchValidationTab';
import { SkeletonTable } from '@/components/ui/SkeletonTable';

export default function ComprasPage() {
  const currentTenant = useTenantResolver();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos' | 'match'>('suppliers');

  // Data State
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoading(true);
      const [suppliersRes, posRes, itemsRes] = await Promise.all([
        getEntitiesAction(currentTenant.id, 'supplier', 50),
        getDocumentsAction(currentTenant.id, 'purchase_order', 50),
        getItemsAction(currentTenant.id, undefined, 50),
      ]);

      if (suppliersRes?.success) setSuppliers(suppliersRes.entities || []);
      if (posRes?.success) setPurchaseOrders(posRes.documents || []);
      if (itemsRes?.success) setCatalogItems(itemsRes.items || []);
    } catch (err) {
      console.error('Error cargando compras:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    let isSubscribed = true;
    const timer = setTimeout(() => {
      if (isSubscribed) setIsLoading(false);
    }, 2500);

    loadData();

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [loadData]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20">
              <ShoppingCart size={22} />
            </div>
            Compras y Proveedores (AP)
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Gestión de abastecimiento, órdenes de compra e inspección 3-Way Match
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="bg-card border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 btn-haptic self-start sm:self-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'suppliers', label: 'Proveedores', icon: Users, count: suppliers.length },
          { id: 'pos', label: 'Órdenes de Compra (PO)', icon: ShoppingCart, count: purchaseOrders.length },
          { id: 'match', label: 'Validación 3-Way Match', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap btn-haptic ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-slate-600 dark:text-slate-400 hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido Modular de Pestañas */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-2xl p-6">
          <SkeletonTable rows={5} columns={4} />
        </div>
      ) : (
        <>
          {activeTab === 'suppliers' && (
            <SupplierTab
              suppliers={suppliers}
              tenantId={currentTenant.id}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'pos' && (
            <PurchaseOrderTab
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              catalogItems={catalogItems}
              tenantId={currentTenant.id}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'match' && (
            <MatchValidationTab
              purchaseOrders={purchaseOrders}
              tenantId={currentTenant.id}
            />
          )}
        </>
      )}

    </div>
  );
}
