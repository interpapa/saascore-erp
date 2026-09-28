'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogDrawer } from '@/components/catalog/CatalogDrawer';
import { getItemsAction, createItemAction, updateItemAction, deleteItemAction } from '@/app/actions/items';
import { getAuditLogsAction } from '@/app/actions/audit';
import { Item } from '@/lib/api/items';
import { QuickStockModal } from '@/components/ui/QuickStockModal';
import { 
  Plus, 
  Package, 
  DollarSign, 
  AlertTriangle, 
  ShoppingCart, 
  Activity, 
  PackagePlus, 
  Search, 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  Warehouse, 
  CheckCircle2, 
  XCircle,
  Tag,
  MapPin,
  Barcode
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';
import { ViewToggle, useViewPreference } from '@/components/ui/ViewToggle';
import { SkeletonCardGrid } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { CSVImportModal } from '@/components/catalog/CSVImportModal';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter } from 'next/navigation';
import { UnderlineTabs } from '@/components/ui/Tabs';
import { AuditTrailSection } from '@/components/ui/AuditTrailSection';
import { exportToCSV } from '@/lib/core/exportToCSV';

type TabType = 'items' | 'services' | 'reorder' | 'audit';

export default function InventarioPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockModalItemId, setStockModalItemId] = useState<string>('');
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [viewMode, setViewMode] = useViewPreference('inventario-view-mode', 'grid');
  const [activeTab, setActiveTab] = useState<TabType>('items');
  const [auditLogs, setAuditLogs] = useState<unknown[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Filtros y Búsqueda en Vivo
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  const activeTenant = useTenantResolver();
  const session = useERPStore(s => s.session);
  const { toast } = useToast();
  const router = useRouter();
  const actor = useActionActor();

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!activeTenant?.id || !actor) return;
      // Ampliado a 250 items para soportar inventarios empresariales
      const res = await getItemsAction(activeTenant.id, undefined, 250, actor);
      if (res.success && res.items) {
        setItems(res.items as any);
      }
    } catch (error) {
      console.error('Error cargando inventario:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTenant?.id, actor]);

  const loadAuditLogs = useCallback(async () => {
    if (!activeTenant?.id || !actor) return;
    try {
      setIsLoadingAudit(true);
      const res = await getAuditLogsAction(activeTenant.id, 'item', 60, actor);
      if (res.success) {
        setAuditLogs(res.logs);
      }
    } catch (err) {
      console.error('Error cargando auditoría de inventario:', err);
    } finally {
      setIsLoadingAudit(false);
    }
  }, [activeTenant?.id, actor]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  const handleSaveItem = async (data: any) => {
    const targetTenantId = activeTenant?.id || session?.tenantId;
    if (!targetTenantId) {
      toast({
        variant: 'warning',
        title: 'Empresa no identificada',
        description: 'No se detectó la empresa activa. Por favor selecciona tu empresa en la cabecera.',
      });
      return;
    }

    if (!actor) {
      toast({
        variant: 'warning',
        title: 'Sesión requerida',
        description: 'Por favor inicia sesión nuevamente para guardar cambios.',
      });
      return;
    }

    if (editingItem) {
      try {
        const res = await updateItemAction(
          editingItem.id,
          {
            type: data.type,
            name: data.name,
            sku: data.sku,
            category: data.category,
            description: data.description,
            base_price: Number(data.base_price || 0),
            cost: Number(data.cost || 0),
            stock_quantity: Number(data.stock_quantity || 0),
            metadata: data.metadata,
          },
          targetTenantId,
          actor
        );

        if (res.success) {
          toast({ variant: 'success', title: 'Artículo Actualizado', description: `"${data.name}" se actualizó correctamente en inventario.` });
          setEditingItem(null);
          fetchItems();
        } else {
          toast({ variant: 'warning', title: 'Error al actualizar', description: res.error || 'No se pudieron guardar los cambios.' });
        }
      } catch (err: unknown) {
        toast({ variant: 'error', title: 'Error de red', description: (err as Error).message });
      }
    } else {
      const tempId = `temp_${Date.now()}`;
      const newItem = {
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
      } as Item;

      setItems((prev) => [newItem, ...prev]);

      try {
        const res = await createItemAction(
          {
            type: data.type,
            name: data.name,
            sku: data.sku,
            category: data.category,
            description: data.description,
            base_price: Number(data.base_price || 0),
            cost: Number(data.cost || 0),
            stock_quantity: Number(data.stock_quantity || 0),
            metadata: data.metadata,
          },
          targetTenantId,
          actor
        );

        if (!res.success) {
          toast({ variant: 'warning', title: 'Aviso', description: res.error || 'No se pudo sincronizar con la nube.' });
        } else {
          toast({ variant: 'success', title: data.type === 'service' ? 'Servicio Registrado' : 'Artículo Creado', description: `"${data.name}" se guardó en el catálogo.` });
          fetchItems();
        }
      } catch (err: unknown) {
        toast({ variant: 'info', title: 'Modo Offline', description: 'Artículo guardado en esta sesión.' });
      }
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!activeTenant || !actor) return;
    try {
      const res = await deleteItemAction(id, activeTenant.id, actor);
      if (res.success) {
        toast({ variant: 'success', title: 'Artículo Eliminado', description: 'El artículo ha sido retirado del inventario.' });
        setSelectedItem(null);
        fetchItems();
      } else {
        toast({ variant: 'warning', title: 'Error al eliminar', description: res.error || 'No se pudo eliminar el artículo.' });
      }
    } catch (err: unknown) {
      toast({ variant: 'error', title: 'Error', description: (err as Error).message });
    }
  };

  // Exportar Inventario a CSV Odoo-Style
  const handleExportCSV = () => {
    const exportData = items.map((i) => {
      const stock = i.stock_quantity ?? (i as any).stock ?? 0;
      const cost = Number(i.cost || 0);
      const price = Number(i.base_price || 0);
      const valuationCost = cost * stock;
      const valuationSale = price * stock;
      const margin = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0';

      return {
        SKU: i.sku || '',
        Nombre: i.name,
        Tipo: i.type === 'product' ? 'Producto Físico' : 'Servicio',
        Categoría: i.category || 'General',
        'Costo Adquisición ($)': cost.toFixed(2),
        'Precio Venta ($)': price.toFixed(2),
        'Margen (%)': `${margin}%`,
        'Existencia Actual': stock,
        'Stock Mínimo': i.metadata?.min_stock ?? 5,
        'Valuación al Costo ($)': valuationCost.toFixed(2),
        'Valuación en Venta ($)': valuationSale.toFixed(2),
        'Ubicación en Bodega': i.metadata?.location || '',
        'Proveedor Preferido': i.metadata?.preferred_supplier_name || '',
      };
    });

    exportToCSV(
      `inventario_${activeTenant?.name?.replace(/\s+/g, '_') || 'empresa'}_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        { header: 'SKU', accessor: (d: any) => d.SKU },
        { header: 'Nombre', accessor: (d: any) => d.Nombre },
        { header: 'Tipo', accessor: (d: any) => d.Tipo },
        { header: 'Categoría', accessor: (d: any) => d.Categoría },
        { header: 'Costo Adquisición ($)', accessor: (d: any) => d['Costo Adquisición ($)'] },
        { header: 'Precio Venta ($)', accessor: (d: any) => d['Precio Venta ($)'] },
        { header: 'Margen (%)', accessor: (d: any) => d['Margen (%)'] },
        { header: 'Existencia Actual', accessor: (d: any) => String(d['Existencia Actual']) },
        { header: 'Stock Mínimo', accessor: (d: any) => String(d['Stock Mínimo']) },
        { header: 'Valuación al Costo ($)', accessor: (d: any) => d['Valuación al Costo ($)'] },
        { header: 'Valuación en Venta ($)', accessor: (d: any) => d['Valuación en Venta ($)'] },
        { header: 'Ubicación en Bodega', accessor: (d: any) => d['Ubicación en Bodega'] },
        { header: 'Proveedor Preferido', accessor: (d: any) => d['Proveedor Preferido'] },
      ],
      exportData
    );

    toast({ variant: 'success', title: 'Inventario Exportado', description: 'Se descargó el archivo CSV con las métricas contables y de existencias.' });
  };

  // Categorías Únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtrado de Artículos
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filtro por Tab Principal
      if (activeTab === 'items' && item.type !== 'product') return false;
      if (activeTab === 'services' && item.type !== 'service') return false;
      
      const stock = item.stock_quantity ?? (item as any).stock ?? 0;
      const minStock = Number(item.metadata?.min_stock ?? 5);

      if (activeTab === 'reorder') {
        if (item.type !== 'product') return false;
        if (stock > minStock) return false;
      }

      // Filtro por Búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = item.name.toLowerCase().includes(query);
        const matchSku = item.sku?.toLowerCase().includes(query);
        const matchBarcode = (item.metadata?.barcode as string)?.toLowerCase().includes(query);
        const matchCat = item.category?.toLowerCase().includes(query);
        const matchLoc = (item.metadata?.location as string)?.toLowerCase().includes(query);
        if (!matchName && !matchSku && !matchBarcode && !matchCat && !matchLoc) {
          return false;
        }
      }

      // Filtro por Categoría
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      // Filtro por Estado de Stock
      if (statusFilter !== 'all' && item.type === 'product') {
        if (statusFilter === 'out_of_stock' && stock > 0) return false;
        if (statusFilter === 'low_stock' && (stock <= 0 || stock > minStock)) return false;
        if (statusFilter === 'in_stock' && stock <= minStock) return false;
      }

      return true;
    });
  }, [items, activeTab, searchQuery, selectedCategory, statusFilter]);

  // Métricas Financieras y de Inventario Nivel Odoo
  const metrics = useMemo(() => {
    const products = items.filter((i) => i.type === 'product');
    const services = items.filter((i) => i.type === 'service');

    let totalCostValuation = 0;
    let totalSaleValuation = 0;
    let reorderAlertCount = 0;
    let outOfStockCount = 0;

    products.forEach((p) => {
      const stock = p.stock_quantity ?? (p as any).stock ?? 0;
      const cost = Number(p.cost || 0);
      const price = Number(p.base_price || 0);
      const minStock = Number(p.metadata?.min_stock ?? 5);

      totalCostValuation += cost * stock;
      totalSaleValuation += price * stock;

      if (stock <= 0) {
        outOfStockCount++;
        reorderAlertCount++;
      } else if (stock <= minStock) {
        reorderAlertCount++;
      }
    });

    const projectedProfit = Math.max(0, totalSaleValuation - totalCostValuation);
    const overallMargin = totalSaleValuation > 0 ? ((projectedProfit / totalSaleValuation) * 100).toFixed(1) : '0';

    return {
      totalProducts: products.length,
      totalServices: services.length,
      totalCostValuation,
      totalSaleValuation,
      projectedProfit,
      overallMargin,
      reorderAlertCount,
      outOfStockCount,
    };
  }, [items]);

  const tabs = [
    { id: 'items', label: 'Productos & Existencias', icon: Package, count: metrics.totalProducts },
    { id: 'services', label: 'Servicios', icon: Activity, count: metrics.totalServices },
    { id: 'reorder', label: 'Alertas de Reorden', icon: AlertTriangle, count: metrics.reorderAlertCount },
    { id: 'audit', label: 'Kardex & Auditoría', icon: Warehouse },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-foreground tracking-tight">Inventario de Mercancías</h1>
              <p className="text-slate-500 text-sm font-medium">Control de existencias, valuación contable, costos de adquisición y reposición</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap w-full md:w-auto justify-end">
          <button
            onClick={() => {
              setStockModalItemId('');
              setIsStockModalOpen(true);
            }}
            className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs btn-haptic flex items-center gap-2"
          >
            <PackagePlus size={16} />
            Ajuste de Stock
          </button>

          <button
            onClick={handleExportCSV}
            className="btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-bold text-xs px-3 py-2.5 rounded-xl border border-border btn-haptic flex items-center gap-1.5"
            title="Exportar a CSV / Excel"
          >
            <Download size={15} />
            Exportar CSV
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="btn-base bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-bold text-xs px-3 py-2.5 rounded-xl border border-border btn-haptic flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} />
            Importar
          </button>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="btn-base bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs px-4 py-2.5 rounded-xl shadow-md btn-haptic flex items-center gap-2"
          >
            <Plus size={16} />
            Nuevo Artículo
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Odoo / SAP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* KPI 1: Valuación al Costo (Activo Realizable) */}
        <div className="bg-card border border-border rounded-2xl p-4.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Valuación al Costo</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center">
              <Warehouse size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">
            ${metrics.totalCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500">Activo contable real en bodega</p>
        </div>

        {/* KPI 2: Valuación en Venta */}
        <div className="bg-card border border-border rounded-2xl p-4.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Ingreso Potencial</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ${metrics.totalSaleValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500">Margen proyectado: <span className="font-bold text-foreground">{metrics.overallMargin}%</span></p>
        </div>

        {/* KPI 3: Ganancia Bruta Proyectada */}
        <div className="bg-card border border-border rounded-2xl p-4.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Utilidad Bruta Bodega</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp size={15} />
            </div>
          </div>
          <p className="text-2xl font-black text-foreground">
            +${metrics.projectedProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-500">{metrics.totalProducts} productos registrados</p>
        </div>

        {/* KPI 4: Alertas de Reorden */}
        <div className="bg-card border border-border rounded-2xl p-4.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alertas de Reorden</span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${metrics.reorderAlertCount > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-slate-100 text-slate-400'}`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className={`text-2xl font-black ${metrics.reorderAlertCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {metrics.reorderAlertCount}
          </p>
          <p className="text-[11px] text-slate-500">
            {metrics.outOfStockCount > 0 ? `${metrics.outOfStockCount} agotados críticos` : 'Existencias bajo mínimo'}
          </p>
        </div>
      </div>

      {/* Tabs Principales */}
      <UnderlineTabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabType)}
      />

      {/* Vistas de Inventario / Servicios / Reorden */}
      {activeTab !== 'audit' ? (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros Rápidos */}
          <div className="bg-card border border-border rounded-2xl p-3.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            {/* Buscador Universal */}
            <div className="relative w-full md:w-80">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por Nombre, SKU, Código, Ubicación..."
                className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-primary/20 text-foreground"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros Dropdowns y Estado */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              {/* Selector de Categoría */}
              {categories.length > 0 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-bold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">Todas las Categorías</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}

              {/* Selector de Estado de Stock */}
              {activeTab === 'items' && (
                <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-foreground shadow-xs' : 'text-slate-500 hover:text-foreground'}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('low_stock')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'low_stock' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs' : 'text-slate-500 hover:text-foreground'}`}
                  >
                    Bajo Mínimo
                  </button>
                  <button
                    onClick={() => setStatusFilter('out_of_stock')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${statusFilter === 'out_of_stock' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-500 hover:text-foreground'}`}
                  >
                    Agotados
                  </button>
                </div>
              )}

              {/* Conmutador de Vista (Grid vs Tabla) */}
              <ViewToggle storageKey="inventario-view-mode" currentView={viewMode} onViewChange={setViewMode} />
            </div>
          </div>

          {/* Renderizado de Artículos */}
          {isLoading ? (
            <SkeletonCardGrid count={6} columns={3} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title={searchQuery ? 'No se encontraron artículos' : 'Inventario vacío'}
              description={searchQuery ? 'No hay productos que coincidan con los filtros de búsqueda aplicados.' : 'Comienza registrando tus artículos, mercancías físicas o servicios en inventario.'}
              actionLabel={searchQuery ? 'Limpiar filtros' : 'Agregar primer artículo'}
              onAction={() => {
                if (searchQuery) {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                } else {
                  setIsModalOpen(true);
                }
              }}
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const stock = item.stock_quantity ?? (item as any).stock ?? 0;
                const cost = Number(item.cost || 0);
                const price = Number(item.base_price || 0);
                const minStock = Number(item.metadata?.min_stock ?? 5);

                const isLowStock = item.type === 'product' && stock <= minStock && stock > 0;
                const isOut = item.type === 'product' && stock <= 0;
                const profitUnit = Math.max(0, price - cost);
                const marginPct = price > 0 ? ((profitUnit / price) * 100).toFixed(0) : '0';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="bg-card border border-border rounded-2xl p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden animate-in fade-in duration-200"
                  >
                    <div>
                      {/* Fila Superior: Categoría y Badge de Stock */}
                      <div className="flex justify-between items-start mb-2.5">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">
                          {item.category || 'General'}
                        </span>
                        <span
                          className={`badge text-[11px] font-black ${
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
                            ? `Bajo Mínimo (${stock})`
                            : `Stock: ${stock}`}
                        </span>
                      </div>

                      {/* Nombre y SKU */}
                      <h3 className="text-base font-black text-foreground mb-1 group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
                        <span className="font-mono bg-background px-1.5 py-0.5 rounded border border-border text-[10px]">
                          {item.sku || 'Sin SKU'}
                        </span>
                        {item.metadata?.location && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <MapPin size={12} /> {item.metadata.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precios, Costos y Valuación */}
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Precio Venta</p>
                          <p className="text-xl font-black text-foreground">
                            ${price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </p>
                          {cost > 0 && (
                            <p className="text-[10px] text-slate-400">
                              Costo: ${cost.toFixed(2)} ({marginPct}% mrg.)
                            </p>
                          )}
                        </div>

                        {item.type === 'product' && (
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Valuación Bodega</p>
                            <p className="text-sm font-black font-mono text-foreground">
                              ${(cost * stock).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {stock} {item.metadata?.unit_of_measure || 'uds'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Barra de Acción Rápida en Hover para Stock Crítico */}
                      {(isLowStock || isOut) && (
                        <div 
                          className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => router.push(`/compras?item=${item.id}`)}
                            className="flex-1 btn-base bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <ShoppingCart size={13} />
                            Comprar
                          </button>
                          <button
                            onClick={() => {
                              setStockModalItemId(item.id);
                              setIsStockModalOpen(true);
                            }}
                            className="btn-base bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground font-bold text-xs py-1.5 px-3 rounded-lg border border-border"
                          >
                            + Stock
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Vista de Tabla Detallada estilo Odoo */
            <div className="bg-card border border-border rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
              <table className="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-border bg-slate-50/70 dark:bg-slate-900/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="p-3.5">SKU / Ref</th>
                    <th className="p-3.5">Artículo</th>
                    <th className="p-3.5">Categoría</th>
                    <th className="p-3.5">Ubicación</th>
                    <th className="p-3.5 text-right">Costo ($)</th>
                    <th className="p-3.5 text-right">Precio Venta ($)</th>
                    <th className="p-3.5 text-right">Margen</th>
                    <th className="p-3.5 text-right">Existencias</th>
                    <th className="p-3.5 text-right">Valuación Costo</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-xs">
                  {filteredItems.map((item) => {
                    const stock = item.stock_quantity ?? (item as any).stock ?? 0;
                    const cost = Number(item.cost || 0);
                    const price = Number(item.base_price || 0);
                    const minStock = Number(item.metadata?.min_stock ?? 5);

                    const isLowStock = item.type === 'product' && stock <= minStock && stock > 0;
                    const isOut = item.type === 'product' && stock <= 0;
                    const profitUnit = Math.max(0, price - cost);
                    const marginPct = price > 0 ? ((profitUnit / price) * 100).toFixed(1) : '0';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                      >
                        <td className="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-400 font-bold">
                          {item.sku || '-'}
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-foreground text-sm block">{item.name}</span>
                          {item.metadata?.brand && (
                            <span className="text-[10px] text-slate-400">{item.metadata.brand}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-500 font-semibold">{item.category || 'General'}</td>
                        <td className="p-3.5 text-slate-500 font-medium">
                          {item.metadata?.location || '-'}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-500">
                          ${cost.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-foreground">
                          ${price.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {marginPct}%
                        </td>
                        <td className="p-3.5 text-right font-bold">
                          {item.type === 'product' ? (
                            <span className={isOut ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-foreground'}>
                              {stock} {item.metadata?.unit_of_measure || 'uds'}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-foreground">
                          {item.type === 'product' ? `$${(cost * stock).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`badge text-[10px] font-black ${
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
                              ? 'Bajo Mínimo'
                              : 'Normal'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {item.type === 'product' && (
                              <>
                                <button
                                  onClick={() => {
                                    setStockModalItemId(item.id);
                                    setIsStockModalOpen(true);
                                  }}
                                  className="btn-base btn-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-bold px-2 py-1 rounded-lg border border-border"
                                  title="Ajustar Stock"
                                >
                                  + Stock
                                </button>
                                {(isLowStock || isOut) && (
                                  <button
                                    onClick={() => router.push(`/compras?item=${item.id}`)}
                                    className="btn-base btn-xs bg-orange-600 hover:bg-orange-700 text-white font-bold px-2 py-1 rounded-lg"
                                    title="Emitir Orden de Compra"
                                  >
                                    Comprar
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Pestaña de Kardex & Auditoría Inmutable */
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">Kardex & Bitácora de Movimientos</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Trazabilidad inmutable de entradas de almacén, ajustes por conteo físico, ventas y modificaciones de costo.
            </p>
          </div>
          <AuditTrailSection logs={auditLogs as any} isLoading={isLoadingAudit} />
        </div>
      )}

      {/* Modal de Creación / Edición Odoo */}
      <CatalogModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editingItem}
      />

      {/* Drawer Lateral de Ficha Detallada */}
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
        onQuickStock={(item) => {
          setStockModalItemId(item.id);
          setIsStockModalOpen(true);
        }}
      />

      {/* Modal de Ajuste de Stock con Motivo */}
      <QuickStockModal
        isOpen={isStockModalOpen}
        onClose={() => {
          setIsStockModalOpen(false);
          setStockModalItemId('');
        }}
        onSuccess={fetchItems}
        items={items}
        initialItemId={stockModalItemId}
        tenantId={activeTenant?.id || ''}
      />

      {/* Modal de Importación CSV */}
      <CSVImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={fetchItems}
      />
    </div>
  );
}
