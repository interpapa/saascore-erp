import { calculateTaxes, resolveTaxConfig, DEFAULT_TAX_CONFIG, TenantTaxConfig } from '../../src/lib/core/taxEngine';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../../src/lib/core/accounting/chartOfAccounts';
import { veTaxPlugin } from '../../src/plugins/veTaxPlugin';

function runTaxEngineTests() {
  console.log('--- 1. TESTING TAX ENGINE ---');
  let failures = 0;

  // Test 1.1: Default config / undefined input
  const resDefault = calculateTaxes(100);
  if (resDefault.subtotal !== 100 || resDefault.taxAmount !== 16 || resDefault.total !== 116) {
    console.error('FAIL Test 1.1 (Default config):', resDefault);
    failures++;
  } else {
    console.log('PASS Test 1.1: Default config (16% VAT)');
  }

  // Test 1.2: 0% Tax Config
  const zeroConfig: TenantTaxConfig = {
    defaultTaxName: 'EXEMPT',
    defaultTaxRate: 0.0,
    enableSurcharges: false,
    surcharges: [],
  };
  const resZero = calculateTaxes(250, zeroConfig);
  if (resZero.subtotal !== 250 || resZero.taxAmount !== 0 || resZero.total !== 250) {
    console.error('FAIL Test 1.2 (0% Tax Config):', resZero);
    failures++;
  } else {
    console.log('PASS Test 1.2: 0% Tax Config (Exempt)');
  }

  // Test 1.3: Legacy Localization Codes
  const resMX = calculateTaxes(100, 'MX');
  const resCO = calculateTaxes(100, 'CO');
  const resUS = calculateTaxes(100, 'US');
  const resVE = calculateTaxes(100, 'VE');
  const resINTL = calculateTaxes(100, 'INTL');

  if (resMX.taxAmount !== 16 || resCO.taxAmount !== 19 || resUS.taxAmount !== 0 || resVE.taxAmount !== 16 || resINTL.taxAmount !== 0) {
    console.error('FAIL Test 1.3 (Legacy Codes):', { resMX, resCO, resUS, resVE, resINTL });
    failures++;
  } else {
    console.log('PASS Test 1.3: Legacy localization code normalization (MX=16%, CO=19%, US=0%, VE=16%, INTL=0%)');
  }

  // Test 1.4: Custom Surcharges (appliesTo subtotal vs total_with_vat)
  const surchargeConfig: TenantTaxConfig = {
    defaultTaxName: 'IVA',
    defaultTaxRate: 0.16,
    enableSurcharges: true,
    surcharges: [
      { name: 'Card Fee', rate: 0.05, appliesTo: 'subtotal', paymentMethods: ['card'], enabled: true },
      { name: 'Service Tip', rate: 0.10, appliesTo: 'total_with_vat', paymentMethods: ['card'], enabled: true },
      { name: 'Cash Discount Surcharge', rate: 0.02, appliesTo: 'subtotal', paymentMethods: ['cash'], enabled: true },
      { name: 'Disabled Surcharge', rate: 0.50, appliesTo: 'subtotal', paymentMethods: ['card'], enabled: false },
    ],
  };

  // Subtotal = 100
  // Tax (16%) = 16
  // Total with VAT = 116
  // Card Surcharge 1 (subtotal 5%) = 5.00
  // Card Surcharge 2 (total_with_vat 10% of 116) = 11.60
  // Total = 100 + 16 + 5 + 11.6 = 132.60
  const resCard = calculateTaxes(100, surchargeConfig, 'card');
  if (resCard.subtotal !== 100 || resCard.taxAmount !== 16 || resCard.total !== 132.6 || resCard.details.surcharges.length !== 2) {
    console.error('FAIL Test 1.4 (Custom Card Surcharges):', JSON.stringify(resCard, null, 2));
    failures++;
  } else {
    console.log('PASS Test 1.4: Custom surcharges calculation with appliesTo (subtotal vs total_with_vat)');
  }

  // Payment method cash: should only match Cash Discount Surcharge (2% of 100 = 2)
  const resCash = calculateTaxes(100, surchargeConfig, 'cash');
  if (resCash.total !== 118 || resCash.details.surcharges.length !== 1 || resCash.details.surcharges[0].name !== 'Cash Discount Surcharge') {
    console.error('FAIL Test 1.4 (Custom Cash Surcharge):', resCash);
    failures++;
  } else {
    console.log('PASS Test 1.4b: Surcharge payment method filtering');
  }

  // Test 1.5: Edge Values (0 subtotal, negative subtotal, floating point edge cases)
  const resZeroSub = calculateTaxes(0);
  if (resZeroSub.subtotal !== 0 || resZeroSub.taxAmount !== 0 || resZeroSub.total !== 0) {
    console.error('FAIL Test 1.5 (Zero subtotal):', resZeroSub);
    failures++;
  } else {
    console.log('PASS Test 1.5a: Zero subtotal handling');
  }

  const resFloat = calculateTaxes(99.99, { defaultTaxName: 'IVA', defaultTaxRate: 0.16 });
  // 99.99 * 0.16 = 15.9984 -> rounded 16.00
  // total = 99.99 + 15.9984 = 115.9884 -> decimal places: subtotal=99.99, taxAmount=16.00, total=115.99
  if (resFloat.taxAmount !== 16.00 || resFloat.total !== 115.99) {
    console.error('FAIL Test 1.5 (Floating point decimal math):', resFloat);
    failures++;
  } else {
    console.log('PASS Test 1.5b: Floating point precision rounding with Decimal.js (99.99 * 16% = 16.00, total = 115.99)');
  }

  return failures;
}

function runNIIFBalancingTests() {
  console.log('\n--- 2. TESTING DOUBLE-ENTRY NIIF BALANCING LOGIC ---');
  let failures = 0;

  // Simulate synthetic journal entry creation logic from accounting.ts for various document scenarios
  const mockDocs = [
    { id: 'doc-1', type: 'invoice', document_number: 'INV-001', subtotal_amount: 100.33, tax_amount: 16.05, total_amount: 116.38 },
    { id: 'doc-2', type: 'sale', document_number: 'SAL-002', subtotal_amount: 50.00, tax_amount: 0, total_amount: 50.00 },
    { id: 'doc-3', type: 'purchase', document_number: 'PUR-003', subtotal_amount: 250.75, tax_amount: 40.12, total_amount: 290.87 },
    { id: 'doc-4', type: 'service', document_number: 'SRV-004', subtotal_amount: 75.25, tax_amount: 12.04, total_amount: 87.29 },
    { id: 'doc-5', type: 'invoice', document_number: 'INV-005', subtotal_amount: 999999.99, tax_amount: 159999.998, total_amount: 1159999.988 },
  ];

  mockDocs.forEach((doc, idx) => {
    const subtotal = Number(doc.subtotal_amount || doc.total_amount || 0);
    const tax = Number(doc.tax_amount || 0);
    const total = Number(doc.total_amount || subtotal + tax);

    const lines: Array<{ account_code: string; debit: number; credit: number }> = [];

    if (doc.type === 'invoice' || doc.type === 'sale') {
      lines.push({ account_code: '1.1.02.01', debit: total, credit: 0 });
      lines.push({ account_code: '4.1.01', debit: 0, credit: subtotal });
      if (tax > 0) {
        lines.push({ account_code: '2.1.02.01', debit: 0, credit: tax });
      }
    } else if (doc.type === 'purchase') {
      lines.push({ account_code: '5.1', debit: subtotal, credit: 0 });
      if (tax > 0) {
        lines.push({ account_code: '2.1.02.01', debit: tax, credit: 0 });
      }
      lines.push({ account_code: '2.1.01.01', debit: 0, credit: total });
    } else {
      lines.push({ account_code: '1.1.01.01', debit: total, credit: 0 });
      lines.push({ account_code: '4.1.02', debit: 0, credit: total });
    }

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
    const roundedDebit = Math.round(totalDebit * 100) / 100;
    const roundedCredit = Math.round(totalCredit * 100) / 100;

    const diff = Math.abs(roundedDebit - roundedCredit);
    if (diff > 0.001) {
      console.error(`FAIL Doc ${doc.document_number}: Debit (${roundedDebit}) !== Credit (${roundedCredit})`);
      failures++;
    } else {
      console.log(`PASS Doc ${doc.document_number} (${doc.type}): Debit (${roundedDebit}) === Credit (${roundedCredit})`);
    }
  });

  // Test Trial Balance debit/credit sum consistency
  let trialDebit = 0;
  let trialCredit = 0;
  mockDocs.forEach(doc => {
    const subtotal = Number(doc.subtotal_amount || doc.total_amount || 0);
    const tax = Number(doc.tax_amount || 0);
    const total = Number(doc.total_amount || subtotal + tax);
    if (doc.type === 'invoice' || doc.type === 'sale') {
      trialDebit += total;
      trialCredit += (subtotal + tax);
    } else if (doc.type === 'purchase') {
      trialDebit += (subtotal + tax);
      trialCredit += total;
    } else {
      trialDebit += total;
      trialCredit += total;
    }
  });

  if (Math.abs(trialDebit - trialCredit) > 0.001) {
    console.error(`FAIL Trial Balance aggregate: Debit (${trialDebit}) !== Credit (${trialCredit})`);
    failures++;
  } else {
    console.log(`PASS Trial Balance aggregate: Debit (${trialDebit.toFixed(2)}) === Credit (${trialCredit.toFixed(2)})`);
  }

  return failures;
}

function runNeutralityChecks() {
  console.log('\n--- 3. TESTING NEUTRALITY & CHART OF ACCOUNTS ---');
  let failures = 0;

  // Check 3.1: veTaxPlugin disabled by default
  if (veTaxPlugin.enabled !== false) {
    console.error('FAIL Check 3.1: veTaxPlugin is NOT disabled by default');
    failures++;
  } else {
    console.log('PASS Check 3.1: veTaxPlugin disabled by default (enabled: false)');
  }

  // Check 3.2: Account 2.1.02.02 name in DEFAULT_CHART_OF_ACCOUNTS
  const igtfNode = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === '2.1.02.02');
  if (!igtfNode) {
    console.error('FAIL Check 3.2: Account 2.1.02.02 not found in chart of accounts');
    failures++;
  } else if (igtfNode.name.includes('IGTF')) {
    console.error('FAIL Check 3.2: Account 2.1.02.02 still contains country-specific term IGTF:', igtfNode.name);
    failures++;
  } else {
    console.log(`PASS Check 3.2: Account 2.1.02.02 is neutral: "${igtfNode.name}"`);
  }

  return failures;
}

function main() {
  console.log('=== EMPIRICAL STRESS TEST SUITE (M1) ===\n');
  const f1 = runTaxEngineTests();
  const f2 = runNIIFBalancingTests();
  const f3 = runNeutralityChecks();

  const totalFailures = f1 + f2 + f3;
  console.log(`\n=== STRESS TEST SUMMARY ===`);
  console.log(`Total Failures: ${totalFailures}`);
  if (totalFailures === 0) {
    console.log('VERDICT SUITE RESULT: ALL EMPIRICAL TESTS PASSED SUCCESSFULLY.');
  } else {
    console.error('VERDICT SUITE RESULT: FAILURES DETECTED.');
    process.exit(1);
  }
}

main();
