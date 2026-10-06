'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  Plus, 
  Stethoscope, 
  Clock, 
  Check, 
  X, 
  Edit3, 
  Save, 
  Sparkles, 
  Sliders,
  ShieldAlert,
  Layers,
  Sparkle
} from 'lucide-react';
import { DentalProcedureDefinition, DENTAL_PROCEDURES_MASTER } from '@/lib/dental/proceduresCatalog';
import { 
  quickUpdateItemPriceAction, 
  quickCreateModuleServiceAction, 
  saveModulePricingConfigAction 
} from '@/app/actions/modulePricing';
import type { DentalPricingConfig } from '@/lib/modulePricingDefaults';
import { ActionActor } from '@/app/actions/entities';
import { useToast } from '@/components/core/ToastProvider';

interface DentalPricingTabProps {
  procedures: any[];
  pricingConfig: DentalPricingConfig;
  onRefresh: () => void;
  tenantId: string;
  actor: ActionActor;
}

export function DentalPricingTab({
  procedures,
  pricingConfig,
  onRefresh,
  tenantId,
  actor
}: DentalPricingTabProps) {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Parámetros clínicos
  const [config, setConfig] = useState<DentalPricingConfig>(pricingConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modal nuevo procedimiento
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [newProcPrice, setNewProcPrice] = useState<string>('40');
  const [newProcCategory, setNewProcCategory] = useState<string>('ortodoncia');
  const [isCreating, setIsCreating] = useState(false);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'ortodoncia', label: 'Ortodoncia & Brackets' },
    { id: 'endodoncia', label: 'Endodoncia' },
    { id: 'periodoncia', label: 'Periodoncia' },
    { id: 'operatoria', label: 'Operatoria / Resinas' },
    { id: 'cirugia', label: 'Cirugía Oral' },
    { id: 'protesis', label: 'Prótesis & Coronas' },
    { id: 'preventiva', label: 'Preventiva / Limpieza' }
  ];

  // Procedimientos filtrados
  const displayList = procedures.length > 0 ? procedures : DENTAL_PROCEDURES_MASTER;

  const filteredProcedures = displayList.filter(p => {
    if (activeCategory === 'all') return true;
    const cat = (p.category || '').toLowerCase();
    return cat.includes(activeCategory);
  });

  const handleStartEditPrice = (proc: any) => {
    setEditingItemId(proc.id);
    setEditingPrice(Number(proc.base_price || proc.defaultCostUSD || proc.price || 0));
  };

  const handleSavePriceInline = async (proc: any) => {
    if (editingPrice < 0) {
      toast({ variant: 'error', title: 'Precio inválido', description: 'El precio no puede ser negativo.' });
      return;
    }

    setIsUpdatingPrice(true);
    try {
      const res = await quickUpdateItemPriceAction(
        proc.id,
        tenantId,
        Number(editingPrice),
        actor,
        {
          name: proc.name,
          category: proc.category || 'Odontología',
          type: 'service',
          metadata: {
            vertical: 'odontologia',
            category: proc.category
          }
        }
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Arancel actualizado', description: `${proc.name} ahora tiene un arancel de $${editingPrice}.` });
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
        'odontologia',
        config,
        actor
      );

      if (res.success) {
        toast({ 
          variant: 'success', 
          title: 'Aranceles base guardados', 
          description: 'La cuota mensual de ortodoncia y tarifas de especialidad han sido guardadas.' 
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

  const handleCreateProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcName.trim()) {
      toast({ variant: 'error', title: 'Campo requerido', description: 'Ingresa el nombre del procedimiento.' });
      return;
    }

    setIsCreating(true);
    try {
      const res = await quickCreateModuleServiceAction(
        tenantId,
        {
          name: newProcName.trim(),
          priceUSD: Number(newProcPrice) || 40,
          category: `Odontología - ${newProcCategory}`,
          moduleType: 'odontologia'
        },
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Procedimiento agregado', description: `${newProcName} añadido al baremo clínico.` });
        setIsNewModalOpen(false);
        setNewProcName('');
        setNewProcPrice('40');
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al crear', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Aranceles Base de Especialidades Odontológicas */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="font-black text-slate-900 dark:text-white">
                Aranceles Base de Especialidades Odontológicas
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tarifas por defecto para mensualidades de ortodoncia, brackets caídos y tratamientos endodónticos.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveGlobalConfig}
            disabled={isSavingConfig}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all self-end sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingConfig ? 'Guardando...' : 'Guardar Aranceles Base'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Mensualidad Ortodoncia */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Ortodoncia Mensual</span>
            <span className="text-[10px] text-slate-400 block mb-2">Control & cambio de arco</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-indigo-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.orthoMonthlyFeeUSD}
                onChange={(e) => setConfig({ ...config, orthoMonthlyFeeUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Reposición Bracket Caído */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Bracket Caído / Roto</span>
            <span className="text-[10px] text-slate-400 block mb-2">Recargo por pieza</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-indigo-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.bracketReplacementFeeUSD}
                onChange={(e) => setConfig({ ...config, bracketReplacementFeeUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Endodoncia por conducto */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Endodoncia / Conducto</span>
            <span className="text-[10px] text-slate-400 block mb-2">Base instrumentación</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-indigo-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.endoCanalBaseUSD}
                onChange={(e) => setConfig({ ...config, endoCanalBaseUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Periodoncia Tartrectomía */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Limpieza / Raspaje</span>
            <span className="text-[10px] text-slate-400 block mb-2">Profilaxis ultrasonido</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-indigo-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.perioCleaningBaseUSD}
                onChange={(e) => setConfig({ ...config, perioCleaningBaseUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Honorario Promedio Doctor */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">% Honorario Médico</span>
            <span className="text-[10px] text-slate-400 block mb-2">Liquidación por defecto</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="90"
                value={config.defaultDoctorCommissionPercent}
                onChange={(e) => setConfig({ ...config, defaultDoctorCommissionPercent: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
              <span className="text-xs font-bold text-indigo-600">%</span>
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
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsNewModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all self-end sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          + Nuevo Procedimiento
        </button>
      </div>

      {/* Grid de Procedimientos Odontológicos con Edición de Arancel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProcedures.map((proc: any) => {
          const isEditing = editingItemId === proc.id;
          const currentPrice = Number(proc.base_price || proc.defaultCostUSD || proc.price || 0);

          return (
            <div
              key={proc.id}
              className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                  {proc.category || 'Odontología'}
                </span>

                <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 leading-snug">
                  {proc.name}
                </h4>

                {proc.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {proc.description}
                  </p>
                )}
              </div>

              {/* Arancel y Edición Inline */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Arancel al Paciente
                  </span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-bold text-emerald-600">$</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={editingPrice}
                        onChange={(e) => setEditingPrice(Number(e.target.value))}
                        className="w-20 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-800 border border-emerald-500 rounded-lg text-slate-900 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePriceInline(proc)}
                        disabled={isUpdatingPrice}
                        className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                        title="Guardar arancel"
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
                      ${currentPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleStartEditPrice(proc)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 rounded-xl transition-colors"
                    title="Editar arancel"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nuevo Procedimiento */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-500" />
                Nuevo Procedimiento Odontológico
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProcedure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Nombre del Tratamiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Férula Miorrelajante Michigan / Plano de Mordida"
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Arancel Base ($ USD) *
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={newProcPrice}
                  onChange={(e) => setNewProcPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Especialidad / Categoría
                </label>
                <select
                  value={newProcCategory}
                  onChange={(e) => setNewProcCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="ortodoncia">Ortodoncia & Brackets</option>
                  <option value="endodoncia">Endodoncia Rotatoria</option>
                  <option value="periodoncia">Periodoncia & Enjuagues</option>
                  <option value="operatoria">Operatoria / Estética</option>
                  <option value="cirugia">Cirugía Oral & Maxilofacial</option>
                  <option value="protesis">Prótesis & Oclusión</option>
                  <option value="preventiva">Odontología Preventiva</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Guardando...' : 'Crear Procedimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
