'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  Dog, 
  Clock, 
  Check, 
  X, 
  Edit3, 
  Save, 
  Sparkles, 
  Scissors, 
  Droplets,
  Sliders,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { GroomingServiceDefinition } from '@/lib/grooming/groomingCatalog';
import { 
  quickUpdateItemPriceAction, 
  quickCreateModuleServiceAction, 
  saveModulePricingConfigAction 
} from '@/app/actions/modulePricing';
import type { GroomingPricingConfig } from '@/lib/modulePricingDefaults';
import { ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

interface GroomingPricingTabProps {
  services: GroomingServiceDefinition[];
  pricingConfig: GroomingPricingConfig;
  onRefresh: () => void;
  tenantId: string;
  actor: ActionActor;
}

export function GroomingPricingTab({
  services,
  pricingConfig,
  onRefresh,
  tenantId,
  actor
}: GroomingPricingTabProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Matriz de tamaños y suplementos
  const [config, setConfig] = useState<GroomingPricingConfig>(pricingConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modal nuevo servicio
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<string>('20');
  const [newServiceCategory, setNewServiceCategory] = useState<'bano' | 'corte' | 'spa' | 'suplemento' | 'retail'>('corte');
  const [newServiceDuration, setNewServiceDuration] = useState<string>('40');
  const [isCreatingService, setIsCreatingService] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'bano', label: 'Baños Especiales' },
    { id: 'corte', label: 'Cortes & Razas' },
    { id: 'spa', label: 'Spa & Tratamientos' },
    { id: 'suplemento', label: 'Suplementos' },
    { id: 'retail', label: 'Pet Shop' }
  ];

  const filteredServices = services.filter(s => {
    if (activeCategory === 'all') return true;
    return s.category === activeCategory;
  });

  const handleStartEditPrice = (service: GroomingServiceDefinition) => {
    setEditingItemId(service.id);
    setEditingPrice(service.defaultPriceUSD);
  };

  const handleSavePriceInline = async (service: GroomingServiceDefinition) => {
    if (editingPrice < 0) {
      toast({ variant: 'error', title: 'Precio inválido', description: 'El precio no puede ser negativo.' });
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const res = await quickUpdateItemPriceAction(
        service.id,
        tenantId,
        Number(editingPrice),
        actor,
        {
          name: service.name,
          category: service.categoryLabel,
          type: service.category === 'retail' ? 'product' : 'service',
          metadata: {
            vertical: 'grooming',
            durationMin: service.durationMin,
            code: service.code
          }
        }
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Tarifa actualizada', description: `${service.name} ahora cuesta $${editingPrice}.` });
        setEditingItemId(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleSaveGlobalConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await saveModulePricingConfigAction(
        tenantId,
        'grooming',
        config,
        actor
      );

      if (res.success) {
        toast({ 
          variant: 'success', 
          title: 'Matriz guardada', 
          description: 'Las tarifas por tamaño y suplementos de peluquería canina han sido actualizadas.' 
        });
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al guardar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleCreateNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) {
      toast({ variant: 'error', title: 'Campo requerido', description: 'Ingresa el nombre del servicio.' });
      return;
    }

    setIsCreatingService(true);
    try {
      const res = await quickCreateModuleServiceAction(
        tenantId,
        {
          name: newServiceName.trim(),
          priceUSD: Number(newServicePrice) || 20,
          category: newServiceCategory === 'retail' ? 'Pet Shop' : 'Servicio Canino',
          durationMin: Number(newServiceDuration) || 40,
          moduleType: 'grooming'
        },
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Servicio creado', description: `${newServiceName} agregado al catálogo.` });
        setIsNewServiceModalOpen(false);
        setNewServiceName('');
        setNewServicePrice('20');
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al crear', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsCreatingService(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Matriz de Tarifas por Tamaño de Mascota */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-500" />
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">
                Matriz de Precios Base por Tamaño de Mascota
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tarifas base aplicadas automáticamente al ingresar la mascota al salón.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveGlobalConfig}
            disabled={isSavingConfig}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/20 transition-all self-end sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingConfig ? 'Guardando...' : 'Guardar Matriz & Suplementos'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Toy */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Toy (&lt; 4kg)</span>
            <span className="text-[10px] text-slate-400 block mb-2">Chihuahua, Poodle Toy</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-cyan-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.sizeBasePrices.toy}
                onChange={(e) => setConfig({
                  ...config,
                  sizeBasePrices: { ...config.sizeBasePrices, toy: Number(e.target.value) }
                })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Small */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Pequeño (4 - 10kg)</span>
            <span className="text-[10px] text-slate-400 block mb-2">Shih Tzu, Schnauzer mini</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-cyan-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.sizeBasePrices.small}
                onChange={(e) => setConfig({
                  ...config,
                  sizeBasePrices: { ...config.sizeBasePrices, small: Number(e.target.value) }
                })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Medium */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Mediano (10 - 25kg)</span>
            <span className="text-[10px] text-slate-400 block mb-2">Cocker, French Bulldog</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-cyan-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.sizeBasePrices.medium}
                onChange={(e) => setConfig({
                  ...config,
                  sizeBasePrices: { ...config.sizeBasePrices, medium: Number(e.target.value) }
                })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Large */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Grande (25 - 45kg)</span>
            <span className="text-[10px] text-slate-400 block mb-2">Golden, Pastor Alemán</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-cyan-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.sizeBasePrices.large}
                onChange={(e) => setConfig({
                  ...config,
                  sizeBasePrices: { ...config.sizeBasePrices, large: Number(e.target.value) }
                })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Giant */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Gigante (&gt; 45kg)</span>
            <span className="text-[10px] text-slate-400 block mb-2">San Bernardo, Gran Danés</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-cyan-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.sizeBasePrices.giant}
                onChange={(e) => setConfig({
                  ...config,
                  sizeBasePrices: { ...config.sizeBasePrices, giant: Number(e.target.value) }
                })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* 2. Suplementos por Condición Clínica */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">
            Tarifas de Suplementos por Condición de Entrada
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Nudos Severos</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.matting}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, matting: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Antipulgas</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.tickFlea}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, tickFlea: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Corte Uñas</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.nails}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, nails: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Limpieza Oídos</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.ears}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, ears: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Cepillado Dental</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.teeth}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, teeth: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">Perro Reactivo</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-cyan-600">$</span>
                <input
                  type="number"
                  min="0"
                  value={config.supplementPrices.reactiveFee}
                  onChange={(e) => setConfig({
                    ...config,
                    supplementPrices: { ...config.supplementPrices, reactiveFee: Number(e.target.value) }
                  })}
                  className="w-full px-1.5 py-0.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cabecera de Catálogo & Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsNewServiceModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/20 transition-all self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Nuevo Servicio / Pet Shop
        </button>
      </div>

      {/* Grid de Servicios con Edición de Precio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((service) => {
          const isEditing = editingItemId === service.id;

          return (
            <div
              key={service.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-700/60 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: service.color }} />
                    <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">
                      {service.categoryLabel}
                    </span>
                  </div>
                  {service.durationMin > 0 && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" />
                      {service.durationMin} min
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1.5 leading-snug">
                  {service.name}
                </h4>

                {service.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {service.description}
                  </p>
                )}
              </div>

              {/* Precio y Edición Inline */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Tarifa al Público
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-bold text-emerald-600">$</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-800 border border-emerald-500 rounded-lg text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePriceInline(service)}
                        disabled={isUpdatingPrice}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        title="Guardar precio"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingItemId(null)}
                        className="p-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      ${service.defaultPriceUSD.toFixed(2)}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleStartEditPrice(service)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-cyan-500 rounded-xl transition-colors"
                    title="Editar tarifa"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuevo Servicio */}
      {isNewServiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Dog className="w-5 h-5 text-cyan-500" />
                Nuevo Servicio de Peluquería Canina
              </h3>
              <button
                onClick={() => setIsNewServiceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewService} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre del Tratamiento o Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Baño de Ozonoterapia & Hidratación Argan"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Precio ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newServicePrice}
                    onChange={(e) => setNewServicePrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Duración (min)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={newServiceDuration}
                    onChange={(e) => setNewServiceDuration(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Categoría
                </label>
                <select
                  value={newServiceCategory}
                  onChange={(e) => setNewServiceCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-cyan-500 focus:outline-none"
                >
                  <option value="bano">Baño Especial / Shampoo Medicado</option>
                  <option value="corte">Corte & Estilizado de Raza</option>
                  <option value="spa">Tratamiento de Spa / Ozonoterapia</option>
                  <option value="suplemento">Suplemento Condición Especial</option>
                  <option value="retail">Producto Pet Shop</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingService}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs shadow-md shadow-cyan-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isCreatingService ? 'Guardando...' : 'Crear Servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
