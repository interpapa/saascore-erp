'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Package, 
  Tag, 
  DollarSign, 
  Archive, 
  Check, 
  MapPin, 
  Building2, 
  Barcode, 
  TrendingUp, 
  AlertTriangle, 
  Layers, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  Camera,
  PlusCircle,
  MinusCircle,
  RefreshCw
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CreateItemInput } from '@/lib/api/items';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: CreateItemInput) => Promise<void>;
  editItem?: any | null;
  initialTab?: 'general' | 'pricing' | 'inventory' | 'service';
}

export function CatalogModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editItem,
  initialTab = 'general'
}: CatalogModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [itemType, setItemType] = useState<'product' | 'service'>('product');
  const [activeFormTab, setActiveFormTab] = useState<'general' | 'pricing' | 'inventory' | 'service'>(initialTab);

  // Estado para cálculo en vivo de márgenes
  const [salePrice, setSalePrice] = useState<number>(0);
  const [wholesalePrice, setWholesalePrice] = useState<number>(0);
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number>(3);
  const [costPrice, setCostPrice] = useState<number>(0);

  // Estados de Imagen y Foto
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Control y Ajuste de Stock Unificado
  const [stockAdjustmentMode, setStockAdjustmentMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustmentDelta, setAdjustmentDelta] = useState<number>(10);
  const [directStockQty, setDirectStockQty] = useState<number>(0);
  const [stockReason, setStockReason] = useState<string>('Reposición de mercancía');
  const [hasAdjustedStock, setHasAdjustedStock] = useState<boolean>(false);
  const [recordExpense, setRecordExpense] = useState<boolean>(false);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [paymentSource, setPaymentSource] = useState<'cash' | 'payable'>('cash');
  const [supplierName, setSupplierName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveFormTab(initialTab);
      }
      if (editItem) {
        setItemType(editItem.type || 'product');
        setSalePrice(Number(editItem.base_price || 0));
        setWholesalePrice(Number(editItem.metadata?.wholesale_price || 0));
        setWholesaleMinQty(Number(editItem.metadata?.wholesale_min_qty || 3));
        const initialCost = Number(editItem.cost || 0);
        setCostPrice(initialCost);
        setImageUrl(editItem.metadata?.image_url || editItem.image_url || '');
        const currentStock = Number(editItem.stock_quantity ?? editItem.stock ?? 0);
        setDirectStockQty(currentStock);
        setAdjustmentDelta(10);
        setHasAdjustedStock(false);
        setStockAdjustmentMode('add');
        setStockReason('Reposición de mercancía');
        setRecordExpense(false);
        setUnitCost(initialCost);
        setTotalCost(initialCost * 10);
        setSupplierName(editItem.metadata?.preferred_supplier_name || '');
      } else {
        setItemType('product');
        setSalePrice(0);
        setWholesalePrice(0);
        setWholesaleMinQty(3);
        setCostPrice(0);
        setImageUrl('');
        setDirectStockQty(0);
        setAdjustmentDelta(0);
        setHasAdjustedStock(false);
        setRecordExpense(false);
        setActiveFormTab(initialTab || 'general');
      }
    }
  }, [editItem, isOpen, initialTab]);

  // Cálculos financieros en tiempo real
  const financialMetrics = useMemo(() => {
    const profit = Math.max(0, salePrice - costPrice);
    const margin = salePrice > 0 ? ((profit / salePrice) * 100) : 0;
    const markup = costPrice > 0 ? ((profit / costPrice) * 100) : (salePrice > 0 ? 100 : 0);

    const wholesaleProfit = wholesalePrice > 0 ? Math.max(0, wholesalePrice - costPrice) : 0;
    const wholesaleMargin = wholesalePrice > 0 ? ((wholesaleProfit / wholesalePrice) * 100) : 0;

    return {
      profit,
      margin: margin.toFixed(1),
      markup: markup.toFixed(1),
      isNegative: salePrice > 0 && salePrice < costPrice,
      wholesaleProfit,
      wholesaleMargin: wholesaleMargin.toFixed(1),
      hasWholesale: wholesalePrice > 0,
    };
  }, [salePrice, wholesalePrice, costPrice]);

  // Cálculo en vivo del Stock Físico Resultante
  const currentBaseStock = editItem ? Number(editItem.stock_quantity ?? editItem.stock ?? 0) : 0;

  const calculatedStock = useMemo(() => {
    if (!editItem) {
      return directStockQty;
    }
    if (!hasAdjustedStock) {
      return currentBaseStock;
    }
    if (stockAdjustmentMode === 'add') {
      return currentBaseStock + adjustmentDelta;
    } else if (stockAdjustmentMode === 'subtract') {
      return Math.max(0, currentBaseStock - adjustmentDelta);
    } else {
      return Math.max(0, directStockQty);
    }
  }, [editItem, hasAdjustedStock, currentBaseStock, stockAdjustmentMode, adjustmentDelta, directStockQty]);

  const effectiveDelta = useMemo(() => {
    if (!editItem || !hasAdjustedStock) return 0;
    if (stockAdjustmentMode === 'add') return adjustmentDelta;
    if (stockAdjustmentMode === 'subtract') return -adjustmentDelta;
    return directStockQty - currentBaseStock;
  }, [editItem, hasAdjustedStock, stockAdjustmentMode, adjustmentDelta, directStockQty, currentBaseStock]);

  const handleAdjustmentDeltaChange = (newDelta: number) => {
    const valid = Math.max(1, newDelta);
    setAdjustmentDelta(valid);
    setHasAdjustedStock(true);
    setTotalCost(Math.round(unitCost * valid * 100) / 100);
  };

  // Subida de imagen desde archivo o cámara con compresión canvas liviana
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsCompressingImage(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = Math.round((height * MAX_SIZE) / width);
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = Math.round((width * MAX_SIZE) / height);
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setImageUrl(compressed);
          } else {
            setImageUrl(readerEvent.target?.result as string);
          }
        } catch {
          setImageUrl(readerEvent.target?.result as string);
        } finally {
          setIsCompressingImage(false);
        }
      };
      img.onerror = () => {
        setIsCompressingImage(false);
        setError('No se pudo procesar la imagen.');
      };
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => {
      setIsCompressingImage(false);
      setError('Error al leer el archivo del dispositivo.');
    };
    reader.readAsDataURL(file);
  };

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
    const rawWholesalePrice = formData.get('wholesale_price');
    const wholesalePriceVal = rawWholesalePrice !== null && rawWholesalePrice !== '' ? Number(rawWholesalePrice) : null;
    const rawWholesaleMinQty = formData.get('wholesale_min_qty');
    const wholesaleMinQtyVal = rawWholesaleMinQty ? Number(rawWholesaleMinQty) : 3;

    const cost = Number(formData.get('cost') || 0);
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
      stock_quantity: itemType === 'product' ? calculatedStock : 0,
      metadata: {
        ...(editItem?.metadata || {}),
        wholesale_price: wholesalePriceVal && wholesalePriceVal > 0 ? wholesalePriceVal : null,
        wholesale_min_qty: wholesalePriceVal && wholesalePriceVal > 0 ? Math.max(2, wholesaleMinQtyVal) : null,
        unit_of_measure: itemType === 'service' ? 'servicio' : ((formData.get('unit_of_measure') as string) || 'unidad'),
        min_stock: itemType === 'product' ? minStock : 0,
        max_stock: itemType === 'product' && maxStock > 0 ? maxStock : null,
        location: itemType === 'product' ? ((formData.get('location') as string) || '') : '',
        barcode: itemType === 'product' ? ((formData.get('barcode') as string) || '') : '',
        preferred_supplier_name: itemType === 'product' ? ((formData.get('preferred_supplier_name') as string) || supplierName.trim() || '') : '',
        brand: (formData.get('brand') as string) || '',
        duration_minutes: durationMinutes,
        is_group_session: isGroupSession,
        max_capacity: maxCapacity,
        buffer_time_minutes: bufferTimeMinutes,
        image_url: imageUrl.trim() || null,
        stock_adjustment: (hasAdjustedStock && effectiveDelta !== 0) ? {
          delta: effectiveDelta,
          reason: stockReason,
          resulting_stock: calculatedStock,
          expense: (recordExpense && effectiveDelta > 0) ? {
            unit_cost: unitCost,
            total_cost: totalCost,
            payment_source: paymentSource,
            supplier_name: supplierName.trim() || undefined,
          } : null
        } : null
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
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-card border border-border rounded-[28px] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header del Modal */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-md z-20 flex items-center justify-between p-4 sm:p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${itemType === 'product' ? 'bg-primary' : 'bg-fuchsia-600'}`}>
              {itemType === 'product' ? <Package size={22} /> : <Sparkles size={22} />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground line-clamp-1">
                {editItem 
                  ? (itemType === 'service' ? `Editar: ${editItem.name}` : `Ficha de Producto: ${editItem.name}`) 
                  : (itemType === 'service' ? 'Nuevo Servicio o Procedimiento' : 'Nuevo Producto / Artículo')}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
                {itemType === 'service' 
                  ? 'Configura precio, tiempo estimado, categoría y notas' 
                  : 'Precios, foto, existencias físicas y stock'}
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

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 flex-1">
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
              <Package size={16} /> Artículo Físico
            </button>
            <button
              type="button"
              onClick={() => {
                setItemType('service');
                if (activeFormTab === 'inventory') setActiveFormTab('general');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition-all ${itemType === 'service' ? 'bg-white dark:bg-slate-700 shadow-sm text-fuchsia-600 dark:text-fuchsia-400' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
            >
              <Check size={16} /> Servicio Clínico
            </button>
          </div>

          {/* Subpestañas del Formulario */}
          <div className="flex border-b border-border gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveFormTab('general')}
              className={`px-3 py-2 text-xs font-black border-b-2 whitespace-nowrap transition-all ${activeFormTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
            >
              Datos Generales & Foto
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab('pricing')}
              className={`px-3 py-2 text-xs font-black border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeFormTab === 'pricing' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
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
                className={`px-3 py-2 text-xs font-black border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${activeFormTab === 'inventory' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-foreground'}`}
              >
                Control de Stock & Existencias
                {editItem && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-600 dark:text-slate-300">
                    {calculatedStock} uds
                  </span>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveFormTab('service')}
                className={`px-3 py-2 text-xs font-black border-b-2 whitespace-nowrap transition-all ${activeFormTab === 'service' ? 'border-fuchsia-600 text-fuchsia-600' : 'border-transparent text-slate-500 hover:text-foreground'}`}
              >
                Configuración de Cita
              </button>
            )}
          </div>

          {/* PESTAÑA 1: DATOS GENERALES & FOTO */}
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
                />
              </div>

              <Input
                name="sku"
                label={itemType === 'service' ? 'Código Interno (Opcional)' : 'Código SKU / Referencia'}
                placeholder={itemType === 'service' ? 'Ej. SERV-ODON-01' : 'Ej. FIL-10W40'}
                defaultValue={editItem?.sku || ''}
                icon={<Archive size={18} />}
              />

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
                  placeholder="30 minutos"
                  defaultValue={editItem?.metadata?.duration_minutes ? `${editItem.metadata.duration_minutes} min` : '30 min'}
                  icon={<Clock size={18} />}
                  disabled
                />
              )}

              <Input
                name="category"
                label="Categoría"
                placeholder={itemType === 'service' ? 'Ej. Odontología / Salud / Estética' : 'Ej. Lubricantes / Repuestos'}
                defaultValue={editItem?.category || (itemType === 'service' ? 'Servicios' : 'General')}
                icon={<Tag size={18} />}
              />

              <Input
                name="brand"
                label={itemType === 'service' ? 'Especialidad / Departamento' : 'Marca / Fabricante'}
                placeholder={itemType === 'service' ? 'Ej. Odontología General' : 'Ej. Bosch / Mobil / Original'}
                defaultValue={editItem?.metadata?.brand || ''}
                icon={<Layers size={18} />}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Descripción / Protocolo o Notas</label>
              <textarea
                name="description"
                rows={2}
                defaultValue={editItem?.description || ''}
                placeholder={itemType === 'service' ? 'Detalles de lo que incluye el procedimiento...' : 'Especificaciones, compatibilidad o notas para el mostrador...'}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* SECCIÓN ERGONÓMICA DE SUBIDA DE FOTO (Cámara o Archivo) */}
            <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <ImageIcon size={16} className="text-primary" />
                  Foto / Imagen del Producto o Servicio
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="text-xs text-rose-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <X size={14} /> Quitar foto
                  </button>
                )}
              </div>

              {/* Input oculto nativo con accept="image/*" - en móviles abre selector de cámara o fotos */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />

              {imageUrl ? (
                <div className="flex items-center gap-4 p-3 bg-card border border-border rounded-2xl shadow-xs">
                  <div className="relative w-20 h-20 rounded-2xl border border-border overflow-hidden bg-white dark:bg-slate-800 shrink-0 shadow-xs">
                    <img
                      src={imageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.opacity = '0.3';
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-bold text-foreground">Foto cargada correctamente</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isCompressingImage}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black text-foreground flex items-center gap-1.5 transition-colors btn-haptic"
                      >
                        <Camera size={14} /> Cambiar foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-black transition-colors"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressingImage}
                    className="w-full py-4 px-4 bg-primary/10 hover:bg-primary/15 border-2 border-dashed border-primary/40 rounded-2xl flex flex-col items-center justify-center gap-2 text-primary active:scale-99 transition-all cursor-pointer btn-haptic"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <Camera size={24} className="text-primary" />
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-black block">
                        {isCompressingImage ? 'Optimizando imagen...' : 'Tomar Foto con Cámara o Subir Archivo'}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Toca aquí desde el teléfono para abrir la cámara o seleccionar de tu galería
                      </span>
                    </div>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className="text-[11px] font-bold text-slate-500 hover:text-foreground underline"
                    >
                      {showUrlInput ? 'Ocultar enlace web' : 'O pegar enlace web (URL)...'}
                    </button>
                  </div>

                  {showUrlInput && (
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 font-mono animate-in fade-in"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PESTAÑA 2: PRECIOS & COSTOS */}
          <div className={activeFormTab === 'pricing' ? 'space-y-5 animate-in fade-in duration-150' : 'hidden'}>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">
                {itemType === 'service' ? 'Costo Estimado de Insumos ($ USD)' : 'Costo de Adquisición / Compra ($ USD)'}
              </label>
              <div className="relative">
                <input
                  name="cost"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={costPrice || ''}
                  onChange={(e) => {
                    const c = parseFloat(e.target.value) || 0;
                    setCostPrice(c);
                    setUnitCost(c);
                    setTotalCost(c * adjustmentDelta);
                  }}
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                <DollarSign size={16} className="absolute left-3 top-3 text-slate-400" />
              </div>
            </div>

            {/* Precios Detal y Mayor */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <DollarSign size={14} className="text-primary" />
                  Precios de Venta (Detal y Mayor)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-foreground block mb-1">Precio al Detal ($ USD) *</label>
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
                </div>

                <div>
                  <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                    Precio al Mayor ($ USD) <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      name="wholesale_price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={wholesalePrice || ''}
                      onChange={(e) => setWholesalePrice(parseFloat(e.target.value) || 0)}
                      className="w-full bg-background border-2 border-indigo-500/40 rounded-xl pl-9 pr-3 py-2.5 text-base font-black text-foreground focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                    />
                    <DollarSign size={18} className="absolute left-3 top-3 text-indigo-500" />
                  </div>
                </div>
              </div>

              {wholesalePrice > 0 && (
                <div className="pt-2 border-t border-border/60 flex items-center gap-3">
                  <div className="w-48">
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">
                      Mínimo para Mayor:
                    </label>
                    <input
                      name="wholesale_min_qty"
                      type="number"
                      min="2"
                      value={wholesaleMinQty}
                      onChange={(e) => setWholesaleMinQty(parseInt(e.target.value) || 2)}
                      className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="flex-1 text-xs text-slate-500 pt-3">
                    A partir de <span className="font-bold text-foreground">{wholesaleMinQty} unidades</span> se aplica automáticamente.
                  </div>
                </div>
              )}
            </div>

            {/* Panel de Análisis de Margen */}
            <div className={`p-4 rounded-2xl border transition-all ${financialMetrics.isNegative ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-50 dark:bg-slate-800/40 border-border'}`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={18} className={financialMetrics.isNegative ? 'text-red-500' : 'text-emerald-500'} />
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Rentabilidad por Unidad
                </h4>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Ganancia Detal</p>
                  <p className={`text-base sm:text-lg font-black ${financialMetrics.isNegative ? 'text-red-500' : 'text-foreground'}`}>
                    ${financialMetrics.profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Margen Detal</p>
                  <p className={`text-base sm:text-lg font-black ${financialMetrics.isNegative ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {financialMetrics.margin}%
                  </p>
                </div>
                <div className="bg-background/80 p-2.5 rounded-xl border border-border">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Markup</p>
                  <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {financialMetrics.markup}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* PESTAÑA 3: CONTROL DE STOCK & EXISTENCIAS FÍSICAS (UNIFICADO) */}
          <div className={activeFormTab === 'inventory' && itemType === 'product' ? 'space-y-5 animate-in fade-in duration-150' : 'hidden'}>
            
            {/* PARTE SUPERIOR: AJUSTE RÁPIDO DE EXISTENCIAS FÍSICAS */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-border space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Archive size={16} className="text-primary" />
                    Ajuste Rápido de Existencias Físicas
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Entrada por reposición, salida por merma o conteo físico
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock Actual</span>
                  <span className="text-base font-black font-mono text-foreground">
                    {currentBaseStock} uds
                  </span>
                </div>
              </div>

              {editItem ? (
                <>
                  {/* Selector de Tipo de Movimiento: Entrada (+) / Salida (-) / Conteo Exacto (=) */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-200/60 dark:bg-slate-900/60 p-1.5 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setStockAdjustmentMode('add');
                        setHasAdjustedStock(true);
                        setStockReason('Reposición de mercancía');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all btn-haptic ${
                        stockAdjustmentMode === 'add' && hasAdjustedStock
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-300 hover:text-foreground'
                      }`}
                    >
                      <PlusCircle size={15} /> Entrada (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStockAdjustmentMode('subtract');
                        setHasAdjustedStock(true);
                        setStockReason('Merma o producto dañado');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all btn-haptic ${
                        stockAdjustmentMode === 'subtract' && hasAdjustedStock
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'text-slate-600 dark:text-slate-300 hover:text-foreground'
                      }`}
                    >
                      <MinusCircle size={15} /> Salida (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStockAdjustmentMode('set');
                        setHasAdjustedStock(true);
                        setDirectStockQty(currentBaseStock);
                        setStockReason('Ajuste por conteo físico');
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl text-xs font-black transition-all btn-haptic ${
                        stockAdjustmentMode === 'set' && hasAdjustedStock
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'text-slate-600 dark:text-slate-300 hover:text-foreground'
                      }`}
                    >
                      <RefreshCw size={14} /> Conteo (=)
                    </button>
                  </div>

                  {/* Stepper Ergonómico Grande */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {stockAdjustmentMode === 'add'
                          ? 'Cantidad a Ingresar (+):'
                          : stockAdjustmentMode === 'subtract'
                          ? 'Cantidad a Retirar (-):'
                          : 'Nuevo Conteo Físico:'}
                      </label>
                      <span className="text-xs font-bold text-slate-500">
                        Stock Resultante: <b className="font-mono text-emerald-600 dark:text-emerald-400 font-black text-sm">{calculatedStock} uds</b>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (stockAdjustmentMode === 'set') {
                            setDirectStockQty(Math.max(0, directStockQty - 1));
                          } else {
                            handleAdjustmentDeltaChange(Math.max(1, adjustmentDelta - 1));
                          }
                        }}
                        className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/80 hover:bg-rose-500 hover:text-white text-foreground font-black text-2xl flex items-center justify-center active:scale-95 transition-all border border-border shadow-xs shrink-0 btn-haptic"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        value={stockAdjustmentMode === 'set' ? directStockQty : adjustmentDelta}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          if (stockAdjustmentMode === 'set') {
                            setDirectStockQty(Math.max(0, val));
                          } else {
                            handleAdjustmentDeltaChange(Math.max(0, val));
                          }
                          setHasAdjustedStock(true);
                        }}
                        onFocus={(e) => e.target.select()}
                        className="flex-1 bg-background border-2 border-primary/30 rounded-2xl h-12 text-center text-2xl font-black font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (stockAdjustmentMode === 'set') {
                            setDirectStockQty(directStockQty + 1);
                          } else {
                            handleAdjustmentDeltaChange(adjustmentDelta + 1);
                          }
                        }}
                        className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-2xl flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 btn-haptic"
                      >
                        +
                      </button>
                    </div>

                    {/* Atajos Rápidos */}
                    <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-400 mr-1">Rápido:</span>
                      {[1, 5, 10, 25, 50, 100].map((inc) => (
                        <button
                          key={inc}
                          type="button"
                          onClick={() => {
                            if (stockAdjustmentMode === 'set') {
                              setDirectStockQty(directStockQty + inc);
                            } else {
                              handleAdjustmentDeltaChange(adjustmentDelta + inc);
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-primary/20 hover:text-primary text-xs font-black text-slate-700 dark:text-slate-300 border border-border/60 active:scale-95 transition-all btn-haptic"
                        >
                          +{inc}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Motivo Kardex */}
                  {hasAdjustedStock && (
                    <div className="space-y-3 pt-2 border-t border-border/60">
                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                          Motivo del Ajuste (Kardex / Auditoría) *
                        </label>
                        <select
                          value={stockReason}
                          onChange={(e) => setStockReason(e.target.value)}
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                        >
                          {stockAdjustmentMode === 'add' ? (
                            <>
                              <option value="Reposición de mercancía">📦 Reposición de mercancía</option>
                              <option value="Compra a proveedor">🛒 Compra a proveedor</option>
                              <option value="Ajuste por conteo físico">📋 Ajuste por conteo físico</option>
                              <option value="Devolución de cliente">↩️ Devolución de cliente</option>
                              <option value="Producción interna / Ensamblaje">⚙️ Producción interna / Ensamblaje</option>
                              <option value="Otro ingreso">➕ Otro ingreso de inventario</option>
                            </>
                          ) : (
                            <>
                              <option value="Merma o producto dañado">⚠️ Merma / Daño / Vencimiento</option>
                              <option value="Ajuste por conteo físico">📋 Ajuste por conteo físico</option>
                              <option value="Uso interno / Taller">🔧 Uso interno / Taller</option>
                              <option value="Pérdida o descuadre">❌ Pérdida o descuadre de inventario</option>
                              <option value="Devolución a proveedor">↩️ Devolución a proveedor</option>
                              <option value="Otro egreso">➖ Otro egreso</option>
                            </>
                          )}
                        </select>
                      </div>

                      {/* Registrar Egreso / Gasto si es Entrada */}
                      {stockAdjustmentMode === 'add' && (
                        <div className="p-3 bg-card border border-border rounded-xl space-y-2.5">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={recordExpense}
                              onChange={(e) => setRecordExpense(e.target.checked)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-bold text-foreground">
                              Registrar egreso contable / compra de mercancía
                            </span>
                          </label>

                          {recordExpense && (
                            <div className="space-y-2 pt-2 animate-in fade-in">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Costo Unitario ($)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={unitCost}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      setUnitCost(val);
                                      setTotalCost(Math.round(val * adjustmentDelta * 100) / 100);
                                    }}
                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Total Compra ($)</label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={totalCost}
                                    onChange={(e) => {
                                      const val = Math.max(0, Number(e.target.value) || 0);
                                      setTotalCost(val);
                                      if (adjustmentDelta > 0) {
                                        setUnitCost(Math.round((val / adjustmentDelta) * 100) / 100);
                                      }
                                    }}
                                    className="w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                                  />
                                </div>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <input
                                    type="radio"
                                    name="expense_payment_source"
                                    checked={paymentSource === 'cash'}
                                    onChange={() => setPaymentSource('cash')}
                                  />
                                  Caja Chica (Efectivo)
                                </label>
                                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                                  <input
                                    type="radio"
                                    name="expense_payment_source"
                                    checked={paymentSource === 'payable'}
                                    onChange={() => setPaymentSource('payable')}
                                  />
                                  Cuenta por Pagar
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Producto Nuevo: Stepper de Stock Inicial */
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                    Stock Físico Inicial:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDirectStockQty(Math.max(0, directStockQty - 1))}
                      className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700/80 hover:bg-rose-500 hover:text-white text-foreground font-black text-2xl flex items-center justify-center active:scale-95 transition-all border border-border shadow-xs shrink-0 btn-haptic"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={directStockQty}
                      onChange={(e) => setDirectStockQty(Math.max(0, Number(e.target.value) || 0))}
                      className="flex-1 bg-background border-2 border-primary/30 rounded-2xl h-12 text-center text-2xl font-black font-mono text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setDirectStockQty(directStockQty + 1)}
                      className="w-12 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-2xl flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 btn-haptic"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Rápido:</span>
                    {[1, 5, 10, 25, 50, 100].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setDirectStockQty(directStockQty + inc)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-primary/20 hover:text-primary text-xs font-black text-slate-700 dark:text-slate-300 border border-border/60 active:scale-95 transition-all btn-haptic"
                      >
                        +{inc}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input oculto que envía el stock final al handleSubmit */}
            <input type="hidden" name="stock_quantity" value={calculatedStock} />

            {/* PARTE INFERIOR: CONFIGURACIÓN DE PARÁMETROS, REORDEN Y ALMACÉN (Haciendo scroll) */}
            <div className="pt-2 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Parámetros de Reorden y Ubicación Física
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="min_stock"
                  label="Stock Mínimo (Alerta de Reorden)"
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
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
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
                  label="Ubicación en Bodega / Pasillo / Estante"
                  placeholder="Ej. Almacén 1 - Pasillo 4, Estante B"
                  defaultValue={editItem?.metadata?.location || ''}
                  icon={<MapPin size={18} />}
                />
              </div>

              <Input
                name="preferred_supplier_name"
                label="Proveedor Habitual Recomendado"
                placeholder="Ej. Distribuidora Central C.A."
                defaultValue={supplierName || editItem?.metadata?.preferred_supplier_name || ''}
                icon={<Building2 size={18} />}
              />
            </div>
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
              disabled={isLoading || isCompressingImage}
            >
              {isLoading ? 'Guardando...' : (editItem ? (itemType === 'service' ? 'Actualizar Servicio' : 'Actualizar Artículo') : (itemType === 'service' ? 'Guardar Servicio' : 'Guardar Artículo'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
