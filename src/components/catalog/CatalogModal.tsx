'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Package, Tag, DollarSign, Archive, Check, MapPin, Building2, Barcode, TrendingUp, AlertTriangle, Layers, Clock, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CreateItemInput } from '@/lib/api/items';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CreateItemInput) => Promise<void>;
  editItem?: any | null;
}

export function CatalogModal({ isOpen, onClose, onSave, editItem }: CatalogModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'pricing' | 'inventory' | 'service'>('general');

  // Estado para cálculo en vivo de márgenes
  const [salePrice, setSalePrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);

  useEffect(() => {
    if (editItem) {
      setItemType(editItem.type || 'product');
      setSalePrice(Number(editItem.base_price || 0));
      setCostPrice(Number(editItem.cost || 0));
    } else {
      setItemType('product');
      setSalePrice(0);
      setCostPrice(0);
      setActiveFormTab('general');
    }
  }, [editItem, isOpen]);

  // Cálculos financieros en tiempo real
  const financialMetrics = useMemo(() => {
    const profit = Math.max(0, salePrice - costPrice);
    const margin = salePrice > 0 ? ((profit / salePrice) * 100) : 0;
    const markup = costPrice > 0 ? ((profit / costPrice) * 100) : (salePrice > 0 ? 100 : 0);
    return {
      profit,
      margin: margin.toFixed(1),
      markup: markup.toFixed(1),
      isNegative: salePrice > 0 && salePrice < costPrice
    };
  }, [salePrice, costPrice]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawName = (formData.get('name') as string)?.trim();

    if (!rawName) {
      setError(itemType === 'service' ? 'El nombre del servicio es obligatorio.' : 'El nombre del artículo es obligatorio.');
      setActiveFormTab('general');
      setIsLoading(false);
      return;
    }

    const basePrice = Number(formData.get('base_price') || 0);
    const cost = Number(formData.get('cost') || 0);
    const stockQuantity = itemType === 'product' ? Number(formData.get('stock_quantity') || 0) : 0;
    const minStock = Number(formData.get('min_stock') || 5);
    const maxStock = Number(formData.get('max_stock') || 0);

    const isGroupSession = formData.get('is_group_session') === 'on';
    const durationMinutes = Number(formData.get('duration_minutes') || 30);
    const maxCapacity = Number(formData.get('max_capacity') || 1);
    const bufferTimeMinutes = Number(formData.get('buffer_time_minutes') || 0);

    const itemData: CreateItemInput = {
      type: itemType,
      name: rawName,
      sku: (formData.get('sku') as string)?.trim() || null,
      category: (formData.get('category') as string)?.trim() || (itemType === 'service' ? 'Servicios' : 'General'),
      description: (formData.get('description') as string)?.trim() || null,
      base_price: basePrice,
      cost: cost,
      stock_quantity: stockQuantity,
      metadata: {
        ...(editItem?.metadata || {}),
        unit_of_measure: itemType === 'service' ? 'servicio' : ((formData.get('unit_of_measure') as string) || 'unidad'),
        min_stock: itemType === 'product' ? minStock : 0,
        max_stock: itemType === 'product' && maxStock > 0 ? maxStock : null,
        location: itemType === 'product' ? ((formData.get('location') as string) || '') : '',
        barcode: itemType === 'product' ? ((formData.get('barcode') as string) || '') : '',
        preferred_supplier_name: itemType === 'product' ? ((formData.get('preferred_supplier_name') as string) || '') : '',
        brand: (formData.get('brand') as string) || '',
        duration_minutes: durationMinutes,
        is_group_session: isGroupSession,
        max_capacity: maxCapacity,
        buffer_time_minutes: bufferTimeMinutes,
      },
      is_active: true
    };

    try {
      await onSave(itemData);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al guardar el artículo o servicio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header del Modal */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md z-20 flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${itemType === 'product' ? 'bg-primary' : 'bg-fuchsia-600'}`}>
              {itemType === 'product' ? <Package size={22} /> : <Sparkles size={22} />}
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground">
                {editItem 
                  ? (itemType === 'service' ? `Editar Servicio: ${editItem.name}` : `Ficha de Inventario: ${editItem.name}`) 
                  : (itemType === 'service' ? 'Nuevo Servicio o Procedimiento' : 'Nuevo Producto / Artículo')}
              </h2>
              <p className="text-xs text-slate-500">
                {itemType === 'service' 
                  ? 'Configura precio, tiempo estimado, categoría y notas del procedimiento' 
                  : 'Configuración de costos, márgenes, existencias y reorden'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors btn-haptic"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Selector de Tipo (Producto vs Servicio) */}
          <div className="flex bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setItemType('product');
                if (activeFormTab === 'service') setActiveFormTab('general');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${itemType === 'product' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Package size={16} /> Artículo / Mercancía Física
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType('service');
                if (activeFormTab === 'inventory') setActiveFormTab('general');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${itemType === 'service' ? 'bg-white dark:bg-slate-700 shadow-sm text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Check size={16} /> Servicio / Procedimiento Clínico
            </button>
          </div>

          {/* Subpestañas del Formulario */}
          <div className="flex border-b border-border gap-2">
            <button
              type="button"
              onClick={() => setActiveFormTab('general')}
              className={`px-3 py-2 text-xs font-black border-b-2 transition-all ${activeFormTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
            >
              Datos Generales
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('pricing')}
              className={`px-3 py-2 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 ${activeFormTab === 'pricing' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
            >
              Precios & Costos
              {salePrice > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                  {financialMetrics.margin}% mrg.
                </span>
              )}
            </button>
            {itemType === 'product' ? (
              <button
                type="button"
                onClick={() => setActiveFormTab('inventory')}
                className={`px-3 py-2 text-xs font-black border-b-2 transition-all ${activeFormTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
              >
                Control de Stock & Bodega
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFormTab('service')}
                className={`px-3 py-2 text-xs font-black border-b-2 transition-all ${activeFormTab === 'service' ? 'border-fuchsia-600 text-fuchsia-600' : 'border-transparent text-slate-500 hover:text-foreground'}`}
              >
                Configuración de Cita & Duración
              </button>
            )}
          </div>

          {/* IMPORTANTE: Los paneles usan hidden para no desmontar los inputs y garantizar que el FormData siempre contenga el nombre y todos los campos */}

          {/* PESTAÑA 1: DATOS GENERALES */}
          <div className={activeFormTab === 'general' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <Input
                  name="name"
                  label={itemType === 'service' ? 'Nombre del Servicio / Tratamiento *' : 'Nombre del Artículo / Descripción *'}
                  placeholder={itemType === 'service' ? 'Ej. Limpieza Dental / Profilaxis / Consulta General' : 'Ej. Filtro de Aceite Sintético 10W40'}
                  defaultValue={editItem?.name || ''}
                  icon={itemType === 'service' ? <Sparkles size={18} /> : <Package size={18} />}
                  required
                  autoFocus
                />
              </div>

              <Input
                name="sku"
                label={itemType === 'service' ? 'Código Interno (Opcional)' : 'Código SKU / Referencia'}
                placeholder={itemType === 'service' ? 'Ej. SERV-ODON-01' : 'Ej. FIL-10W40'}
                defaultValue={editItem?.sku || ''}
                icon={<Archive size={18} />}
              />

              {/* El código de barras solo se muestra y requiere para productos físicos */}
              {itemType === 'product' ? (
                <Input
                  name="barcode"
                  label="Código de Barras (EAN / UPC)"
                  placeholder="Ej. 7591001234567"
                  defaultValue={editItem?.metadata?.barcode || ''}
                  icon={<Barcode size={18} />}
                />
              ) : (
                <Input
                  name="duration_minutes_preview"
                  label="Duración Estimada de Cita"
                  placeholder="30 minutos (ajustable en pestaña de Cita)"
                  defaultValue={editItem?.metadata?.duration_minutes ? `${editItem.metadata.duration_minutes} min` : '30 min'}
                  icon={<Clock size={18} />}
                  disabled
                />
              )}

              <Input
                name="category"
                label="Categoría"
                placeholder={itemType === 'service' ? 'Ej. Odontología / Salud / Estética' : 'Ej. Lubricantes / Repuestos'}
                defaultValue={editItem?.category || (itemType === 'service' ? 'Odontología' : '')}
                icon={<Tag size={18} />}
              />

              <Input
                name="brand"
                label={itemType === 'service' ? 'Especialidad / Departamento' : 'Marca / Fabricante'}
                placeholder={itemType === 'service' ? 'Ej. Odontología General / Ortodoncia' : 'Ej. Bosch / Mobil / Original'}
                defaultValue={editItem?.metadata?.brand || ''}
                icon={<Layers size={18} />}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Descripción / Protocolo del Servicio o Artículo</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={editItem?.description || ''}
                placeholder={itemType === 'service' ? 'Detalles de lo que incluye el procedimiento o indicaciones al paciente...' : 'Especificaciones, compatibilidad o notas para el mostrador...'}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* PESTAÑA 2: PRECIOS & COSTOS */}
          <div className={activeFormTab === 'pricing' ? 'space-y-5 animate-in fade-in duration-150' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">
                  {itemType === 'service' ? 'Costo Estimado de Insumos / Materiales ($ USD)' : 'Costo de Adquisición ($ USD)'}
                </label>
                <div className="relative">
                  <input
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                  <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {itemType === 'service' ? 'Gasto en materiales por cada atención.' : 'Precio al que compraste el producto a tu proveedor.'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Precio de Venta al Público ($ USD) *</label>
                <div className="relative">
                  <input
                    name="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={salePrice || ''}
                    onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full bg-background border-2 border-primary/40 rounded-xl pl-9 pr-3 py-2.5 text-base font-black text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40"
                  />
                  <DollarSign size={18} className="absolute left-3 top-3 text-primary" />
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">Precio facturado en Caja POS y presupuestos.</span>
              </div>
            </div>

            {/* Panel de Análisis de Margen y Rentabilidad */}
            <div className={`p-4 rounded-2xl border transition-all ${financialMetrics.isNegative ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className={financialMetrics.isNegative ? 'text-red-500' : 'text-emerald-500'} />
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Análisis de Rentabilidad por Unidad
                </h4>
              </div>

              {financialMetrics.isNegative && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                  <AlertTriangle size={16} />
                  ¡Atención! Estás cobrando por debajo del costo estimado.
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Ganancia Neta</p>
                  <p className={`text-lg font-black ${financialMetrics.isNegative ? 'text-red-500' : 'text-foreground'}`}>
                    ${financialMetrics.profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Margen Comercial</p>
                  <p className={`text-lg font-black ${financialMetrics.isNegative ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {financialMetrics.margin}%
                  </p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Markup s/ Costo</p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {financialMetrics.markup}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PESTAÑA 3: CONTROL DE STOCK & BODEGA (Solo productos) */}
          <div className={activeFormTab === 'inventory' && itemType === 'product' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                name="stock_quantity"
                label="Stock Físico Actual"
                type="number"
                min="0"
                placeholder="0"
                defaultValue={editItem?.stock_quantity ?? ''}
                icon={<Archive size={18} />}
              />
              <Input
                name="min_stock"
                label="Stock Mínimo (Alerta Reorden)"
                type="number"
                min="0"
                placeholder="5"
                defaultValue={editItem?.metadata?.min_stock ?? 5}
                icon={<AlertTriangle size={18} />}
              />
              <Input
                name="max_stock"
                label="Stock Máximo Sugerido"
                type="number"
                min="0"
                placeholder="50"
                defaultValue={editItem?.metadata?.max_stock ?? ''}
                icon={<Archive size={18} />}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">Unidad de Medida (UoM)</label>
                <select
                  name="unit_of_measure"
                  defaultValue={editItem?.metadata?.unit_of_measure || 'unidad'}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                >
                  <option value="unidad">📦 Unidad (ud)</option>
                  <option value="docena">📦 Docena (12 uds)</option>
                  <option value="caja">📦 Caja cerrada</option>
                  <option value="paquete">📦 Paquete</option>
                  <option value="litro">🧪 Litro (L)</option>
                  <option value="kilogramo">⚖️ Kilogramo (kg)</option>
                  <option value="gramo">⚖️ Gramo (g)</option>
                  <option value="metro">📏 Metro (m)</option>
                </select>
              </div>

              <Input
                name="location"
                label="Ubicación en Bodega / Pasillo"
                placeholder="Ej. Almacén 1 - Pasillo 4, Estante B"
                defaultValue={editItem?.metadata?.location || ''}
                icon={<MapPin size={18} />}
              />
            </div>

            <Input
              name="preferred_supplier_name"
              label="Proveedor Habitual Recomendado"
              placeholder="Ej. Distribuidora Automotriz Central C.A."
              defaultValue={editItem?.metadata?.preferred_supplier_name || ''}
              icon={<Building2 size={18} />}
            />
          </div>

          {/* PESTAÑA 4: SERVICIOS Y CITAS */}
          <div className={activeFormTab === 'service' && itemType === 'service' ? 'space-y-4 animate-in fade-in duration-150' : 'hidden'}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                name="duration_minutes"
                label="Duración Estimada (minutos) *"
                type="number"
                min="5"
                placeholder="30"
                defaultValue={editItem?.metadata?.duration_minutes ?? '30'}
                icon={<Clock size={18} />}
              />
              <Input
                name="buffer_time_minutes"
                label="Tiempo de Preparación / Esterilización (min)"
                type="number"
                min="0"
                placeholder="10"
                defaultValue={editItem?.metadata?.buffer_time_minutes ?? '0'}
                icon={<Clock size={18} />}
              />
            </div>

            <div className="flex items-center gap-3 p-4 border border-border rounded-xl bg-slate-50 dark:bg-slate-800/30">
              <input 
                type="checkbox" 
                name="is_group_session" 
                id="is_group_session"
                className="w-5 h-5 rounded border-slate-300 text-fuchsia-600 focus:ring-fuchsia-500" 
                defaultChecked={editItem?.metadata?.is_group_session === true} 
              />
              <div className="flex-1">
                <label htmlFor="is_group_session" className="text-sm font-bold block cursor-pointer">
                  ¿Es un servicio grupal o sesión simultánea?
                </label>
                <span className="text-xs text-slate-500 block mt-0.5">Permite que varios clientes reserven este cupo al mismo horario.</span>
              </div>
            </div>

            <Input
              name="max_capacity"
              label="Capacidad Máxima de Personas por Turno"
              type="number"
              min="1"
              placeholder="1"
              defaultValue={editItem?.metadata?.max_capacity ?? '1'}
            />
          </div>

          {/* Botonera de Acción */}
          <div className="pt-4 flex gap-3 sticky bottom-0 bg-card border-t border-border mt-auto">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full rounded-xl py-2.5 font-bold"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="w-full rounded-xl py-2.5 font-black btn-haptic shadow-md"
              disabled={isLoading}
            >
              {isLoading ? 'Guardando...' : (editItem ? (itemType === 'service' ? 'Actualizar Servicio' : 'Actualizar Artículo') : (itemType === 'service' ? 'Guardar Servicio' : 'Guardar Artículo'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
