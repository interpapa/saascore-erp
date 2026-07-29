'use client';

import { LegoModuleDNA } from '@/types/lego';
import { useState, useEffect } from 'react';
import { LegoEngine } from '@/components/lego/LegoEngine';
import { CatalogModal } from '@/components/catalog/CatalogModal';
import { CatalogDrawer } from '@/components/catalog/CatalogDrawer';
import { getItems, createItem, CreateItemInput, Item } from '@/lib/api/items';
import { Plus } from 'lucide-react';
import { LegoStudio } from '@/components/studio/LegoStudio';
import { LegoPieceDNA } from '@/types/lego';
import { useTenant } from '@/components/core/TenantProvider';

export default function CatalogoPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { activeTenant } = useTenant();

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTenant) {
      fetchItems();
    }
  }, [activeTenant]);

  const handleCreateItem = async (data: CreateItemInput) => {
    if (!activeTenant) return;
    await createItem({ ...data, tenant_id: activeTenant.id });
    await fetchItems(); // Recargar la tabla
  };

  // Estadísticas
  const totalItems = items.length;
  const products = items.filter(i => i.type === 'product');
  const services = items.filter(i => i.type === 'service');
  
  const totalValue = products.reduce((acc, p) => acc + (p.cost * p.stock_quantity), 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= 5).length;

  const catalogCustomData = {
    'catalog-stats': [
      { dummy: true }
    ],
    'catalog-list': items.map(i => {
      // Determinamos el status (Píldoras)
      let statusText = 'Activo';
      if (i.type === 'product') {
        if (i.stock_quantity <= 0) statusText = 'Agotado';
        else if (i.stock_quantity <= 5) statusText = 'Stock Bajo';
        else statusText = 'En Stock';
      } else {
        statusText = 'Servicio';
      }

      return {
        id: i.id,
        name: i.name,
        category: i.category || 'N/A',
        price: i.base_price,
        stock: i.type === 'product' ? i.stock_quantity : '-',
        status: statusText
      };
    })
  };

  const handlePieceAction = (pieceId: string, rowItem: any) => {
    if (pieceId === 'catalog-list') {
      const fullItem = items.find(i => i.id === rowItem.id);
      if (fullItem) setSelectedItem(fullItem);
    }
  };

  const catalogDNA: LegoModuleDNA = {
    moduleId: 'catalog-module',
    name: '',
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
            { label: 'Alertas de Stock', value: lowStockCount.toString(), icon: 'AlertTriangle', colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' }
          ]
        }
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
            { field: 'status', label: 'Estado', type: 'status' }
          ]
        }
      }
    ]
  };

  return (
    <div className="max-w-5xl mx-auto w-full h-full overflow-y-auto p-4 md:p-8 relative">
      {/* Cabecera del Módulo */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">Catálogo</h1>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Gestión de repuestos, inventario y servicios</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-slate-600 dark:text-slate-300"
          >
            Editar Pantalla
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
            // Aquí en un futuro guardaremos el newLayout en Supabase
            console.log('Nuevo Layout Guardado:', newLayout);
            setIsEditing(false);
          }} 
          onClose={() => setIsEditing(false)} 
        />
      )}
    </div>
  );
}
