'use client';

import { useState, useEffect, useCallback } from 'react';
import { getEntitiesAction } from '@/app/actions/entities';
import { getDocumentsAction } from '@/app/actions/documents';
import { getItemsAction } from '@/app/actions/items';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Entity } from '@/lib/api/entities';
import { ShoppingCart, Users, ShieldCheck, RefreshCw, Activity } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { SupplierTab } from '@/components/compras/SupplierTab';
import { PurchaseOrderTab } from '@/components/compras/PurchaseOrderTab';
import { MatchValidationTab } from '@/components/compras/MatchValidationTab';
import { SkeletonTable } from '@/components/ui/SkeletonTable';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

type TabType = 'suppliers' | 'pos' | 'match' | 'audit';

export default function ComprasPage() {
  const currentTenant = useTenantResolver();
  const [activeTab, setActiveTab] = useState<TabType>('suppliers');

  // Data State
  const [suppliers, setSuppliers] = useState<Entity[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

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

  const loadAuditLogs = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      setIsLoadingAudit(true);
      // Filtrar logs de compras (creación de POs, proveedores, etc)
      const res = await getAuditLogsAction(currentTenant.id, 'document', 40);
      if (res.success) {
        // Filtrar del lado del cliente por si hay otras entidades,
        // o mostrar todo el flujo de documentos de compras
        const purchaseLogs = res.logs.filter(
          (l: any) => l.action.includes('invoice') || l.action.includes('payment') || l.action.includes('entity')
        );
        setAuditLogs(purchaseLogs.length > 0 ? purchaseLogs : res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de compras:', err);
    } finally {
      setIsLoadingAudit(false);
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

  // Cargar logs al cambiar a la pestaña de auditoría
  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const tabs = [
    { id: 'suppliers', label: 'Proveedores', icon: Users, count: suppliers.length },
    { id: 'pos', label: 'Órdenes de Compra (PO)', icon: ShoppingCart, count: purchaseOrders.length },
    { id: 'match', label: 'Validación 3-Way Match', icon: ShieldCheck },
    { id: 'audit', label: 'Historial de Auditoría', icon: Activity },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-300 relative z-10">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3 font-sans">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center border border-orange-500/20 shrink-0">
              <ShoppingCart size={22} />
            </div>
            Compras y Proveedores (AP)
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1 font-sans">
            Gestión de abastecimiento, órdenes de compra e inspección 3-Way Match
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="btn-base btn-secondary btn-sm flex items-center gap-2"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Actualizar Datos
        </button>
      </div>

      {/* Tabs de Navegación Stripe-Style */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

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
              tenantId={currentTenant?.id || ''}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'pos' && (
            <PurchaseOrderTab
              purchaseOrders={purchaseOrders}
              suppliers={suppliers}
              catalogItems={catalogItems}
              tenantId={currentTenant?.id || ''}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'match' && (
            <MatchValidationTab
              purchaseOrders={purchaseOrders}
              tenantId={currentTenant?.id || ''}
            />
          )}

          {activeTab === 'audit' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="mb-4">
                <h3 className="text-h3 font-bold text-foreground font-sans">Bitácora de Eventos de Compras</h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">Historial cronológico de facturas, pagos y órdenes del Tenant.</p>
              </div>
              <AuditTrailSection logs={auditLogs} isLoading={isLoadingAudit} />
            </div>
          )}
        </>
      )}

    </div>
  );
}
