// Node JS Verification Script for M4 Contabilidad Implementation

const DEFAULT_CHART_OF_ACCOUNTS = [
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
  { code: '2', name: 'PASIVO', type: 'liability', level: 1, isHeader: true },
  { code: '2.1', name: 'Pasivo Corriente', type: 'liability', level: 2, parentCode: '2', isHeader: true },
  { code: '2.1.01', name: 'Cuentas por Pagar Comerciales', type: 'liability', level: 3, parentCode: '2.1', isHeader: true },
  { code: '2.1.01.01', name: 'Proveedores Nacionales (AP)', type: 'liability', level: 4, parentCode: '2.1.01', isHeader: false },
  { code: '2.1.02', name: 'Obligaciones Fiscales e Impuestos', type: 'liability', level: 3, parentCode: '2.1', isHeader: true },
  { code: '2.1.02.01', name: 'Débito Fiscal IVA por Pagar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
  { code: '2.1.02.02', name: 'Impuestos y Recargos Adicionales por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
  { code: '3', name: 'PATRIMONIO', type: 'equity', level: 1, isHeader: true },
  { code: '3.1', name: 'Capital Social', type: 'equity', level: 2, parentCode: '3', isHeader: false },
  { code: '3.2', name: 'Resultados Acumulados', type: 'equity', level: 2, parentCode: '3', isHeader: false },
  { code: '4', name: 'INGRESOS', type: 'revenue', level: 1, isHeader: true },
  { code: '4.1', name: 'Ingresos Operacionales', type: 'revenue', level: 2, parentCode: '4', isHeader: true },
  { code: '4.1.01', name: 'Ventas de Productos', type: 'revenue', level: 3, parentCode: '4.1', isHeader: false },
  { code: '4.1.02', name: 'Ingresos por Servicios', type: 'revenue', level: 3, parentCode: '4.1', isHeader: false },
  { code: '4.2', name: 'Otros Ingresos (Ganancia en Cambio)', type: 'revenue', level: 2, parentCode: '4', isHeader: false },
  { code: '5', name: 'GASTOS', type: 'expense', level: 1, isHeader: true },
  { code: '5.1', name: 'Costo de Ventas', type: 'expense', level: 2, parentCode: '5', isHeader: false },
  { code: '5.2', name: 'Gastos Operativos y Administrativos', type: 'expense', level: 2, parentCode: '5', isHeader: true },
  { code: '5.2.01', name: 'Sueldos y Salarios', type: 'expense', level: 3, parentCode: '5.2', isHeader: false },
  { code: '5.2.02', name: 'Pérdida por Diferencia en Cambio', type: 'expense', level: 3, parentCode: '5.2', isHeader: false },
];

function getTrialBalance(entries) {
  const accountTotals = new Map();

  entries.forEach((entry) => {
    if (entry.status === 'annulled') return;
    entry.lines.forEach((line) => {
      const current = accountTotals.get(line.account_code) || { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      accountTotals.set(line.account_code, current);
    });
  });

  const rows = DEFAULT_CHART_OF_ACCOUNTS.map((node) => {
    const totals = accountTotals.get(node.code) || { debit: 0, credit: 0 };
    const periodDebit = Math.round(totals.debit * 100) / 100;
    const periodCredit = Math.round(totals.credit * 100) / 100;

    let finalDebit = 0;
    let finalCredit = 0;

    if (node.type === 'asset' || node.type === 'expense') {
      const net = periodDebit - periodCredit;
      if (net >= 0) finalDebit = net;
      else finalCredit = Math.abs(net);
    } else {
      const net = periodCredit - periodDebit;
      if (net >= 0) finalCredit = net;
      else finalDebit = Math.abs(net);
    }

    return {
      account_code: node.code,
      account_name: node.name,
      account_type: node.type,
      initial_debit: 0,
      initial_credit: 0,
      period_debit: periodDebit,
      period_credit: periodCredit,
      final_debit: finalDebit,
      final_credit: finalCredit,
      isHeader: node.isHeader,
      level: node.level,
    };
  });

  const totalDebit = rows.reduce((sum, r) => sum + (r.isHeader ? 0 : r.period_debit), 0);
  const totalCredit = rows.reduce((sum, r) => sum + (r.isHeader ? 0 : r.period_credit), 0);

  return {
    rows,
    totals: {
      debit: Math.round(totalDebit * 100) / 100,
      credit: Math.round(totalCredit * 100) / 100,
    },
  };
}

function getIncomeStatement(trialRows) {
  const revenueRows = [];
  const costRows = [];
  const expenseRows = [];
  const otherRows = [];

  let totalRevenue = 0;
  let totalCostOfSales = 0;
  let totalOperatingExpenses = 0;
  let totalOtherIncomeExpenses = 0;

  trialRows.forEach((row) => {
    if (row.isHeader) return;

    if (row.account_code.startsWith('4.1')) {
      const amt = row.final_credit - row.final_debit;
      if (amt !== 0) {
        revenueRows.push({ code: row.account_code, name: row.account_name, amount: amt });
        totalRevenue += amt;
      }
    } else if (row.account_code.startsWith('4.2')) {
      const amt = row.final_credit - row.final_debit;
      if (amt !== 0) {
        otherRows.push({ code: row.account_code, name: row.account_name, amount: amt });
        totalOtherIncomeExpenses += amt;
      }
    } else if (row.account_code.startsWith('5.1')) {
      const amt = row.final_debit - row.final_credit;
      if (amt !== 0) {
        costRows.push({ code: row.account_code, name: row.account_name, amount: amt });
        totalCostOfSales += amt;
      }
    } else if (row.account_code.startsWith('5.2')) {
      const amt = row.final_debit - row.final_credit;
      if (amt !== 0) {
        expenseRows.push({ code: row.account_code, name: row.account_name, amount: amt });
        totalOperatingExpenses += amt;
      }
    }
  });

  const grossProfit = totalRevenue - totalCostOfSales;
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const netProfit = operatingProfit + totalOtherIncomeExpenses;

  return {
    revenue: { rows: revenueRows, total: Math.round(totalRevenue * 100) / 100 },
    costOfSales: { rows: costRows, total: Math.round(totalCostOfSales * 100) / 100 },
    grossProfit: Math.round(grossProfit * 100) / 100,
    operatingExpenses: { rows: expenseRows, total: Math.round(totalOperatingExpenses * 100) / 100 },
    operatingProfit: Math.round(operatingProfit * 100) / 100,
    otherIncomeExpenses: { rows: otherRows, total: Math.round(totalOtherIncomeExpenses * 100) / 100 },
    netProfit: Math.round(netProfit * 100) / 100,
  };
}

function computeKPIs(trialRows, incomeReport) {
  const nonHeaderRows = trialRows.filter((r) => !r.isHeader);

  const totalActivos = nonHeaderRows
    .filter((r) => r.account_type === 'asset')
    .reduce((sum, r) => sum + (r.final_debit - r.final_credit), 0);

  const totalPasivos = nonHeaderRows
    .filter((r) => r.account_type === 'liability')
    .reduce((sum, r) => sum + (r.final_credit - r.final_debit), 0);

  const totalPatrimonio = nonHeaderRows
    .filter((r) => r.account_type === 'equity')
    .reduce((sum, r) => sum + (r.final_credit - r.final_debit), 0);

  const utilidadNeta = incomeReport?.netProfit ?? 0;

  const periodDebitTotal = nonHeaderRows.reduce((sum, r) => sum + r.period_debit, 0);
  const periodCreditTotal = nonHeaderRows.reduce((sum, r) => sum + r.period_credit, 0);

  const isBalanced = Math.abs(periodDebitTotal - periodCreditTotal) < 0.01;

  return { totalActivos, totalPasivos, totalPatrimonio, utilidadNeta, isBalanced, periodDebitTotal, periodCreditTotal };
}

// TEST RUNNER
const sampleEntries = [
  {
    id: 'e1',
    entry_number: 'NIIF-0001',
    entry_date: '2026-08-01',
    description: 'Venta de Productos "Laptops"',
    total_debit: 1160,
    total_credit: 1160,
    status: 'posted',
    lines: [
      { account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)', debit: 1160, credit: 0 },
      { account_code: '4.1.01', account_name: 'Ventas de Productos', debit: 0, credit: 1000 },
      { account_code: '2.1.02.01', account_name: 'Débito Fiscal IVA por Pagar', debit: 0, credit: 160 },
    ],
  },
  {
    id: 'e2',
    entry_number: 'NIIF-0002',
    entry_date: '2026-08-02',
    description: 'Costo de Ventas Laptops',
    total_debit: 600,
    total_credit: 600,
    status: 'posted',
    lines: [
      { account_code: '5.1', account_name: 'Costo de Ventas', debit: 600, credit: 0 },
      { account_code: '1.1.03.01', account_name: 'Mercancía para la Venta', debit: 0, credit: 600 },
    ],
  },
  {
    id: 'e3',
    entry_number: 'NIIF-0003',
    entry_date: '2026-08-03',
    description: 'Gasto de Nomina #55',
    total_debit: 200,
    total_credit: 200,
    status: 'posted',
    lines: [
      { account_code: '5.2.01', account_name: 'Sueldos y Salarios', debit: 200, credit: 0 },
      { account_code: '1.1.01.01', account_name: 'Caja Principal (Efectivo)', debit: 0, credit: 200 },
    ],
  },
];

console.log('--- EMPIRICAL TEST VERIFICATION ---');
const trial = getTrialBalance(sampleEntries);
console.log('1. Trial Balance Totals:', trial.totals);

const inc = getIncomeStatement(trial.rows);
console.log('2. Income Statement:', inc);

const kpis = computeKPIs(trial.rows, inc);
console.log('3. KPIs calculated:', kpis);

console.log('4. KPI net profit matches Income Statement net profit:', kpis.utilidadNeta === inc.netProfit);
console.log('5. Trial Balance totals match double entry total:', trial.totals.debit === trial.totals.credit);
console.log('6. Accounting Equation test (Activos === Pasivos + Patrimonio + Utilidad Neta):');
const eqCheck = kpis.totalActivos === (kpis.totalPasivos + kpis.totalPatrimonio + kpis.utilidadNeta);
console.log(`   ${kpis.totalActivos} === ${kpis.totalPasivos} + ${kpis.totalPatrimonio} + ${kpis.utilidadNeta} -> ${eqCheck}`);
