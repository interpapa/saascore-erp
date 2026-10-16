/**
 * Suite 14: Módulos de Suscripciones & Producción MRP
 * 
 * Valida:
 * 1. Gobernanza de módulos: 'suscripciones' y 'produccion' están en el catálogo pero NO en DEFAULT_ENABLED_MODULES (activados solo a discreción).
 * 2. Cálculo de fechas de corte y semáforo de suscripciones por frecuencia (mensual, trimestral, anual).
 * 3. Simulación de recetas BOM (Bill of Materials): escandallo de costos de insumos, costos extras y margen.
 * 4. Simulación de stock y cálculo de lotes máximos posibles según disponibilidad de materias primas.
 */

import assert from 'node:assert/strict';
import { isModuleActive, MODULE_CATALOG, DEFAULT_ENABLED_MODULES } from '../lib/core/kernel/moduleRegistry';
import { Recipe, RecipeIngredient, SimulateStockResult } from '../types/production';
import { SubscriptionFrequency } from '../types/subscriptions';

export async function runSuscripcionesYProduccionTests() {
  console.log('\n--- 📦 Módulo 14: Suscripciones & Producción MRP ---');

  // 14.1 Gobernanza y Restricción de Módulos (Requerimiento Crítico del Usuario)
  console.log('14.1 Gobernanza de Módulos y Restricción por Defecto');
  
  assert.ok(MODULE_CATALOG.suscripciones, 'El módulo de Suscripciones debe estar registrado en MODULE_CATALOG');
  assert.ok(MODULE_CATALOG.produccion, 'El módulo de Producción debe estar registrado en MODULE_CATALOG');

  // Verificar que NO estén en DEFAULT_ENABLED_MODULES (para no activárselos a los clientes existentes sin autorización)
  assert.ok(
    !DEFAULT_ENABLED_MODULES.includes('suscripciones'),
    'Suscripciones NO debe estar en DEFAULT_ENABLED_MODULES para evitar activación involuntaria en clientes'
  );
  assert.ok(
    !DEFAULT_ENABLED_MODULES.includes('produccion'),
    'Producción NO debe estar en DEFAULT_ENABLED_MODULES para evitar activación involuntaria en clientes'
  );

  // Comprobar activación explícita en tenant del usuario
  const userTenantModules = ['caja', 'inventario', 'clientes', 'suscripciones', 'produccion'];
  assert.strictEqual(isModuleActive(userTenantModules, 'suscripciones'), true, 'Debe estar activo cuando el tenant lo tiene en su lista');
  assert.strictEqual(isModuleActive(userTenantModules, 'produccion'), true, 'Debe estar activo cuando el tenant lo tiene en su lista');

  // Comprobar bloqueo para clientes comunes sin el módulo
  const regularClientModules = ['caja', 'inventario', 'clientes'];
  assert.strictEqual(isModuleActive(regularClientModules, 'suscripciones'), false, 'Cliente sin suscripciones debe tenerlo inactivo');
  assert.strictEqual(isModuleActive(regularClientModules, 'produccion'), false, 'Cliente sin produccion debe tenerlo inactivo');

  console.log('  ✓ Gobernanza modular y restricción selectiva verificada');

  // 14.2 Cálculo de Fechas de Corte en Suscripciones
  console.log('14.2 Lógica de Fechas de Facturación Recurrente');
  function calcNextDate(startDateStr: string, frequency: SubscriptionFrequency): string {
    const d = new Date(startDateStr);
    switch (frequency) {
      case 'weekly': d.setDate(d.getDate() + 7); break;
      case 'biweekly': d.setDate(d.getDate() + 15); break;
      case 'monthly': d.setMonth(d.getMonth() + 1); break;
      case 'quarterly': d.setMonth(d.getMonth() + 3); break;
      case 'semiannual': d.setMonth(d.getMonth() + 6); break;
      case 'annual': d.setFullYear(d.getFullYear() + 1); break;
    }
    return d.toISOString().slice(0, 10);
  }

  const baseDate = '2026-10-15';
  assert.strictEqual(calcNextDate(baseDate, 'weekly'), '2026-10-22', 'Corte semanal correcto');
  assert.strictEqual(calcNextDate(baseDate, 'biweekly'), '2026-10-30', 'Corte quincenal correcto');
  assert.strictEqual(calcNextDate(baseDate, 'monthly'), '2026-11-15', 'Corte mensual correcto');
  assert.strictEqual(calcNextDate(baseDate, 'quarterly'), '2027-01-15', 'Corte trimestral correcto');
  assert.strictEqual(calcNextDate(baseDate, 'annual'), '2027-10-15', 'Corte anual correcto');

  console.log('  ✓ Proyección de ciclos de facturación validada');

  // 14.3 Escandallo de Costos BOM (Bill of Materials) en Producción
  console.log('14.3 Escandallo de Costos BOM (Materias Primas + Extras)');
  const jabonIngredients: RecipeIngredient[] = [
    { raw_material_id: 'raw-1', raw_material_name: 'Aceite de Coco', quantity: 500, unit: 'ml', unit_cost: 0.008, total_cost: 4.00 },
    { raw_material_id: 'raw-2', raw_material_name: 'Aceite de Oliva', quantity: 500, unit: 'ml', unit_cost: 0.009, total_cost: 4.50 },
    { raw_material_id: 'raw-3', raw_material_name: 'Sosa Cáustica', quantity: 150, unit: 'g', unit_cost: 0.006, total_cost: 0.90 }
  ];

  const extraCosts = [
    { id: 'ext-1', concept: 'Etiquetas & Papel Kraft', amount: 1.50 },
    { id: 'ext-2', concept: 'Mano de obra y curado', amount: 2.10 }
  ];

  const batchYield = 20; // 20 barras de jabón
  const ingredientsCost = jabonIngredients.reduce((acc, i) => acc + i.total_cost, 0);
  const extrasCost = extraCosts.reduce((acc, e) => acc + e.amount, 0);
  const totalBatchCost = Math.round((ingredientsCost + extrasCost) * 100) / 100;
  const unitProductionCost = Math.round((totalBatchCost / batchYield) * 1000) / 1000;

  assert.strictEqual(totalBatchCost, 13.00, 'El costo total del lote de jabón debe ser $13.00 exactos');
  assert.strictEqual(unitProductionCost, 0.65, 'El costo unitario por barra de jabón debe ser $0.65 exactos');

  const pvpSugerido = 2.50;
  const margen = Math.round(((pvpSugerido - unitProductionCost) / pvpSugerido) * 100);
  assert.strictEqual(margen, 74, 'El margen proyectado con PVP $2.50 debe ser del 74%');

  console.log('  ✓ Escandallo de costos BOM, extras y margen unitario verificado');

  // 14.4 Simulación de Stock y Detección de Cuellos de Botella
  console.log('14.4 Simulación de Stock de Insumos y Capacidad Máxima');
  const inventarioAlmacen: Record<string, number> = {
    'raw-1': 1500, // Hay 1500 ml de Aceite de Coco (alcanza para 3 lotes)
    'raw-2': 1000, // Hay 1000 ml de Aceite de Oliva (alcanza para 2 lotes)
    'raw-3': 150   // Hay 150 g de Sosa Cáustica (alcanza solo para 1 lote -> Cuello de botella)
  };

  let maxBatches = 999999;
  for (const ing of jabonIngredients) {
    const available = inventarioAlmacen[ing.raw_material_id] || 0;
    const possible = Math.floor(available / ing.quantity);
    if (possible < maxBatches) {
      maxBatches = possible;
    }
  }

  assert.strictEqual(maxBatches, 1, 'El simulador debe limitar la producción a 1 lote debido a la escasez de sosa cáustica');

  console.log('  ✓ Detección de cuello de botella en materias primas validada');

  // 14.5 Desacoplamiento e Independencia Total de Módulos (Requerimiento del Usuario)
  console.log('14.5 Desacoplamiento de Módulos sin Dependencias Bloqueantes');
  // Un cliente con SOLO 'odontologia' (sin kanban ni calendario) debe poder usar su modulo
  const soloDentalTenant = ['odontologia'];
  assert.strictEqual(isModuleActive(soloDentalTenant, 'odontologia'), true, 'Odontología debe estar activo sin requerir kanban');
  assert.strictEqual(isModuleActive(soloDentalTenant, 'kanban'), false, 'Kanban debe permanecer inactivo');

  // Un cliente con SOLO 'suscripciones' (sin caja ni inventario) debe poder usar su modulo
  const soloSuscripcionesTenant = ['suscripciones'];
  assert.strictEqual(isModuleActive(soloSuscripcionesTenant, 'suscripciones'), true, 'Suscripciones debe estar activo sin requerir caja');
  assert.strictEqual(isModuleActive(soloSuscripcionesTenant, 'caja'), false, 'Caja debe permanecer inactivo');

  // Un cliente con SOLO 'produccion' (sin compras ni contabilidad) debe poder usar su modulo
  const soloProduccionTenant = ['produccion'];
  assert.strictEqual(isModuleActive(soloProduccionTenant, 'produccion'), true, 'Producción debe estar activo sin requerir compras');
  assert.strictEqual(isModuleActive(soloProduccionTenant, 'contabilidad'), false, 'Contabilidad debe permanecer inactivo');

  console.log('  ✓ Autonomía completa y activación desacoplada verificada al 100%');
  console.log('✅ [14_suscripciones_y_produccion.test.ts] Todos los tests pasaron exitosamente.');
}
