import assert from 'node:assert/strict';

export interface CatalogItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  tax_rate?: number;
  track_inventory: boolean;
}

export function calculateItemFinancials(item: CatalogItem, quantity: number, customTaxRate = 0.16) {
  const taxRate = item.tax_rate !== undefined ? item.tax_rate : customTaxRate;
  const subtotal = Math.round(item.price * quantity * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  const margin = item.price > 0 ? Math.round(((item.price - item.cost) / item.price) * 10000) / 100 : 0;
  const isLowStock = item.track_inventory && item.stock <= item.min_stock;

  return { subtotal, tax, total, margin, isLowStock };
}

export async function runCatalogoTests() {
  console.log('\n--- 📦 Módulo 02: Catálogo & Existencias ---');

  const producto: CatalogItem = {
    id: 'item-1',
    name: 'Kit de Resina Compuesta 3M',
    sku: 'RES-3M-001',
    price: 45.00,
    cost: 25.00,
    stock: 3,
    min_stock: 5,
    track_inventory: true,
  };

  console.log('2.1 Cálculo de subtotal, IVA y margen comercial');
  const res1 = calculateItemFinancials(producto, 2, 0.16);
  assert.equal(res1.subtotal, 90.00, 'Subtotal de 2 unidades a $45 debe ser $90');
  assert.equal(res1.tax, 14.40, 'IVA (16%) de $90 debe ser $14.40');
  assert.equal(res1.total, 104.40, 'Total debe ser $104.40');
  assert.equal(res1.margin, 44.44, 'Margen de ganancia ((45-25)/45) debe ser 44.44%');
  assert.equal(res1.isLowStock, true, 'Stock (3) menor o igual a min_stock (5) debe disparar alerta');
  console.log('  ✓ Cálculos de precio y alerta de stock mínimo verificados');

  console.log('2.2 Servicio clínico sin control de inventario');
  const servicio: CatalogItem = {
    id: 'serv-1',
    name: 'Profilaxis Dental Ultrasónica',
    sku: 'SRV-OD-001',
    price: 30.00,
    cost: 5.00,
    stock: 0,
    min_stock: 0,
    track_inventory: false,
  };

  const res2 = calculateItemFinancials(servicio, 1, 0.16);
  assert.equal(res2.isLowStock, false, 'Un servicio sin tracking no debe alertar por stock bajo');
  assert.equal(res2.total, 34.80, 'Total de servicio con 16% IVA');
  console.log('  ✓ Servicios clínicos exentos de alertas de inventario verificados');

  console.log('✅ [02_catalogo.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('02_catalogo.test.ts')) {
  runCatalogoTests().catch(err => {
    console.error('❌ Error en tests de catálogo:', err);
    process.exit(1);
  });
}
