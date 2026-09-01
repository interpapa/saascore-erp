'use client';

import { useState, useEffect, useCallback } from 'react';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogDrawer } from '@/components/catalog/CatalogDrawer';
import { getItemsAction, createItemAction, updateItemAction, deleteItemAction } from '@/app/actions/items';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Item } from '@/lib/api/items';
import { QuickStockModal } from '@/components/ui/QuickStockModal';
import { Plus, Package, DollarSign, AlertTriangle, ShoppingCart, Activity, PackagePlus } from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { ViewToggle, useViewPreference } from '@/components/ui/ViewToggle';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CSVImportModal } from '@/components/catalog/CSVImportModal';
import { useRouter } from 'next/navigation';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';

type TabType = 'items' | 'audit';

export default function CatalogoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewMode, setViewMode] = useViewPreference('catalogo-view-mode', 'grid');
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const activeTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();
  const router = useRouter();

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      if (!activeTenant?.id) return;
      const res = await getItemsAction(activeTenant.id);
      if (res.success && res.items) {
        setItems(res.items as any);
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuditLogs = useCallback(async () => {
    if (!activeTenant?.id) return;
    try {
      setIsLoadingAudit(true);
      const res = await getAuditLogsAction(activeTenant.id, 'item', 40);
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de inventario:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    if (activeTenant) {
      fetchItems();
    }
  }, [activeTenant]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleSaveItem = async (data: any) => {
    if (!activeTenant) return;

    if (editingItem) {
      // MODO EDICIÓN
      try {
        const res = await updateItemAction(
          editingItem.id,
          {
            type: data.type,
            name: data.name,
            sku: data.sku,
            category: data.category,
            base_price: Number(data.base_price || 0),
            cost: Number(data.cost || 0),
            stock_quantity: Number(data.stock_quantity || 0),
            metadata: data.metadata,
          },
          activeTenant.id,
          actor
        );

        if (res.success) {
          toast({ variant: 'success', title: 'Producto Actualizado', description: `"${data.name}" se actualizó correctamente.` });
          setEditingItem(null);
          fetchItems();
        } else {
          toast({ variant: 'warning', title: 'Error al actualizar', description: res.error || 'No se pudieron guardar los cambios.' });
        }
      } catch (err: unknown) {
        toast({ variant: 'error', title: 'Error de red', description: (err as Error).message });
      }
    } else {
      // MODO CREACIÓN
      const tempId = `temp_${Date.now()}`;
      const newItem: unknown = {
        id: tempId,
        type: data.type,
        name: data.name,
        sku: data.sku || 'SKU-PENDIENTE',
        category: data.category || 'General',
        base_price: Number(data.base_price || 0),
        cost: Number(data.cost || 0),
        stock_quantity: data.type === 'product' ? Number(data.stock_quantity || 0) : 0,
        metadata: data.metadata || {},
        is_active: true,
      };

      setItems((prev) => [newItem, ...prev]);

      try {
        const res = await createItemAction(
          {
            type: data.type,
            name: data.name,
            sku: data.sku,
            category: data.category,
            base_price: Number(data.base_price || 0),
            cost: Number(data.cost || 0),
            stock_quantity: Number(data.stock_quantity || 0),
            metadata: data.metadata,
          },
          activeTenant.id,
          actor
        );

        if (!res.success) {
          toast({ variant: 'warning', title: 'Guardado Local', description: 'El ítem se agregó en pantalla. Configura Supabase para sincronizar.' });
        } else {
          toast({ variant: 'success', title: 'Producto Creado', description: `"${data.name}" se guardó en el catálogo.` });
          fetchItems();
        }
      } catch (err: unknown) {
        toast({ variant: 'info', title: 'Modo Offline', description: 'Ítem guardado localmente en esta sesión.' });
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!activeTenant) return;
    try {
      const res = await deleteItemAction(id, activeTenant.id, actor);
      if (res.success) {
        toast({ variant: 'success', title: 'Elemento Eliminado', description: 'El producto ha sido borrado del catálogo.' });
        setSelectedItem(null);
        fetchItems();
      } else {
        toast({ variant: 'warning', title: 'Error al eliminar', description: res.error || 'No se pudo eliminar el ítem.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  // Estadísticas
  const totalItems = items.length;
  const products = items.filter((i) => i.type === 'product');
  const totalValue = products.reduce((acc, p) => acc + (p.base_price * (p.stock_quantity || 0)), 0);
  const lowStockCount = products.filter((p) => (p.stock_quantity || 0) <= 5).length;

  const tabs = [
    { id: 'items', label: 'Repuestos & Servicios', icon: Package },
    { id: 'audit', label: 'Auditoría de Inventario', icon: Activity },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Estandarizada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight font-sans">Catálogo de Productos</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5 font-sans">Gestión de inventario, repuestos y servicios</p>
        </div>
        {activeTab === 'items' && (
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <ViewToggle storageKey="catalogo-view-mode" currentView={viewMode} onViewChange={setViewMode} />
            <button
              onClick={() => setIsStockModalOpen(true)}
              className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white btn-haptic flex items-center gap-2"
            >
              <PackagePlus size={18} />
              Reponer Stock
            </button>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="btn-base bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 btn-haptic flex items-center gap-2"
            >
              Importar Excel / CSV
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-base btn-primary btn-haptic flex items-center gap-2"
            >
              <Plus size={18} />
              Nuevo Ítem
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {activeTab === 'items' ? (
        <>
          {/* KPI bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 animate-in fade-in duration-300">
              <div className="w-10 h-10 rounded-xl bg-[rgba(27,95,168,0.15)] flex items-center justify-center text-primary">
                <Package size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Ítems</p>
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 animate-in fade-in duration-300 delay-75">
              <div className="w-10 h-10 rounded-xl bg-[rgba(22,163,74,0.15)] flex items-center justify-center text-success">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Valor Estimado en Venta</p>
                <p className="text-2xl font-bold text-foreground">${totalValue.toLocaleString('es', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4 animate-in fade-in duration-300 delay-150">
              <div className="w-10 h-10 rounded-xl bg-[rgba(217,119,6,0.15)] flex items-center justify-center text-warning">
                <AlertTriangle size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Stock Bajo</p>
                <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
              </div>
            </div>
          </div>

          {isLoading ? (
            <SkeletonCardGrid count={6} columns={3} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Catálogo vacío"
              description="Comienza agregando productos o servicios que ofrezcas en tu negocio."
              actionLabel="Agregar primer ítem"
              onAction={() => setIsModalOpen(true)}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const isLowStock = item.type === 'product' && (item.stock_quantity || 0) <= 5;
                const isOut = item.type === 'product' && (item.stock_quantity || 0) === 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden animate-in fade-in duration-300"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category || 'General'}
                        </span>
                        <span
                          className={`badge ${
                            item.type === 'service'
                              ? 'badge-info'
                              : isOut
                              ? 'badge-danger'
                              : isLowStock
                              ? 'badge-warning'
                              : 'badge-success'
                          }`}
                        >
                          {item.type === 'service'
                            ? 'Servicio'
                            : isOut
                            ? 'Agotado'
                            : isLowStock
                            ? 'Stock Bajo'
                            : 'En Stock'}
                        </span>
                      </div>
                      <h3 className="text-h3 font-bold text-foreground mb-1 group-hover:text-primary transition-colors font-sans">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">{item.sku || 'Sin SKU'}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider">Precio</p>
                        <p className="text-lg font-bold text-foreground">
                          ${(item.base_price || 0).toLocaleString('es', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      {item.type === 'product' && (
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Inventario</p>
                          <p className={`text-sm font-semibold ${isLowStock ? 'text-warning' : 'text-foreground'}`}>
                            {item.stock_quantity} disp.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Smart Action en stock bajo/agotado */}
                    {isLowStock && (
                      <div className="absolute inset-x-0 bottom-0 bg-slate-900/95 dark:bg-slate-955/95 p-3 flex justify-center items-center translate-y-full group-hover:translate-y-0 transition-transform duration-200" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/compras?item=${item.id}`)}
                          className="btn-base btn-primary btn-sm flex items-center gap-1.5"
                        >
                          Reponer Inventario
                          <ShoppingCart size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-border bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500">
                    <th className="p-4">SKU</th>
                    <th className="p-4">Nombre</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Precio</th>
                    <th className="p-4 text-right">Inventario</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isLowStock = item.type === 'product' && (item.stock_quantity || 0) <= 5;
                    const isOut = item.type === 'product' && (item.stock_quantity || 0) === 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="border-b border-border/50 last:border-0 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 cursor-pointer transition-colors text-sm"
                      >
                        <td className="p-4 font-mono text-xs">{item.sku || '-'}</td>
                        <td className="p-4 font-semibold text-foreground">{item.name}</td>
                        <td className="p-4 text-slate-500">{item.category || 'General'}</td>
                        <td className="p-4 capitalize">{item.type === 'product' ? 'Producto' : 'Servicio'}</td>
                        <td className="p-4 text-right font-bold text-foreground">
                          ${(item.base_price || 0).toLocaleString('es', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-4 text-right font-medium">
                          {item.type === 'product' ? `${item.stock_quantity} uds` : '-'}
                        </td>
                        <td className="p-4">
                          <span
                            className={`badge ${
                              item.type === 'service'
                                ? 'badge-info'
                                : isOut
                                ? 'badge-danger'
                                : isLowStock
                                ? 'badge-warning'
                                : 'badge-success'
                            }`}
                          >
                            {item.type === 'service'
                              ? 'Servicio'
                              : isOut
                              ? 'Agotado'
                              : isLowStock
                              ? 'Stock Bajo'
                              : 'En Stock'}
                          </span>
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {isLowStock && (
                            <button
                              onClick={() => router.push(`/compras?item=${item.id}`)}
                              className="btn-base btn-ghost btn-sm text-warning hover:bg-warning-50"
                            >
                              Reponer
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-h3 font-bold text-foreground font-sans">Historial de Cambios de Inventario</h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">Bitácora de auditoría para productos, precios y repuestos creados o modificados.</p>
          </div>
          <AuditTrailSection logs={auditLogs} isLoading={isLoadingAudit} />
        </div>
      )}

      <CatalogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editingItem}
      />

      <CatalogDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onEdit={(item) => {
          setSelectedItem(null);
          setEditingItem(item);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteItem}
      />

      <QuickStockModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        onSuccess={fetchItems}
        items={items}
      />

      <CSVImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={fetchItems}
      />
    </div>
  );
}
