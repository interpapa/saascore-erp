'use server';

import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { validateUserTenantAccess } from '@/lib/core/tenantSecurity';
import { writeAuditLog } from '@/lib/core/auditLogger';
import { revalidatePath } from 'next/cache';
import { ActionActor } from './entities';
import { 
  Recipe, 
  RecipeIngredient, 
  ProductionOrder, 
  SimulateStockResult 
} from '@/types/production';

function safeRevalidate(tenantId?: string) {
  try {
    revalidatePath('/produccion');
    revalidatePath('/inventario');
    revalidatePath('/caja');
    revalidatePath('/dashboard');
    if (tenantId) {
      revalidatePath(`/produccion`);
    }
  } catch {}
}

const DEFAULT_RECIPES: Recipe[] = [
  {
    id: 'receta-jabon-artesanal',
    tenant_id: '',
    name: 'Jabón Artesanal de Avena & Miel',
    description: 'Fórmula saponificada en frío con avena coloidal y miel pura.',
    finished_product_id: '',
    finished_product_name: 'Jabón Artesanal Avena & Miel (100g)',
    batch_yield: 20,
    yield_unit: 'barras',
    ingredients: [
      {
        raw_material_id: 'raw-aceite-coco',
        raw_material_name: 'Aceite de Coco Virgen (500ml)',
        quantity: 500,
        unit: 'ml',
        unit_cost: 0.008,
        total_cost: 4.00
      },
      {
        raw_material_id: 'raw-aceite-oliva',
        raw_material_name: 'Aceite de Oliva Extra Virgen (500ml)',
        quantity: 500,
        unit: 'ml',
        unit_cost: 0.009,
        total_cost: 4.50
      },
      {
        raw_material_id: 'raw-sosa-caustica',
        raw_material_name: 'Hidróxido de Sodio / Sosa Cáustica (150g)',
        quantity: 150,
        unit: 'g',
        unit_cost: 0.006,
        total_cost: 0.90
      },
      {
        raw_material_id: 'raw-miel-pura',
        raw_material_name: 'Miel de Abeja Pura (50g)',
        quantity: 50,
        unit: 'g',
        unit_cost: 0.02,
        total_cost: 1.00
      },
      {
        raw_material_id: 'raw-avena-hojuelas',
        raw_material_name: 'Avena en Hojuelas (100g)',
        quantity: 100,
        unit: 'g',
        unit_cost: 0.004,
        total_cost: 0.40
      }
    ],
    extra_costs: [
      { id: 'ext-1', concept: 'Papel Kraft + Sello de Marca', amount: 1.80 },
      { id: 'ext-2', concept: 'Mano de Obra & Curado', amount: 2.50 }
    ],
    total_batch_cost: 15.10,
    unit_production_cost: 0.755,
    suggested_sale_price: 3.50,
    notes: 'Tiempo de curado requerido: 4 semanas antes de comercializar.',
    is_active: true
  },
  {
    id: 'receta-torta-vainilla',
    tenant_id: '',
    name: 'Torta Clásica de Vainilla & Arequipe',
    description: 'Bizcochuelo húmedo relleno de arequipe artesanal.',
    finished_product_id: '',
    finished_product_name: 'Torta Vainilla & Arequipe 1kg',
    batch_yield: 12,
    yield_unit: 'porciones',
    ingredients: [
      {
        raw_material_id: 'raw-harina-trigo',
        raw_material_name: 'Harina de Trigo Repostera (500g)',
        quantity: 500,
        unit: 'g',
        unit_cost: 0.002,
        total_cost: 1.00
      },
      {
        raw_material_id: 'raw-azucar-blanca',
        raw_material_name: 'Azúcar Blanca Refinada (300g)',
        quantity: 300,
        unit: 'g',
        unit_cost: 0.0018,
        total_cost: 0.54
      },
      {
        raw_material_id: 'raw-huevos-frescos',
        raw_material_name: 'Huevos Frescos Triple A',
        quantity: 6,
        unit: 'unit',
        unit_cost: 0.20,
        total_cost: 1.20
      },
      {
        raw_material_id: 'raw-mantequilla',
        raw_material_name: 'Mantequilla Sin Sal (200g)',
        quantity: 200,
        unit: 'g',
        unit_cost: 0.008,
        total_cost: 1.60
      },
      {
        raw_material_id: 'raw-leche-entera',
        raw_material_name: 'Leche Líquida Entera (250ml)',
        quantity: 250,
        unit: 'ml',
        unit_cost: 0.002,
        total_cost: 0.50
      },
      {
        raw_material_id: 'raw-arequipe',
        raw_material_name: 'Arequipe / Dulce de Leche Repostero (300g)',
        quantity: 300,
        unit: 'g',
        unit_cost: 0.007,
        total_cost: 2.10
      }
    ],
    extra_costs: [
      { id: 'ext-caja', concept: 'Domo Protector & Base Dorada', amount: 1.60 },
      { id: 'ext-gas', concept: 'Gas de Horno & Energía', amount: 1.00 }
    ],
    total_batch_cost: 9.54,
    unit_production_cost: 0.795,
    suggested_sale_price: 2.50,
    notes: 'Hornear a 180°C por 45 minutos. Dejar enfriar antes de rellenar.',
    is_active: true
  }
];

// ─── 1. OBTENER RECETAS (FÓRMULAS BOM) ─────────────────────────────────────────
export async function getRecipesAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; recipes: Recipe[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', recipes: [] };
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const storedRecipes: Recipe[] = tenant?.metadata?.recipes || [];
    if (storedRecipes.length === 0) {
      const initialized = DEFAULT_RECIPES.map(r => ({ ...r, tenant_id: tenantId }));
      return { success: true, recipes: initialized };
    }

    return { success: true, recipes: storedRecipes };
  } catch (err: unknown) {
    console.error('[getRecipesAction Error]:', err);
    return { success: false, error: (err as Error).message, recipes: [] };
  }
}

// ─── 2. GUARDAR / EDITAR RECETA (FÓRMULA) ──────────────────────────────────────
export async function saveRecipeAction(
  tenantId: string,
  payload: Partial<Recipe> & {
    name: string;
    finished_product_id: string;
    finished_product_name: string;
    batch_yield: number;
    ingredients: RecipeIngredient[];
  },
  actor: ActionActor
): Promise<{ success: boolean; recipe?: Recipe; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    if (!payload.name || !payload.name.trim()) {
      return { success: false, error: 'El nombre de la receta es obligatorio.' };
    }
    if (!payload.finished_product_name) {
      return { success: false, error: 'Debes vincular el producto terminado que se creará.' };
    }
    if (!payload.batch_yield || payload.batch_yield <= 0) {
      return { success: false, error: 'El rendimiento del lote debe ser mayor a 0.' };
    }
    if (!payload.ingredients || payload.ingredients.length === 0) {
      return { success: false, error: 'La receta debe tener al menos un ingrediente / materia prima.' };
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const existingMetadata = tenant?.metadata || {};
    let recipes: Recipe[] = existingMetadata.recipes || DEFAULT_RECIPES.map(r => ({ ...r, tenant_id: tenantId }));

    // Calcular costos
    const ingredientsCost = payload.ingredients.reduce((acc, ing) => acc + (Number(ing.total_cost) || 0), 0);
    const extraCosts = payload.extra_costs || [];
    const extrasTotal = extraCosts.reduce((acc, ext) => acc + (Number(ext.amount) || 0), 0);
    const totalBatchCost = Math.round((ingredientsCost + extrasTotal) * 1000) / 1000;
    const unitProductionCost = Math.round((totalBatchCost / payload.batch_yield) * 1000) / 1000;

    let savedRecipe: Recipe;

    if (payload.id) {
      recipes = recipes.map(r => {
        if (r.id === payload.id) {
          savedRecipe = {
            ...r,
            ...payload,
            total_batch_cost: totalBatchCost,
            unit_production_cost: unitProductionCost,
            extra_costs: extraCosts,
            updated_at: new Date().toISOString()
          };
          return savedRecipe;
        }
        return r;
      });
      // @ts-expect-error assigned in map
      if (!savedRecipe) {
        savedRecipe = {
          id: payload.id,
          tenant_id: tenantId,
          name: payload.name,
          description: payload.description || '',
          finished_product_id: payload.finished_product_id,
          finished_product_name: payload.finished_product_name,
          batch_yield: payload.batch_yield,
          yield_unit: payload.yield_unit || 'unidades',
          ingredients: payload.ingredients,
          extra_costs: extraCosts,
          total_batch_cost: totalBatchCost,
          unit_production_cost: unitProductionCost,
          suggested_sale_price: payload.suggested_sale_price,
          notes: payload.notes || '',
          is_active: payload.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        recipes.push(savedRecipe);
      }
    } else {
      savedRecipe = {
        id: `receta-${Date.now()}`,
        tenant_id: tenantId,
        name: payload.name,
        description: payload.description || '',
        finished_product_id: payload.finished_product_id,
        finished_product_name: payload.finished_product_name,
        batch_yield: payload.batch_yield,
        yield_unit: payload.yield_unit || 'unidades',
        ingredients: payload.ingredients,
        extra_costs: extraCosts,
        total_batch_cost: totalBatchCost,
        unit_production_cost: unitProductionCost,
        suggested_sale_price: payload.suggested_sale_price,
        notes: payload.notes || '',
        is_active: payload.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      recipes.push(savedRecipe);
    }

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...existingMetadata,
          recipes
        }
      })
      .eq('id', tenantId);

    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: payload.id ? 'entity.updated' : 'entity.created',
      target_type: 'recipe',
      target_id: savedRecipe.id,
      metadata: {
        recipe_name: savedRecipe.name,
        batch_yield: savedRecipe.batch_yield,
        total_batch_cost: totalBatchCost,
        unit_cost: unitProductionCost
      }
    });

    safeRevalidate(tenantId);
    return { success: true, recipe: savedRecipe };
  } catch (err: unknown) {
    console.error('[saveRecipeAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 3. ELIMINAR RECETA ───────────────────────────────────────────────────────
export async function deleteRecipeAction(
  tenantId: string,
  recipeId: string,
  actor: ActionActor
): Promise<{ success: boolean; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const existingMetadata = tenant?.metadata || {};
    const recipes: Recipe[] = existingMetadata.recipes || [];
    const filtered = recipes.filter(r => r.id !== recipeId);

    await supabaseAdmin
      .from('tenants')
      .update({
        metadata: {
          ...existingMetadata,
          recipes: filtered
        }
      })
      .eq('id', tenantId);

    safeRevalidate(tenantId);
    return { success: true };
  } catch (err: unknown) {
    console.error('[deleteRecipeAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 4. SIMULAR STOCK PARA FABRICACIÓN ────────────────────────────────────────
export async function simulateProductionStockAction(
  tenantId: string,
  recipeId: string,
  batches: number,
  actor: ActionActor
): Promise<{ success: boolean; result?: SimulateStockResult; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const { recipes } = await getRecipesAction(tenantId, actor);
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada.' };
    }

    // Traer todos los items de la empresa para contrastar stock
    const { data: rawItems } = await supabaseAdmin
      .from('items')
      .select('id, name, stock, stock_quantity, sku')
      .eq('tenant_id', tenantId);

    const itemsMap = new Map<string, any>();
    (rawItems || []).forEach(it => {
      itemsMap.set(it.id, it);
      // Por si se vinculó por nombre o SKU
      if (it.name) itemsMap.set(it.name.toLowerCase().trim(), it);
    });

    let canProduce = true;
    let maxBatches = 999999;
    const ingredientsStatus = [];

    for (const ing of recipe.ingredients) {
      const needed = Number(ing.quantity) * batches;
      
      // Buscar el ítem en la base de datos
      const matchedItem = itemsMap.get(ing.raw_material_id) || itemsMap.get(ing.raw_material_name.toLowerCase().trim());
      const available = matchedItem ? Number(matchedItem.stock_quantity ?? matchedItem.stock ?? 0) : 0;
      const missing = Math.max(0, needed - available);
      const hasEnough = available >= needed;

      if (!hasEnough) {
        canProduce = false;
      }

      if (ing.quantity > 0) {
        const possibleBatchesWithThis = Math.floor(available / ing.quantity);
        if (possibleBatchesWithThis < maxBatches) {
          maxBatches = Math.max(0, possibleBatchesWithThis);
        }
      }

      ingredientsStatus.push({
        id: ing.raw_material_id,
        name: ing.raw_material_name,
        needed,
        available,
        missing,
        unit: ing.unit,
        hasEnough
      });
    }

    if (maxBatches === 999999) maxBatches = 0;

    return {
      success: true,
      result: {
        canProduce,
        maxBatchesPossible: maxBatches,
        ingredientsStatus
      }
    };
  } catch (err: unknown) {
    console.error('[simulateProductionStockAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 5. EJECUTAR ORDEN DE PRODUCCIÓN (FABRICAR Y DESCONTAR MATERIAS PRIMAS) ────
export async function executeProductionOrderAction(
  tenantId: string,
  payload: {
    recipeId: string;
    batches: number;
    operatorName?: string;
    notes?: string;
  },
  actor: ActionActor
): Promise<{ success: boolean; order?: ProductionOrder; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.' };
    }

    const batches = Number(payload.batches);
    if (!batches || batches <= 0) {
      return { success: false, error: 'La cantidad de lotes a producir debe ser al menos 1.' };
    }

    const { recipes } = await getRecipesAction(tenantId, actor);
    const recipe = recipes.find(r => r.id === payload.recipeId);
    if (!recipe) {
      return { success: false, error: 'Receta no encontrada.' };
    }

    // Traer los items existentes
    const { data: allItems, error: itemsErr } = await supabaseAdmin
      .from('items')
      .select('id, name, stock, stock_quantity, cost')
      .eq('tenant_id', tenantId);

    if (itemsErr) throw itemsErr;

    const itemsMap = new Map<string, any>();
    (allItems || []).forEach(it => {
      itemsMap.set(it.id, it);
      if (it.name) itemsMap.set(it.name.toLowerCase().trim(), it);
    });

    // 1. Validar disponibilidad de insumos
    for (const ing of recipe.ingredients) {
      const needed = Number(ing.quantity) * batches;
      const matched = itemsMap.get(ing.raw_material_id) || itemsMap.get(ing.raw_material_name.toLowerCase().trim());
      const currentStock = matched ? Number(matched.stock_quantity ?? matched.stock ?? 0) : 0;

      // Si el ítem existe en inventario pero el stock no alcanza
      if (matched && currentStock < needed) {
        return {
          success: false,
          error: `Stock insuficiente de "${ing.raw_material_name}". Se requieren ${needed} ${ing.unit} y solo hay ${currentStock} ${ing.unit} disponibles.`
        };
      }
    }

    // 2. Descontar materias primas en items
    const consumedMaterials = [];

    for (const ing of recipe.ingredients) {
      const needed = Number(ing.quantity) * batches;
      const matched = itemsMap.get(ing.raw_material_id) || itemsMap.get(ing.raw_material_name.toLowerCase().trim());

      if (matched) {
        const currentStock = Number(matched.stock_quantity ?? matched.stock ?? 0);
        const newStock = Math.max(0, currentStock - needed);

        // Actualizar stock con fallback
        let updateRes = await supabaseAdmin
          .from('items')
          .update({ stock_quantity: newStock })
          .eq('id', matched.id);

        if (updateRes.error && (updateRes.error.message.includes('stock_quantity') || updateRes.error.message.includes('column'))) {
          await supabaseAdmin
            .from('items')
            .update({ stock: newStock })
            .eq('id', matched.id);
        }
      }

      consumedMaterials.push({
        id: ing.raw_material_id,
        name: ing.raw_material_name,
        quantity: needed,
        unit: ing.unit,
        unit_cost: ing.unit_cost,
        total_cost: Math.round(ing.unit_cost * needed * 100) / 100
      });
    }

    // 3. Incrementar stock del producto terminado
    const totalUnitsProduced = recipe.batch_yield * batches;
    const totalProductionCost = Math.round(recipe.total_batch_cost * batches * 100) / 100;
    const unitCost = recipe.unit_production_cost;

    let finishedItemId = recipe.finished_product_id;
    let matchedFinished = itemsMap.get(recipe.finished_product_id) || itemsMap.get(recipe.finished_product_name.toLowerCase().trim());

    if (matchedFinished) {
      finishedItemId = matchedFinished.id;
      const currentStock = Number(matchedFinished.stock_quantity ?? matchedFinished.stock ?? 0);
      const newStock = currentStock + totalUnitsProduced;

      let updateFinished = await supabaseAdmin
        .from('items')
        .update({
          stock_quantity: newStock,
          cost: unitCost // Actualizar costo promedio / unitario de producción
        })
        .eq('id', matchedFinished.id);

      if (updateFinished.error && (updateFinished.error.message.includes('stock_quantity') || updateFinished.error.message.includes('column'))) {
        await supabaseAdmin
          .from('items')
          .update({
            stock: newStock,
            cost: unitCost
          })
          .eq('id', matchedFinished.id);
      }
    } else {
      // Si el producto terminado no existe aún en items, lo creamos automáticamente
      const { data: newProd } = await supabaseAdmin
        .from('items')
        .insert({
          tenant_id: tenantId,
          type: 'product',
          name: recipe.finished_product_name,
          description: `Fabricado por orden de producción según fórmula ${recipe.name}`,
          base_price: recipe.suggested_sale_price || Math.round(unitCost * 1.5 * 100) / 100,
          cost: unitCost,
          stock_quantity: totalUnitsProduced,
          is_active: true,
          metadata: {
            is_manufactured: true,
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            yield_unit: recipe.yield_unit
          }
        })
        .select('id')
        .single();

      if (newProd) {
        finishedItemId = newProd.id;
      }
    }

    // 4. Registrar la orden de producción en documents
    const orderNumber = `PROD-${Date.now().toString().slice(-6)}`;
    const producedAt = new Date().toISOString();

    const { data: orderDoc, error: orderErr } = await supabaseAdmin
      .from('documents')
      .insert({
        tenant_id: tenantId,
        type: 'production_order',
        status: 'completed',
        document_number: orderNumber,
        subtotal_amount: totalProductionCost,
        tax_amount: 0,
        total_amount: totalProductionCost,
        notes: payload.notes || `Fabricación de ${batches} lote(s) de ${recipe.name}`,
        metadata: {
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          finished_product_id: finishedItemId,
          finished_product_name: recipe.finished_product_name,
          batches_produced: batches,
          total_units_produced: totalUnitsProduced,
          yield_unit: recipe.yield_unit,
          unit_cost: unitCost,
          total_cost: totalProductionCost,
          materials_consumed: consumedMaterials,
          extra_costs: recipe.extra_costs,
          operator_name: payload.operatorName || actor.email,
          produced_at: producedAt
        }
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // 5. Auditar la fabricación
    await writeAuditLog({
      tenant_id: tenantId,
      actor_email: actor.email,
      actor_role: actor.role,
      action: 'entity.created',
      target_type: 'production_order',
      target_id: orderDoc.id,
      metadata: {
        order_number: orderNumber,
        recipe_name: recipe.name,
        batches,
        units_produced: totalUnitsProduced,
        total_cost: totalProductionCost
      }
    });

    safeRevalidate(tenantId);

    const productionOrder: ProductionOrder = {
      id: orderDoc.id,
      tenant_id: tenantId,
      order_number: orderNumber,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      finished_product_id: finishedItemId,
      finished_product_name: recipe.finished_product_name,
      batches_produced: batches,
      total_units_produced: totalUnitsProduced,
      total_cost: totalProductionCost,
      unit_cost: unitCost,
      status: 'completed',
      materials_consumed: consumedMaterials,
      produced_at: producedAt,
      operator_name: payload.operatorName || actor.email,
      notes: payload.notes || null,
      metadata: orderDoc.metadata
    };

    return { success: true, order: productionOrder };
  } catch (err: unknown) {
    console.error('[executeProductionOrderAction Error]:', err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── 6. OBTENER HISTORIAL DE ÓRDENES DE PRODUCCIÓN ─────────────────────────────
export async function getProductionOrdersAction(
  tenantId: string,
  actor: ActionActor
): Promise<{ success: boolean; orders: ProductionOrder[]; error?: string }> {
  try {
    const securityCheck = await validateUserTenantAccess(actor, tenantId);
    if (!securityCheck.authorized) {
      return { success: false, error: securityCheck.error || 'Acceso denegado.', orders: [] };
    }

    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select('id, tenant_id, document_number, total_amount, status, notes, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('type', 'production_order')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const orders: ProductionOrder[] = (docs || []).map((d: any) => {
      const meta = d.metadata || {};
      return {
        id: d.id,
        tenant_id: d.tenant_id,
        order_number: d.document_number || 'PROD-N/A',
        recipe_id: meta.recipe_id || '',
        recipe_name: meta.recipe_name || 'Receta de Producción',
        finished_product_id: meta.finished_product_id || '',
        finished_product_name: meta.finished_product_name || 'Producto Fabricado',
        batches_produced: Number(meta.batches_produced) || 1,
        total_units_produced: Number(meta.total_units_produced) || 0,
        total_cost: Number(d.total_amount) || Number(meta.total_cost) || 0,
        unit_cost: Number(meta.unit_cost) || 0,
        status: (d.status as any) || 'completed',
        materials_consumed: meta.materials_consumed || [],
        produced_at: meta.produced_at || d.created_at,
        operator_name: meta.operator_name || 'Operador',
        notes: d.notes || null,
        metadata: meta
      };
    });

    return { success: true, orders };
  } catch (err: unknown) {
    console.error('[getProductionOrdersAction Error]:', err);
    return { success: false, error: (err as Error).message, orders: [] };
  }
}
