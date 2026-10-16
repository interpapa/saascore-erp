'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Factory, 
  FlaskConical, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Layers, 
  DollarSign, 
  Scale, 
  ArrowRight, 
  RefreshCw, 
  Play, 
  Check, 
  X, 
  History, 
  Trash2, 
  Sliders, 
  Edit3, 
  Box, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight,
  TrendingUp,
  Percent
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { useActionActor } from '@/hooks/useActionActor';
import { useToast } from '@/components/core/ToastProvider';
import { ActionActor } from '@/app/actions/entities';
import { getItemsAction } from '@/app/actions/items';
import { 
  getRecipesAction, 
  saveRecipeAction, 
  deleteRecipeAction, 
  simulateProductionStockAction, 
  executeProductionOrderAction, 
  getProductionOrdersAction 
} from '@/app/actions/production';
import { 
  Recipe, 
  RecipeIngredient, 
  RecipeExtraCost, 
  ProductionOrder, 
  SimulateStockResult, 
  ProductionUnit 
} from '@/types/production';

const UNIT_LABELS: Record<ProductionUnit, string> = {
  g: 'Gramos (g)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (L)',
  unit: 'Unidades',
  oz: 'Onzas (oz)',
  lb: 'Libras (lb)'
};

export default function ProduccionPage() {
  const currentTenant = useTenantResolver();
  const actor = useActionActor();
  const { toast } = useToast();

  const showToast = useCallback((title: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    toast({ title, variant });
  }, [toast]);

  const [activeTab, setActiveTab] = useState<'recipes' | 'manufacture' | 'history'>('recipes');
  const [loading, setLoading] = useState<boolean>(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Estados de Fabricación
  const [selectedRecipeToProduce, setSelectedRecipeToProduce] = useState<Recipe | null>(null);
  const [batchesToProduce, setBatchesToProduce] = useState<number>(1);
  const [operatorName, setOperatorName] = useState<string>('');
  const [productionNotes, setProductionNotes] = useState<string>('');
  const [simulatedStock, setSimulatedStock] = useState<SimulateStockResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Estados de Modal Receta
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState<boolean>(false);
  const [editingRecipe, setEditingRecipe] = useState<Partial<Recipe>>({
    name: '',
    description: '',
    finished_product_name: '',
    batch_yield: 10,
    yield_unit: 'unidades',
    ingredients: [],
    extra_costs: [],
    suggested_sale_price: 0,
    waste_percentage: 0,
    shelf_life_days: undefined
  });

  const [processing, setProcessing] = useState<boolean>(false);

  // Cargar datos
  const loadData = useCallback(async () => {
    if (!currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setLoading(true);

    try {
      const [recipesRes, ordersRes, itemsRes] = await Promise.all([
        getRecipesAction(currentTenant.id, safeActor),
        getProductionOrdersAction(currentTenant.id, safeActor),
        getItemsAction(currentTenant.id, undefined, 200, safeActor)
      ]);

      if (recipesRes.success) setRecipes(recipesRes.recipes);
      if (ordersRes.success) setProductionOrders(ordersRes.orders);
      if (itemsRes.success) setInventoryItems(itemsRes.items || []);

      if (recipesRes.recipes.length > 0 && !selectedRecipeToProduce) {
        setSelectedRecipeToProduce(recipesRes.recipes[0]);
      }
    } catch (err) {
      console.error(err);
      showToast('Error cargando datos de producción', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTenant?.id, actor, selectedRecipeToProduce, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Simulación de stock cuando cambia la receta o la cantidad de lotes
  useEffect(() => {
    if (!selectedRecipeToProduce || !currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };

    let isMounted = true;
    setIsSimulating(true);

    simulateProductionStockAction(currentTenant.id, selectedRecipeToProduce.id, batchesToProduce, safeActor)
      .then(res => {
        if (isMounted && res.success && res.result) {
          setSimulatedStock(res.result);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setIsSimulating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedRecipeToProduce, batchesToProduce, currentTenant?.id, actor]);

  // KPIs
  const stats = useMemo(() => {
    const totalRecipes = recipes.length;
    const totalOrders = productionOrders.length;
    const totalUnitsProduced = productionOrders.reduce((acc, o) => acc + (o.total_units_produced || 0), 0);
    const totalCostProduced = productionOrders.reduce((acc, o) => acc + (o.total_cost || 0), 0);

    return { totalRecipes, totalOrders, totalUnitsProduced, totalCostProduced };
  }, [recipes, productionOrders]);

  // Ejecutar orden de producción (fabricar y descontar stock)
  const handleExecuteProduction = async () => {
    if (!selectedRecipeToProduce || !currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await executeProductionOrderAction(
        currentTenant.id,
        {
          recipeId: selectedRecipeToProduce.id,
          batches: batchesToProduce,
          operatorName: operatorName.trim() || undefined,
          notes: productionNotes.trim() || undefined
        },
        safeActor
      );

      if (res.success && res.order) {
        showToast(
          `¡Lote fabricado exitosamente! Se agregaron ${res.order.total_units_produced} unidades a "${res.order.finished_product_name}" y se descontaron las materias primas.`,
          'success'
        );
        setProductionNotes('');
        loadData();
        setActiveTab('history');
      } else {
        showToast(res.error || 'Error al ejecutar orden de fabricación', 'error');
      }
    } catch {
      showToast('Ocurrió un error inesperado al fabricar', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Abrir modal para crear nueva receta
  const handleOpenNewRecipe = () => {
    setEditingRecipe({
      name: '',
      description: '',
      finished_product_name: '',
      batch_yield: 10,
      yield_unit: 'unidades',
      ingredients: [
        {
          raw_material_id: `raw-${Date.now()}`,
          raw_material_name: '',
          quantity: 100,
          unit: 'g',
          unit_cost: 0.01,
          total_cost: 1.00
        }
      ],
      extra_costs: [
        { id: `ext-${Date.now()}`, concept: 'Empaque / Frasco / Envoltorio', amount: 1.50 }
      ],
      suggested_sale_price: 5.00
    });
    setIsRecipeModalOpen(true);
  };

  // Abrir modal para editar receta existente
  const handleOpenEditRecipe = (recipe: Recipe) => {
    setEditingRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients],
      extra_costs: [...recipe.extra_costs]
    });
    setIsRecipeModalOpen(true);
  };

  // Agregar ingrediente al formulario de receta
  const handleAddIngredientRow = () => {
    setEditingRecipe(prev => ({
      ...prev,
      ingredients: [
        ...(prev.ingredients || []),
        {
          raw_material_id: `raw-${Date.now()}`,
          raw_material_name: '',
          quantity: 100,
          unit: 'g',
          unit_cost: 0.01,
          total_cost: 1.00
        }
      ]
    }));
  };

  // Modificar ingrediente en el formulario
  const handleUpdateIngredient = (index: number, field: keyof RecipeIngredient, value: any) => {
    setEditingRecipe(prev => {
      const updated = [...(prev.ingredients || [])];
      const target = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'unit_cost') {
        const qty = field === 'quantity' ? Number(value) : Number(target.quantity);
        const cost = field === 'unit_cost' ? Number(value) : Number(target.unit_cost);
        target.total_cost = Math.round(qty * cost * 1000) / 1000;
      }

      updated[index] = target;
      return { ...prev, ingredients: updated };
    });
  };

  // Quitar ingrediente
  const handleRemoveIngredient = (index: number) => {
    setEditingRecipe(prev => ({
      ...prev,
      ingredients: (prev.ingredients || []).filter((_, i) => i !== index)
    }));
  };

  // Agregar costo extra al formulario
  const handleAddExtraCostRow = () => {
    setEditingRecipe(prev => ({
      ...prev,
      extra_costs: [
        ...(prev.extra_costs || []),
        { id: `ext-${Date.now()}`, concept: '', amount: 1.00 }
      ]
    }));
  };

  // Modificar costo extra
  const handleUpdateExtraCost = (index: number, field: keyof RecipeExtraCost, value: any) => {
    setEditingRecipe(prev => {
      const updated = [...(prev.extra_costs || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, extra_costs: updated };
    });
  };

  // Quitar costo extra
  const handleRemoveExtraCost = (index: number) => {
    setEditingRecipe(prev => ({
      ...prev,
      extra_costs: (prev.extra_costs || []).filter((_, i) => i !== index)
    }));
  };

  // Guardar receta
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecipe.name || !editingRecipe.finished_product_name || !currentTenant?.id) {
      showToast('Completa el nombre de la fórmula y del producto terminado', 'warning');
      return;
    }
    if (!editingRecipe.ingredients || editingRecipe.ingredients.length === 0) {
      showToast('Añade al menos un ingrediente o insumo', 'warning');
      return;
    }

    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };
    setProcessing(true);

    try {
      const res = await saveRecipeAction(
        currentTenant.id,
        {
          id: editingRecipe.id,
          name: editingRecipe.name,
          description: editingRecipe.description,
          finished_product_id: editingRecipe.finished_product_id || `prod-${Date.now()}`,
          finished_product_name: editingRecipe.finished_product_name,
          batch_yield: Number(editingRecipe.batch_yield) || 1,
          yield_unit: editingRecipe.yield_unit || 'unidades',
          ingredients: editingRecipe.ingredients,
          extra_costs: editingRecipe.extra_costs || [],
          suggested_sale_price: Number(editingRecipe.suggested_sale_price) || undefined,
          waste_percentage: Number(editingRecipe.waste_percentage) || 0,
          shelf_life_days: editingRecipe.shelf_life_days ? Number(editingRecipe.shelf_life_days) : undefined,
          notes: editingRecipe.notes
        },
        safeActor
      );

      if (res.success) {
        showToast('Fórmula guardada correctamente', 'success');
        setIsRecipeModalOpen(false);
        loadData();
      } else {
        showToast(res.error || 'Error al guardar la fórmula', 'error');
      }
    } catch {
      showToast('Ocurrió un error al guardar la fórmula', 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Eliminar receta
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta receta? No afectará los productos ya fabricados.')) return;
    if (!currentTenant?.id) return;
    const safeActor: ActionActor = actor || { email: 'admin@rendo.com', role: 'owner' };

    try {
      const res = await deleteRecipeAction(currentTenant.id, recipeId, safeActor);
      if (res.success) {
        showToast('Receta eliminada con éxito', 'success');
        loadData();
      } else {
        showToast(res.error || 'Error al eliminar receta', 'error');
      }
    } catch {
      showToast('Ocurrió un error', 'error');
    }
  };

  // Cálculo en vivo del costo del modal
  const computedRecipeModalCosts = useMemo(() => {
    const ings = (editingRecipe.ingredients || []).reduce((acc, i) => acc + (Number(i.total_cost) || 0), 0);
    const extras = (editingRecipe.extra_costs || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const total = Math.round((ings + extras) * 1000) / 1000;
    const batchYield = Number(editingRecipe.batch_yield) || 1;
    const unitCost = Math.round((total / batchYield) * 1000) / 1000;
    const salePrice = Number(editingRecipe.suggested_sale_price) || unitCost * 1.5;
    const marginPercent = salePrice > 0 ? Math.round(((salePrice - unitCost) / salePrice) * 100) : 0;

    return { total, unitCost, salePrice, marginPercent };
  }, [editingRecipe.ingredients, editingRecipe.extra_costs, editingRecipe.batch_yield, editingRecipe.suggested_sale_price]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-4 md:p-6 lg:p-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Factory className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Producción & Recetas (MRP)</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formulación de productos, escandallo de costos, simulación de stock y órdenes de fabricación
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-amber-600 transition"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenNewRecipe}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-amber-500 transition shadow-sm"
          >
            <FlaskConical className="w-4 h-4 text-amber-500" />
            <span>Nueva Fórmula / BOM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manufacture')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold transition shadow-sm"
          >
            <Play className="w-4 h-4" />
            <span>Fabricar Lote</span>
          </button>
        </div>
      </div>

      {/* TARJETAS DE KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Fórmulas Diseñadas</span>
            <FlaskConical className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight">{stats.totalRecipes}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Recetas maestras (BOM)</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/20 shadow-sm">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-medium mb-1">
            <span>Lotes Fabricados</span>
            <Factory className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats.totalOrders}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Órdenes completadas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-1">
            <span>Unidades Producidas</span>
            <Package className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.totalUnitsProduced}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Disponibles para venta POS</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-500/20 shadow-sm">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-1">
            <span>Costo Total Invertido</span>
            <DollarSign className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            ${stats.totalCostProduced.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Materia prima y extras</p>
        </div>
      </div>

      {/* PESTAÑAS */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('recipes')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'recipes'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>Fórmulas & Recetas ({recipes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manufacture')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'manufacture'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Factory className="w-4 h-4" />
          <span>Fabricar Lote (Simulador de Stock)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'history'
              ? 'border-amber-600 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Lotes ({productionOrders.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: LISTA DE RECETAS */}
      {activeTab === 'recipes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map(recipe => (
              <div
                key={recipe.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        Rinde {recipe.batch_yield} {recipe.yield_unit}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-1">{recipe.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{recipe.description || 'Sin notas.'}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditRecipe(recipe)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Editar fórmula"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(recipe.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Eliminar fórmula"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Resumen de Insumos */}
                  <div className="my-3 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Materias Primas ({recipe.ingredients.length})</span>
                      <span>Total: ${(recipe.total_batch_cost - (recipe.extra_costs?.reduce((a,b)=>a+b.amount,0)||0)).toFixed(2)}</span>
                    </div>
                    {recipe.ingredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span className="truncate pr-2">• {ing.raw_material_name} ({ing.quantity} {ing.unit})</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">${Number(ing.total_cost).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Costos Extras si existen */}
                  {recipe.extra_costs && recipe.extra_costs.length > 0 && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/20 text-xs text-slate-500 flex items-center justify-between">
                      <span>Empaque / Mano de Obra:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        +${recipe.extra_costs.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Costeo Unitario & Margen */}
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Costo Lote</div>
                      <div className="text-base font-bold text-slate-800 dark:text-slate-100">${recipe.total_batch_cost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Costo Unitario</div>
                      <div className="text-base font-black text-amber-600 dark:text-amber-400">${recipe.unit_production_cost.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">PVP Sugerido</div>
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        ${recipe.suggested_sale_price ? recipe.suggested_sale_price.toFixed(2) : (recipe.unit_production_cost * 1.5).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    Genera: <strong className="text-slate-700 dark:text-slate-300">{recipe.finished_product_name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecipeToProduce(recipe);
                      setBatchesToProduce(1);
                      setActiveTab('manufacture');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Fabricar Lote</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA 2: FABRICAR LOTE & SIMULADOR DE STOCK */}
      {activeTab === 'manufacture' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* PANEL IZQUIERDO: CONFIGURADOR DE FABRICACIÓN */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Factory className="w-5 h-5 text-amber-500" />
                <span>Configurar Orden de Fabricación</span>
              </h3>

              {/* Selector de Receta */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Selecciona la Fórmula a Producir *
                </label>
                <select
                  value={selectedRecipeToProduce?.id || ''}
                  onChange={e => {
                    const found = recipes.find(r => r.id === e.target.value);
                    if (found) setSelectedRecipeToProduce(found);
                  }}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {recipes.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name} (Rinde {r.batch_yield} {r.yield_unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Número de Lotes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cantidad de Lotes a Fabricar
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={batchesToProduce}
                    onChange={e => setBatchesToProduce(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-amber-600 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 5, 10].map(b => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setBatchesToProduce(b)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                          batchesToProduce === b
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {b}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Operador y Notas */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Operador / Responsable
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Maestro Jabonero / Chef Pastelero"
                    value={operatorName}
                    onChange={e => setOperatorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observaciones del Lote
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Condiciones ambientales, fecha de caducidad estimada..."
                    value={productionNotes}
                    onChange={e => setProductionNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Resumen Proyectado de Salida */}
              {selectedRecipeToProduce && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/20 space-y-2">
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span>Resultado al Fabricar:</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Producto a incrementar:</span>
                    <strong className="text-slate-800 dark:text-slate-100">{selectedRecipeToProduce.finished_product_name}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Stock a ingresar:</span>
                    <strong className="text-emerald-600 font-bold text-sm">
                      +{selectedRecipeToProduce.batch_yield * batchesToProduce} {selectedRecipeToProduce.yield_unit}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Costo total de producción:</span>
                    <strong className="text-slate-900 dark:text-white font-bold">
                      ${(selectedRecipeToProduce.total_batch_cost * batchesToProduce).toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Botón de Ejecutar Fabricación */}
              <button
                type="button"
                disabled={processing || isSimulating || !selectedRecipeToProduce}
                onClick={handleExecuteProduction}
                className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Fabricando y Descontando Stock...</span>
                  </>
                ) : (
                  <>
                    <Factory className="w-4 h-4" />
                    <span>Fabricar y Descontar Inventario</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* PANEL DERECHO: SIMULADOR VISUAL DE STOCK DE INSUMOS */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-500" />
                    <span>Simulador de Stock de Materias Primas</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comprobación en tiempo real antes de descontar del inventario
                  </p>
                </div>

                {simulatedStock && (
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                    simulatedStock.canProduce
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
                  }`}>
                    {simulatedStock.canProduce ? '✓ Stock Suficiente' : `⚠ Máx. ${simulatedStock.maxBatchesPossible} lotes`}
                  </div>
                )}
              </div>

              {isSimulating ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <p className="text-xs">Consultando almacén de inventario...</p>
                </div>
              ) : !simulatedStock ? (
                <div className="py-12 text-center text-slate-400">
                  <Scale className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Selecciona una receta para simular existencias.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {!simulatedStock.canProduce && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        No hay suficiente stock de todos los insumos para {batchesToProduce} lote(s). Puedes fabricar hasta{' '}
                        <strong>{simulatedStock.maxBatchesPossible} lote(s)</strong> con el inventario actual.
                      </span>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {simulatedStock.ingredientsStatus.map((ing, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                            {ing.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Requerido: <span className="font-medium text-slate-700 dark:text-slate-300">{ing.needed} {ing.unit}</span> | Disponible: <span className="font-medium text-slate-700 dark:text-slate-300">{ing.available} {ing.unit}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          {ing.hasEnough ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Disponible</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-4 h-4" />
                              <span>Faltan {ing.missing} {ing.unit}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: HISTORIAL DE LOTES FABRICADOS */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          {productionOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 opacity-40 text-amber-500" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-200">No hay órdenes de producción ejecutadas</h3>
              <p className="text-xs text-slate-400 mt-1">Cuando fabriques lotes, quedará aquí la bitácora completa con los insumos consumidos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Orden / Lote</th>
                    <th className="py-3 px-4">Fórmula & Producto Creado</th>
                    <th className="py-3 px-4">Lotes & Unidades</th>
                    <th className="py-3 px-4">Costo Total</th>
                    <th className="py-3 px-4">Costo Unit.</th>
                    <th className="py-3 px-4">Fecha & Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {productionOrders.map(order => (
                    <tr key={order.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400 block">
                          {order.order_number}
                        </span>
                        {order.lot_number && (
                          <span className="inline-block px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-mono text-[10px] font-bold mt-0.5">
                            🏷️ {order.lot_number}
                          </span>
                        )}
                        {order.expiry_date && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Vence: <strong className="text-foreground">{order.expiry_date}</strong>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">{order.finished_product_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">Fórmula: {order.recipe_name}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          +{order.total_units_produced} unidades
                        </span>
                        <div className="text-[10px] text-slate-400">({order.batches_produced} lote(s))</div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ${order.total_cost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                        ${order.unit_cost.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-700 dark:text-slate-200">{order.produced_at.slice(0, 10)}</div>
                        <div className="text-[10px] text-slate-400">{order.operator_name || 'Admin'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL: CREAR / EDITAR RECETA (BOM) ─────────────────────────────── */}
      {isRecipeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{editingRecipe.id ? 'Editar Fórmula (BOM)' : 'Nueva Fórmula de Producción'}</h3>
                  <p className="text-xs text-slate-400">Define los insumos y costos unitarios de tu producto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="mt-4 space-y-4">
              {/* Datos Generales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre de la Fórmula *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Jabón de Avena & Miel / Torta Vainilla"
                    value={editingRecipe.name || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Producto Final Terminado *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombre del ítem que ingresará al inventario"
                    value={editingRecipe.finished_product_name || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, finished_product_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rendimiento por Lote *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingRecipe.batch_yield || 1}
                    onChange={e => setEditingRecipe({ ...editingRecipe, batch_yield: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Unidad de Rendimiento
                  </label>
                  <input
                    type="text"
                    placeholder="unidades, barras, porciones"
                    value={editingRecipe.yield_unit || 'unidades'}
                    onChange={e => setEditingRecipe({ ...editingRecipe, yield_unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    PVP Sugerido ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Precio de venta"
                    value={editingRecipe.suggested_sale_price || ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, suggested_sale_price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              {/* Parámetros Avanzados MRP: % Merma y Vida Útil */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    % Merma / Desperdicio Estimado
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    placeholder="Ej: 5 (5% merma)"
                    value={editingRecipe.waste_percentage ?? ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, waste_percentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Infla los insumos necesarios para cubrir merma/recorte</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vida Útil / Caducidad (Días)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 180 (días hasta caducidad)"
                    value={editingRecipe.shelf_life_days ?? ''}
                    onChange={e => setEditingRecipe({ ...editingRecipe, shelf_life_days: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">Genera fecha de caducidad automática para el lote</span>
                </div>
              </div>

              {/* Materias Primas / Ingredientes */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Materias Primas & Insumos ({editingRecipe.ingredients?.length || 0})
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Insumo</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(editingRecipe.ingredients || []).map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-xs">
                      <input
                        type="text"
                        placeholder="Nombre del insumo (ej: Aceite de Coco)"
                        required
                        value={ing.raw_material_name}
                        onChange={e => handleUpdateIngredient(idx, 'raw_material_name', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Cant."
                        step="any"
                        required
                        value={ing.quantity}
                        onChange={e => handleUpdateIngredient(idx, 'quantity', e.target.value)}
                        className="w-20 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-center"
                      />

                      <select
                        value={ing.unit}
                        onChange={e => handleUpdateIngredient(idx, 'unit', e.target.value)}
                        className="w-24 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                      >
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="ml">ml</option>
                        <option value="l">L</option>
                        <option value="unit">unid</option>
                        <option value="oz">oz</option>
                        <option value="lb">lb</option>
                      </select>

                      <div className="w-24 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="Costo u."
                          value={ing.unit_cost}
                          onChange={e => handleUpdateIngredient(idx, 'unit_cost', e.target.value)}
                          className="w-full bg-transparent outline-none text-right font-medium"
                        />
                      </div>

                      <div className="w-16 text-right font-bold text-slate-800 dark:text-slate-200">
                        ${ing.total_cost.toFixed(2)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Costos Extras */}
              <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Costos de Empaque / Mano de Obra
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddExtraCostRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Costo Extra</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(editingRecipe.extra_costs || []).map((ext, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-xs">
                      <input
                        type="text"
                        placeholder="Concepto (ej: Frasco de vidrio, Etiqueta, Caja)"
                        required
                        value={ext.concept}
                        onChange={e => handleUpdateExtraCost(idx, 'concept', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none"
                      />

                      <div className="w-28 flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5">
                        <span className="text-slate-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Monto"
                          value={ext.amount}
                          onChange={e => handleUpdateExtraCost(idx, 'amount', Number(e.target.value))}
                          className="w-full bg-transparent outline-none text-right font-medium"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveExtraCost(idx)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escandallo Calculado en Vivo */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Costo Total Lote</div>
                  <div className="text-base font-bold text-slate-900 dark:text-white">
                    ${computedRecipeModalCosts.total.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold">Costo Unitario</div>
                  <div className="text-base font-black text-amber-600 dark:text-amber-400">
                    ${computedRecipeModalCosts.unitCost.toFixed(3)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold">PVP Sugerido</div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    ${computedRecipeModalCosts.salePrice.toFixed(2)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-semibold">Margen</div>
                  <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                    {computedRecipeModalCosts.marginPercent}%
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecipeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Guardar Fórmula</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
