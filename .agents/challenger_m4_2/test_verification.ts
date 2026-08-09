import { DEFAULT_CHART_OF_ACCOUNTS } from '../../src/lib/core/accounting/chartOfAccounts';
import { TrialBalanceRow, IncomeStatementReport, JournalEntry } from '../../src/types/accounting';

// Simulation of getTrialBalanceAction logic
function computeTrialBalance(entries: JournalEntry[]): { rows: TrialBalanceRow[]; totals: { debit: number; credit: number } } {
  const accountTotals = new Map<string, { debit: number; credit: number }>();

  entries.forEach((entry) => {
    if (entry.status === 'annulled') return;
    entry.lines.forEach((line) => {
      const current = accountTotals.get(line.account_code) || { debit: 0, credit: 0 };
      current.debit += line.debit;
      current.credit += line.credit;
      accountTotals.set(line.account_code, current);
    });
  });

  const rows: TrialBalanceRow[] = DEFAULT_CHART_OF_ACCOUNTS.map((node) => {
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

// Simulation of getIncomeStatementAction logic
function computeIncomeStatement(trialRows: TrialBalanceRow[]): IncomeStatementReport {
  const revenueRows: Array<{ code: string; name: string; amount: number }> = [];
  const costRows: Array<{ code: string; name: string; amount: number }> = [];
  const expenseRows: Array<{ code: string; name: string; amount: number }> = [];
  const otherRows: Array<{ code: string; name: string; amount: number }> = [];

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
    period: { preset: 'all' },
    revenue: { rows: revenueRows, total: Math.round(totalRevenue * 100) / 100 },
    costOfSales: { rows: costRows, total: Math.round(totalCostOfSales * 100) / 100 },
    grossProfit: Math.round(grossProfit * 100) / 100,
    operatingExpenses: { rows: expenseRows, total: Math.round(totalOperatingExpenses * 100) / 100 },
    operatingProfit: Math.round(operatingProfit * 100) / 100,
    otherIncomeExpenses: { rows: otherRows, total: Math.round(totalOtherIncomeExpenses * 100) / 100 },
    netProfit: Math.round(netProfit * 100) / 100,
  };
}

// Simulation of AccountingKPIs logic
function computeKPIs(trialRows: TrialBalanceRow[], incomeReport?: IncomeStatementReport) {
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

// TEST CASES
const testEntries: JournalEntry[] = [
  {
    id: 'entry-1',
    tenant_id: 't-1',
    entry_number: 'NIIF-0001',
    entry_date: '2026-08-01',
    description: 'Venta de productos #101',
    total_debit: 1160,
    total_credit: 1160,
    status: 'posted',
    created_at: '2026-08-01T10:00:00Z',
    lines: [
      { id: 'l1', journal_entry_id: 'entry-1', account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)', debit: 1160, credit: 0 },
      { id: 'l2', journal_entry_id: 'entry-1', account_code: '4.1.01', account_name: 'Ventas de Productos', debit: 0, credit: 1000 },
      { id: 'l3', journal_entry_id: 'entry-1', account_code: '2.1.02.01', account_name: 'Débito Fiscal IVA por Pagar', debit: 0, credit: 160 },
    ],
  },
  {
    id: 'entry-2',
    tenant_id: 't-1',
    entry_number: 'NIIF-0002',
    entry_date: '2026-08-02',
    description: 'Costo de ventas #101',
    total_debit: 600,
    total_credit: 600,
    status: 'posted',
    created_at: '2026-08-02T10:00:00Z',
    lines: [
      { id: 'l4', journal_entry_id: 'entry-2', account_code: '5.1', account_name: 'Costo de Ventas', debit: 600, credit: 0 },
      { id: 'l5', journal_entry_id: 'entry-2', account_code: '1.1.03.01', account_name: 'Mercancía para la Venta', debit: 0, credit: 600 },
    ],
  },
  {
    id: 'entry-3',
    tenant_id: 't-1',
    entry_number: 'NIIF-0003',
    entry_date: '2026-08-03',
    description: 'Gasto de sueldo "Administración #1"',
    total_debit: 200,
    total_credit: 200,
    status: 'posted',
    created_at: '2026-08-03T10:00:00Z',
    lines: [
      { id: 'l6', journal_entry_id: 'entry-3', account_code: '5.2.01', account_name: 'Sueldos y Salarios', debit: 200, credit: 0 },
      { id: 'l7', journal_entry_id: 'entry-3', account_code: '1.1.01.01', account_name: 'Caja Principal (Efectivo)', debit: 0, credit: 200 },
    ],
  },
];

console.log('=== EMPIRICAL TEST SUITE ===');

const trialResult = computeTrialBalance(testEntries);
console.log('Trial Balance Totals:', trialResult.totals);

const incomeReport = computeIncomeStatement(trialResult.rows);
console.log('Income Statement Net Profit:', incomeReport.netProfit);
console.log('Income Statement Breakdowns:', {
  revenue: incomeReport.revenue.total,
  costOfSales: incomeReport.costOfSales.total,
  grossProfit: incomeReport.grossProfit,
  operatingExpenses: incomeReport.operatingExpenses.total,
  operatingProfit: incomeReport.operatingProfit,
  otherIncomeExpenses: incomeReport.otherIncomeExpenses.total,
});

const kpis = computeKPIs(trialResult.rows, incomeReport);
console.log('KPI Metrics:', kpis);

// Checks
console.log('\n--- VERIFICATION CHECKS ---');
console.log('Check 1: KPI Net Profit === Income Statement Net Profit:', kpis.utilidadNeta === incomeReport.netProfit);
console.log('Check 2: Trial Balance Partida Doble Balanced:', kpis.isBalanced && trialResult.totals.debit === trialResult.totals.credit);

// Test Accounting Equation: Activo = Pasivo + Patrimonio + Utilidad (or Retained Earnings)
// In trial balance before period close:
// Activo Net: 1160 (AR) - 600 (Inv) - 200 (Caja) = 360
// Pasivo Net: 160 (IVA)
// Revenue Net: 1000
// Cost Net: 600
// Expense Net: 200
// Net Profit = 1000 - 600 - 200 = 200
// Total Pasivos + Utilidad = 160 + 200 = 360 === Activo Net (360)
console.log('Check 3: Accounting Equation (Activos = Pasivos + Patrimonio + Utilidad Neta):');
console.log(`  Activos (${kpis.totalActivos}) === Pasivos (${kpis.totalPasivos}) + Patrimonio (${kpis.totalPatrimonio}) + Utilidad (${kpis.utilidadNeta})`);
console.log('  Equal?', kpis.totalActivos === kpis.totalPasivos + kpis.totalPatrimonio + kpis.utilidadNeta);
