/**
 * Rendo - Plan Contable Jerárquico (Chart of Accounts - NIIF / IFRS)
 * 
 * Estructura estándar de cuentas contables organizada por niveles jerárquicos:
 * 1. Activo (1.1 Corriente, 1.2 No Corriente)
 * 2. Pasivo (2.1 Corriente, 2.2 No Corriente)
 * 3. Patrimonio (3.1 Capital, 3.2 Resultados)
 * 4. Ingresos (4.1 Operacionales, 4.2 No Operacionales)
 * 5. Gastos (5.1 Operativos, 5.2 Administrativos)
 */

export interface AccountNode {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  level: number;
  parentCode?: string;
  isHeader?: boolean; // V: Cuenta rubro no imputable, F: Cuenta auxiliar imputable
}

export const DEFAULT_CHART_OF_ACCOUNTS: AccountNode[] = [
  // 1. ACTIVO
  { code: '1', name: 'ACTIVO', type: 'asset', level: 1, isHeader: true },
  { code: '1.1', name: 'Activo Corriente', type: 'asset', level: 2, parentCode: '1', isHeader: true },
  { code: '1.1.01', name: 'Caja y Bancos', type: 'asset', level: 3, parentCode: '1.1', isHeader: true },
  { code: '1.1.01.01', name: 'Caja Principal (Efectivo)', type: 'asset', level: 4, parentCode: '1.1.01', isHeader: false },
  { code: '1.1.01.02', name: 'Bancos Nacionales (Moneda Local)', type: 'asset', level: 4, parentCode: '1.1.01', isHeader: false },
  { code: '1.1.01.03', name: 'Cuenta Divisas (USD)', type: 'asset', level: 4, parentCode: '1.1.01', isHeader: false },
  { code: '1.1.02', name: 'Cuentas por Cobrar Comerciales', type: 'asset', level: 3, parentCode: '1.1', isHeader: true },
  { code: '1.1.02.01', name: 'Clientes Nacionales (AR)', type: 'asset', level: 4, parentCode: '1.1.02', isHeader: false },
  { code: '1.1.03', name: 'Inventarios', type: 'asset', level: 3, parentCode: '1.1', isHeader: true },
  { code: '1.1.03.01', name: 'Mercancía para la Venta', type: 'asset', level: 4, parentCode: '1.1.03', isHeader: false },

  // 2. PASIVO
  { code: '2', name: 'PASIVO', type: 'liability', level: 1, isHeader: true },
  { code: '2.1', name: 'Pasivo Corriente', type: 'liability', level: 2, parentCode: '2', isHeader: true },
  { code: '2.1.01', name: 'Cuentas por Pagar Comerciales', type: 'liability', level: 3, parentCode: '2.1', isHeader: true },
  { code: '2.1.01.01', name: 'Proveedores Nacionales (AP)', type: 'liability', level: 4, parentCode: '2.1.01', isHeader: false },
  { code: '2.1.02', name: 'Obligaciones Fiscales e Impuestos', type: 'liability', level: 3, parentCode: '2.1', isHeader: true },
  { code: '2.1.02.01', name: 'Débito Fiscal IVA por Pagar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
  { code: '2.1.02.02', name: 'Impuestos y Recargos Adicionales por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },

  // 3. PATRIMONIO
  { code: '3', name: 'PATRIMONIO', type: 'equity', level: 1, isHeader: true },
  { code: '3.1', name: 'Capital Social', type: 'equity', level: 2, parentCode: '3', isHeader: false },
  { code: '3.2', name: 'Resultados Acumulados', type: 'equity', level: 2, parentCode: '3', isHeader: false },

  // 4. INGRESOS
  { code: '4', name: 'INGRESOS', type: 'revenue', level: 1, isHeader: true },
  { code: '4.1', name: 'Ingresos Operacionales', type: 'revenue', level: 2, parentCode: '4', isHeader: true },
  { code: '4.1.01', name: 'Ventas de Productos', type: 'revenue', level: 3, parentCode: '4.1', isHeader: false },
  { code: '4.1.02', name: 'Ingresos por Servicios', type: 'revenue', level: 3, parentCode: '4.1', isHeader: false },
  { code: '4.2', name: 'Otros Ingresos (Ganancia en Cambio)', type: 'revenue', level: 2, parentCode: '4', isHeader: false },

  // 5. GASTOS
  { code: '5', name: 'GASTOS', type: 'expense', level: 1, isHeader: true },
  { code: '5.1', name: 'Costo de Ventas', type: 'expense', level: 2, parentCode: '5', isHeader: false },
  { code: '5.2', name: 'Gastos Operativos y Administrativos', type: 'expense', level: 2, parentCode: '5', isHeader: true },
  { code: '5.2.01', name: 'Sueldos y Salarios', type: 'expense', level: 3, parentCode: '5.2', isHeader: false },
  { code: '5.2.02', name: 'Pérdida por Diferencia en Cambio', type: 'expense', level: 3, parentCode: '5.2', isHeader: false },
];
