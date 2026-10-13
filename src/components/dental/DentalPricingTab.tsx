'use client';

import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Plus, 
  Stethoscope, 
  Clock, 
  Check, 
  X, 
  Edit3, 
  Save, 
  Sliders,
  Trash2,
  Search,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react';
import { DentalProcedureDefinition, DENTAL_PROCEDURES_MASTER } from '@/lib/dental/proceduresCatalog';
import { 
  quickUpdateItemPriceAction, 
  quickCreateModuleServiceAction, 
  saveModulePricingConfigAction,
  quickUpdateModuleProcedureAction,
  toggleModuleProcedureStatusAction,
  deleteModuleProcedureAction
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Edición rápida inline de precio
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);

  // Parámetros clínicos globales
  const [config, setConfig] = useState<DentalPricingConfig>(pricingConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Modal nuevo procedimiento
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProcName, setNewProcName] = useState('');
  const [newProcPrice, setNewProcPrice] = useState<string>('40');
  const [newProcCategory, setNewProcCategory] = useState<string>('ortodoncia');
  const [newProcDuration, setNewProcDuration] = useState<number>(45);
  const [newProcDesc, setNewProcDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Modal edición completa de procedimiento
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProc, setEditingProc] = useState<{
    id: string;
    name: string;
    priceUSD: number;
    category: string;
    durationMin: number;
    description: string;
  } | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  // Procedimientos disponibles
  const displayList = procedures.length > 0 ? procedures : DENTAL_PROCEDURES_MASTER;

  const filteredProcedures = useMemo(() => {
    return displayList.filter(p => {
      // Filtro de activos / inactivos
      const isProcActive = p.is_active !== false;
      if (!showInactive && !isProcActive) return false;
      if (showInactive && isProcActive) return false;

      // Filtro por categoría
      if (activeCategory !== 'all') {
        const cat = (p.category || p.categoryLabel || '').toLowerCase();
        if (!cat.includes(activeCategory)) return false;
      }

      // Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(query);
        const matchesCat = (p.category || p.categoryLabel || '').toLowerCase().includes(query);
        const matchesDesc = (p.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesDesc) return false;
      }

      return true;
    });
  }, [displayList, showInactive, activeCategory, searchQuery]);

  const handleStartEditPrice = (proc: any) => {
    setEditingItemId(proc.id);
    setEditingPrice(Number(proc.base_price || proc.defaultPriceUSD || proc.defaultCostUSD || proc.price || 0));
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

  const handleOpenEditModal = (proc: any) => {
    setEditingProc({
      id: proc.id,
      name: proc.name,
      priceUSD: Number(proc.base_price || proc.defaultPriceUSD || proc.defaultCostUSD || proc.price || 0),
      category: proc.category || 'operatoria',
      durationMin: Number(proc.estimatedDurationMin || proc.metadata?.duration_minutes || 45),
      description: proc.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveFullEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProc || !editingProc.name.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await quickUpdateModuleProcedureAction(
        tenantId,
        editingProc.id,
        {
          name: editingProc.name.trim(),
          priceUSD: editingProc.priceUSD,
          category: editingProc.category,
          description: editingProc.description.trim(),
          durationMin: editingProc.durationMin,
          moduleType: 'odontologia',
        },
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: 'Procedimiento actualizado',
          description: `Se han guardado los cambios para "${editingProc.name}".`,
        });
        setIsEditModalOpen(false);
        setEditingProc(null);
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al actualizar', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleProcedureStatus = async (proc: any, newStatus: boolean) => {
    try {
      const res = await toggleModuleProcedureStatusAction(
        tenantId,
        {
          id: proc.id,
          name: proc.name,
          category: proc.category,
          base_price: Number(proc.base_price || proc.defaultPriceUSD || 0),
        },
        newStatus,
        actor
      );

      if (res.success) {
        toast({
          variant: 'success',
          title: newStatus ? 'Procedimiento Activado' : 'Procedimiento Quitado / Oculto',
          description: newStatus 
            ? `"${proc.name}" vuelve a estar disponible en el baremo y sillón.` 
            : `"${proc.name}" ha sido quitado del baremo clínico y no aparecerá en caja ni en sillón.`,
        });
        onRefresh();
      } else {
        toast({ variant: 'error', title: 'Error al cambiar estado', description: res.error });
      }
    } catch (err: any) {
      toast({ variant: 'error', title: 'Error', description: err.message });
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
          description: newProcDesc.trim() || undefined,
          durationMin: Number(newProcDuration) || 45,
          moduleType: 'odontologia'
        },
        actor
      );

      if (res.success) {
        toast({ variant: 'success', title: 'Procedimiento agregado', description: `${newProcName} añadido al baremo clínico.` });
        setIsNewModalOpen(false);
        setNewProcName('');
        setNewProcPrice('40');
        setNewProcDesc('');
        setNewProcDuration(45);
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
      <div className="bg-card border border-border p-5 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-teal-500" />
            <div>
              <h3 className="font-black text-foreground">
                Aranceles Base de Especialidades Odontológicas
              </h3>
              <p className="text-xs text-slate-500">
                Tarifas por defecto para mensualidades de ortodoncia, reposición de brackets y tratamientos endodónticos.
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveGlobalConfig}
            disabled={isSavingConfig}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition-all self-end sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingConfig ? 'Guardando...' : 'Guardar Aranceles Base'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Mensualidad Ortodoncia */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
            <span className="text-xs font-bold text-foreground block">Ortodoncia Mensual</span>
            <span className="text-[10px] text-slate-400 block mb-2">Control & cambio de arco</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-teal-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.orthoMonthlyFeeUSD}
                onChange={(e) => setConfig({ ...config, orthoMonthlyFeeUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          {/* Reposición Bracket Caído */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
            <span className="text-xs font-bold text-foreground block">Bracket Caído / Roto</span>
            <span className="text-[10px] text-slate-400 block mb-2">Recargo por pieza</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-teal-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.bracketReplacementFeeUSD}
                onChange={(e) => setConfig({ ...config, bracketReplacementFeeUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          {/* Endodoncia por conducto */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
            <span className="text-xs font-bold text-foreground block">Endodoncia / Conducto</span>
            <span className="text-[10px] text-slate-400 block mb-2">Base instrumentación</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-teal-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.endoCanalBaseUSD}
                onChange={(e) => setConfig({ ...config, endoCanalBaseUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          {/* Periodoncia Tartrectomía */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
            <span className="text-xs font-bold text-foreground block">Limpieza / Raspaje</span>
            <span className="text-[10px] text-slate-400 block mb-2">Profilaxis ultrasonido</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-teal-600">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={config.perioCleaningBaseUSD}
                onChange={(e) => setConfig({ ...config, perioCleaningBaseUSD: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-border rounded-lg text-foreground"
              />
            </div>
          </div>

          {/* Honorario Promedio Doctor */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
            <span className="text-xs font-bold text-foreground block">% Honorario Médico</span>
            <span className="text-[10px] text-slate-400 block mb-2">Liquidación sugerida</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="10"
                max="90"
                value={config.defaultDoctorCommissionPercent}
                onChange={(e) => setConfig({ ...config, defaultDoctorCommissionPercent: Number(e.target.value) })}
                className="w-full px-2 py-1 text-sm font-black bg-white dark:bg-slate-900 border border-border rounded-lg text-foreground"
              />
              <span className="text-xs font-bold text-teal-600">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cabecera de Catálogo, Filtros & Búsqueda */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Barra de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar procedimiento por nombre o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl border border-border bg-card text-foreground text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Toggle Activos / Inactivos */}
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                showInactive
                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  : 'bg-card text-slate-500 border-border hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {showInactive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showInactive ? 'Viendo Procedimientos Quitados' : 'Ver Procedimientos Quitados'}</span>
            </button>

            {/* Botón Nuevo Procedimiento */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Procedimiento</span>
            </button>
          </div>
        </div>

        {/* Categorías */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-card text-slate-600 dark:text-slate-300 border border-border hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Procedimientos Odontológicos con Edición de Arancel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProcedures.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-card border border-border rounded-3xl p-8">
            <Stethoscope className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-bold text-foreground">No se encontraron procedimientos</p>
            <p className="text-xs text-slate-500 mt-1">
              {showInactive 
                ? 'No hay ningún procedimiento quitado u oculto en esta categoría.' 
                : 'Intenta cambiar el término de búsqueda o crea uno nuevo con el botón superior.'}
            </p>
          </div>
        ) : (
          filteredProcedures.map((proc: any) => {
            const isEditing = editingItemId === proc.id;
            const currentPrice = Number(proc.base_price || proc.defaultPriceUSD || proc.defaultCostUSD || proc.price || 0);
            const isProcActive = proc.is_active !== false;

            return (
              <div
                key={proc.id}
                className={`p-4 bg-card rounded-2xl border transition-all shadow-sm flex flex-col justify-between ${
                  isProcActive 
                    ? 'border-border hover:border-teal-500/50' 
                    : 'border-dashed border-rose-500/40 opacity-70 bg-rose-500/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                      {proc.categoryLabel || proc.category || 'Odontología'}
                    </span>
                    {proc.estimatedDurationMin && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {proc.estimatedDurationMin}m
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-sm text-foreground leading-snug">
                    {proc.name}
                  </h4>

                  {proc.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {proc.description}
                    </p>
                  )}
                </div>

                {/* Arancel, Edición Inline y Acciones */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
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
                          className="w-20 px-2 py-1 text-sm font-bold bg-white dark:bg-slate-800 border border-emerald-500 rounded-lg text-foreground"
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
                      <span className="text-lg font-black text-foreground">
                        ${currentPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-1">
                      {/* Botón Edición Rápida Precio */}
                      <button
                        onClick={() => handleStartEditPrice(proc)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-600 rounded-xl transition-colors"
                        title="Editar precio rápido"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>

                      {/* Botón Edición Completa */}
                      <button
                        onClick={() => handleOpenEditModal(proc)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-600 rounded-xl transition-colors"
                        title="Editar datos del procedimiento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Botón Quitar / Restaurar */}
                      {isProcActive ? (
                        <button
                          onClick={() => handleToggleProcedureStatus(proc, false)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-xl transition-colors"
                          title="Quitar / Desactivar este procedimiento del baremo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleToggleProcedureStatus(proc, true)}
                          className="p-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 rounded-xl transition-colors"
                          title="Reactivar procedimiento"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nuevo Procedimiento */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-teal-500" />
                Nuevo Procedimiento Odontológico
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProcedure} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Nombre del Tratamiento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Férula Miorrelajante Michigan / Plano de Mordida"
                  value={newProcName}
                  onChange={(e) => setNewProcName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Arancel ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={newProcPrice}
                    onChange={(e) => setNewProcPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Duración (Minutos)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    value={newProcDuration}
                    onChange={(e) => setNewProcDuration(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Especialidad / Categoría
                </label>
                <select
                  value={newProcCategory}
                  onChange={(e) => setNewProcCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
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

              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Descripción Clínica (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre instrumental, insumos o recomendaciones..."
                  value={newProcDesc}
                  onChange={(e) => setNewProcDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-foreground rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? 'Guardando...' : 'Crear Procedimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edición Completa de Procedimiento */}
      {isEditModalOpen && editingProc && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-card rounded-3xl p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-black text-foreground flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-500" />
                Editar Procedimiento Odontológico
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-foreground rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFullEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Nombre del Tratamiento *
                </label>
                <input
                  type="text"
                  required
                  value={editingProc.name}
                  onChange={(e) => setEditingProc({ ...editingProc, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Arancel ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={editingProc.priceUSD}
                    onChange={(e) => setEditingProc({ ...editingProc, priceUSD: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Duración (Minutos)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="10"
                    value={editingProc.durationMin}
                    onChange={(e) => setEditingProc({ ...editingProc, durationMin: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Especialidad / Categoría
                </label>
                <select
                  value={editingProc.category}
                  onChange={(e) => setEditingProc({ ...editingProc, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-sm focus:border-teal-500 focus:outline-none"
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

              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Descripción Clínica
                </label>
                <textarea
                  rows={2}
                  value={editingProc.description}
                  onChange={(e) => setEditingProc({ ...editingProc, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-slate-50 dark:bg-slate-950 text-foreground text-xs focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-foreground rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-md shadow-teal-600/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
