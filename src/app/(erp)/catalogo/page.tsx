'use client';

import { LegoModuleDNA } from '@/types/lego';
import { useState, useEffect } from 'react';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogDrawer } from '@/components/catalog/CatalogDrawer';
import { getItemsAction, createItemAction } from '@/app/actions/items';
import { Item } from '@/lib/api/items';
import { Plus, Package, DollarSign, AlertTriangle } from 'lucide-react';
import { LegoStudio } from '@/components/studio/LegoStudio';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useToast } from '@/components/core/ToastProvider';

export default function CatalogoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const activeTenant = useTenantResolver();
  const { session } = useERPStore();
  const { toast } = useToast();

  const actor = {
    email: session?.userEmail || 'admin@saascore.com',
    role: session?.role || ('owner' as const),
  };

  const fetchItems = async () => {
    if (!activeTenant) return;
    try {
      setIsLoading(true);
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

  useEffect(() => {
    if (activeTenant) {
      fetchItems();
    }
  }, [activeTenant]);

  const handleCreateItem = async (data: any) => {
    if (!activeTenant) return;
    
    // Inserción optimista en memoria para respuesta instantánea (0ms)
    const tempId = `temp_${Date.now()}`;
    const newItem: any = {
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
    } catch (err: any) {
      toast({ variant: 'info', title: 'Modo Offline', description: 'Ítem guardado localmente en esta sesión.' });
    }
  };

  // Estadísticas
  const totalItems = items.length;
  const products = items.filter((i) => i.type === 'product');
  const totalValue = products.reduce((acc, p) => acc + (p.cost * (p.stock_quantity || 0)), 0);
  const lowStockCount = products.filter((p) => (p.stock_quantity || 0) <= 5).length;

  const catalogCustomData = {
    'catalog-stats': [{ dummy: true }],
    'catalog-list': items.map((i) => {
      let statusText = 'Activo';
      if (i.type === 'product') {
        if ((i.stock_quantity || 0) <= 0) statusText = 'Agotado';
        else if ((i.stock_quantity || 0) <= 5) statusText = 'Stock Bajo';
        else statusText = 'En Stock';
      } else {
        statusText = 'Servicio';
      }

      return {
        id: i.id,
        name: i.name,
        category: i.category || 'General',
        price: i.base_price || 0,
        stock: i.type === 'product' ? i.stock_quantity : '-',
        status: statusText,
      };
    }),
  };

  const handlePieceAction = (pieceId: string, rowItem: any) => {
    if (pieceId === 'catalog-list') {
      const fullItem = items.find((i) => i.id === rowItem.id);
      if (fullItem) setSelectedItem(fullItem);
    }
  };

  const catalogDNA: LegoModuleDNA = {
    moduleId: 'catalog-module-unified',
    name: 'Catálogo de Repuestos y Servicios',
    layout: [
      {
        id: 'catalog-stats',
        type: 'stat-grid',
        span: 'full',
        dataSource: 'catalog-stats',
        config: {
          metrics: [
            { label: 'Total Ítems', value: totalItems.toString(), icon: 'Package', colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
            { label: 'Valor del Inventario', value: totalValue.toString(), format: 'currency', icon: 'DollarSign', colorClass: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
            { label: 'Alertas de Stock', value: lowStockCount.toString(), icon: 'AlertTriangle', colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
          ],
        },
      },
      {
        id: 'catalog-list',
        type: 'list-feed',
        span: 'full',
        dataSource: 'catalog-list',
        config: {
          title: 'Directorio de Repuestos y Servicios',
          columns: [
            { field: 'name', label: 'Nombre' },
            { field: 'category', label: 'Categoría' },
            { field: 'stock', label: 'Inventario' },
            { field: 'price', label: 'Precio', format: 'currency' },
            { field: 'status', label: 'Estado', type: 'status' },
          ],
        },
      },
    ],
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative">
      {/* Cabecera Estandarizada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Catálogo de Productos</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium mt-0.5">Gestión de inventario, repuestos y servicios</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-slate-600 dark:text-slate-300 btn-haptic"
          >
            Editar Layout
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] flex items-center gap-2 btn-haptic"
          >
            <Plus size={18} />
            Nuevo Ítem
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <LegoEngine dna={catalogDNA} customData={catalogCustomData} onPieceAction={handlePieceAction} />
      )}

      <CatalogModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateItem}
      />

      <CatalogDrawer
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      {isEditing && (
        <LegoStudio
          initialLayout={catalogDNA.layout}
          onSave={(newLayout) => {
            console.log('Nuevo Layout Guardado:', newLayout);
            setIsEditing(false);
          }}
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
}
