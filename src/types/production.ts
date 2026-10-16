export type ProductionUnit = 'g' | 'kg' | 'ml' | 'l' | 'unit' | 'oz' | 'lb';

export interface RecipeIngredient {
  raw_material_id: string;
  raw_material_name: string;
  sku?: string | null;
  quantity: number;
  unit: ProductionUnit;
  unit_cost: number;
  total_cost: number;
}

export interface RecipeExtraCost {
  id: string;
  concept: string; // ej: 'Empaque / Frasco', 'Etiqueta', 'Mano de Obra'
  amount: number;
}

export interface Recipe {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  finished_product_id: string;
  finished_product_name: string;
  batch_yield: number; // Unidades que rinde el lote (ej: 50)
  yield_unit: string; // ej: 'unidades', 'barras', 'porciones'
  ingredients: RecipeIngredient[];
  extra_costs: RecipeExtraCost[];
  total_batch_cost: number;
  unit_production_cost: number; // total_batch_cost / batch_yield
  suggested_sale_price?: number;
  notes?: string | null;
  waste_percentage?: number; // % Merma / Desperdicio (ej: 5 = 5%)
  shelf_life_days?: number; // Días de caducidad / vida útil (ej: 180)
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface ProductionOrder {
  id: string;
  tenant_id: string;
  order_number: string;
  recipe_id: string;
  recipe_name: string;
  finished_product_id: string;
  finished_product_name: string;
  batches_produced: number;
  total_units_produced: number;
  total_cost: number;
  unit_cost: number;
  status: 'completed' | 'cancelled';
  lot_number?: string; // Trazabilidad de lote (ej: LOTE-20261016-01)
  expiry_date?: string; // Fecha de vencimiento estimada
  materials_consumed: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unit_cost: number;
    total_cost: number;
  }>;
  produced_at: string;
  operator_name?: string;
  notes?: string | null;
  metadata?: Record<string, any>;
}

export interface SimulateStockResult {
  canProduce: boolean;
  maxBatchesPossible: number;
  ingredientsStatus: Array<{
    id: string;
    name: string;
    needed: number;
    available: number;
    missing: number;
    unit: string;
    hasEnough: boolean;
  }>;
}
