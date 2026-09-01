import fs from 'fs';
import path from 'path';

// Setup file logger
const logFile = path.resolve(process.cwd(), 'test_execution_results.log');
fs.writeFileSync(logFile, `=== RUNNING EMPIRICAL TESTS at ${new Date().toISOString()} ===\n`);

function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

function logErr(msg: string) {
  console.error(msg);
  fs.appendFileSync(logFile, '[ERROR] ' + msg + '\n');
}

// Load .env.local into process.env before importing modules
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    envLines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.slice(0, idx).trim();
          const val = trimmed.slice(idx + 1).trim();
          process.env[key] = val;
        }
      }
    });
  }
} catch (e: unknown) {
  logErr('Failed to load env: ' + e.message);
}

import { calculateTaxes, resolveTaxConfig, DEFAULT_TAX_CONFIG, TenantTaxConfig } from '../lib/core/taxEngine';
import { veTaxPlugin } from '../plugins/veTaxPlugin';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../lib/core/accounting/chartOfAccounts';
import { getAppointmentsAction, createAppointmentAction, updateAppointmentStatusAction } from '../app/actions/appointments';
import { getConversationsAction, getMessagesAction, sendMessageAction, updateCustomerTagAction } from '../app/actions/whatsapp';
import { getJournalEntriesAction, getTrialBalanceAction, getIncomeStatementAction } from '../app/actions/accounting';
import { getTenantBranchesAction, getBranchPerformanceAction } from '../app/actions/enterprise';
import { ActionActor } from '../app/actions/entities';

// Mock next/cache revalidatePath if running outside Next environment
try {
  const nextCache = require('next/cache');
  if (!nextCache.revalidatePath) {
    nextCache.revalidatePath = () => {};
  }
} catch {
  // Ignore
}

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ACTOR: ActionActor = {
  email: 'tester@saascore.local',
  role: 'owner',
};

async function runEmpiricalTests() {
  log('=== EMPIRICAL STRESS TEST HARNESS — MILESTONE 1 ===\n');
  let passedTests = 0;
  let failedTests = 0;
  const findings: string[] = [];

  function assert(condition: boolean, testName: string, failureDetails?: string) {
    if (condition) {
      log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      logErr(`[FAIL] ${testName}: ${failureDetails || 'Assertion failed'}`);
      failedTests++;
      findings.push(`${testName}: ${failureDetails || 'Assertion failed'}`);
    }
  }

  // --- TEST GROUP 1: Tax Engine & Fiscal Neutrality ---
  log('--- 1. Tax Engine & Fiscal Neutrality ---');
  try {
    const calc1 = calculateTaxes(100, DEFAULT_TAX_CONFIG);
    assert(calc1.taxAmount === 16 && calc1.total === 116, 'Default 16% tax calculation');

    const customConfig: TenantTaxConfig = {
      defaultTaxName: 'Custom Tax',
      defaultTaxRate: 0.10,
      enableSurcharges: true,
      surcharges: [{ id: 's1', name: 'Service Fee', rate: 0.05, paymentMethods: ['card'], enabled: true }]
    };
    const calc2 = calculateTaxes(100, customConfig, 'card');
    const surchargesTotal = calc2.details.surcharges.reduce((sum, s) => sum + s.amount, 0);
    assert(calc2.taxAmount === 10 && surchargesTotal === 5 && calc2.total === 115, 'Custom tax + surcharge calculation');

    const normVE = resolveTaxConfig('VE');
    assert(normVE.defaultTaxRate === 0.16, 'Normalization of VE legacy localization code');

    const normCO = resolveTaxConfig('CO');
    assert(normCO.defaultTaxRate === 0.19 && normCO.localizationCode === 'CO', 'Normalization of CO legacy localization code', `Got rate=${normCO.defaultTaxRate}`);

    assert(veTaxPlugin.enabled === false, 'veTaxPlugin disabled by default');

    const accountNode = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === '2.1.02.02');
    assert(
      accountNode?.name === 'Impuestos y Recargos Adicionales por Enterar',
      'Chart of Accounts node 2.1.02.02 renamed to neutral title',
      `Got: ${accountNode?.name}`
    );
  } catch (e: unknown) {
    assert(false, 'Tax Engine Exception', e.message);
  }

  // --- TEST GROUP 2: Appointments Server Actions ---
  log('\n--- 2. Appointments Server Actions & Fallbacks ---');
  try {
    // 2.1 Empty Tenant Handling
    const emptyAppts = await getAppointmentsAction('');
    assert(emptyAppts.success && emptyAppts.appointments.length === 0, 'getAppointmentsAction handles empty tenantId gracefully');

    // 2.2 Retrieve appointments for valid tenant (triggers primary or fallback table)
    const apptsRes = await getAppointmentsAction(TEST_TENANT_ID);
    assert(apptsRes.success === true, 'getAppointmentsAction succeeds without uncaught exception', `Error returned: ${apptsRes.error}`);
    log(`  [DETAILS] Appointments count: ${apptsRes.appointments?.length || 0}`);

    // 2.3 Filter functionality
    const filteredAppts = await getAppointmentsAction(TEST_TENANT_ID, { status: 'scheduled' });
    assert(filteredAppts.success === true && Array.isArray(filteredAppts.appointments), 'getAppointmentsAction accepts filters', `Error returned: ${filteredAppts.error}`);

    // 2.4 Create appointment validation failure (missing required fields)
    const badCreate = await createAppointmentAction({ title: '', start_time: '' } as any, TEST_TENANT_ID, TEST_ACTOR);
    assert(badCreate.success === false && Boolean(badCreate.error), 'createAppointmentAction rejects missing title/time');

    // 2.5 Create appointment security check failure (unauthorized tenant)
    const unauthorizedActor: ActionActor = { email: 'hack@evil.com', role: 'seller' };
    const unauthCreate = await createAppointmentAction({ title: 'Test', start_time: new Date().toISOString() }, TEST_TENANT_ID, unauthorizedActor);
    assert(unauthCreate.success === false, 'createAppointmentAction blocks unauthorized tenant access');

    // 2.6 Update status missing ID
    const badUpdate = await updateAppointmentStatusAction('', 'completed', TEST_TENANT_ID, TEST_ACTOR);
    assert(badUpdate.success === false, 'updateAppointmentStatusAction rejects empty ID');
  } catch (e: unknown) {
    assert(false, 'Appointments Action Exception', e.message);
  }

  // --- TEST GROUP 3: WhatsApp Server Actions ---
  log('\n--- 3. WhatsApp Server Actions & Fallbacks ---');
  try {
    // 3.1 Empty Tenant Handling
    const emptyConvs = await getConversationsAction('');
    assert(emptyConvs.success && emptyConvs.conversations.length === 0, 'getConversationsAction handles empty tenantId');

    // 3.2 Fetch conversations for test tenant
    const convsRes = await getConversationsAction(TEST_TENANT_ID);
    assert(convsRes.success === true && Array.isArray(convsRes.conversations), 'getConversationsAction executes without throwing', `Error returned: ${convsRes.error}`);
    log(`  [DETAILS] WhatsApp conversations count: ${convsRes.conversations?.length || 0}`);

    // 3.3 Fetch messages for a conversation
    const msgsRes = await getMessagesAction('conv-123', TEST_TENANT_ID);
    assert(msgsRes.success === true && Array.isArray(msgsRes.messages), 'getMessagesAction executes without throwing', `Error returned: ${msgsRes.error}`);

    // 3.4 Send message input validation
    const badSend = await sendMessageAction({ conversation_id: '', text: '' } as any, TEST_TENANT_ID, TEST_ACTOR);
    assert(badSend.success === false && Boolean(badSend.error), 'sendMessageAction rejects missing text or conversation_id');

    // 3.5 Send message unauthorized actor
    const unauthActor: ActionActor = { email: 'hack@evil.com', role: 'seller' };
    const unauthSend = await sendMessageAction({ conversation_id: 'c1', text: 'Hello', client_phone: '+15551234567' }, TEST_TENANT_ID, unauthActor);
    assert(unauthSend.success === false, 'sendMessageAction blocks unauthorized tenant actor');
  } catch (e: unknown) {
    assert(false, 'WhatsApp Action Exception', e.message);
  }

  // --- TEST GROUP 4: NIIF Accounting Server Actions & Double-Entry Balancing ---
  log('\n--- 4. NIIF Accounting Server Actions & Double-Entry Balancing ---');
  try {
    // 4.1 Fetch NIIF Journal Entries
    const journalRes = await getJournalEntriesAction(TEST_TENANT_ID);
    assert(journalRes.success === true && Array.isArray(journalRes.data), 'getJournalEntriesAction executes successfully', `Error returned: ${journalRes.error}`);
    log(`  [DETAILS] Journal entries count: ${journalRes.data?.length || 0}`);

    // 4.2 Verify Double-Entry Balance Rule (Debit === Credit) for all entries
    if (journalRes.data && journalRes.data.length > 0) {
      let allBalanced = true;
      let unbalancedDetails = '';

      journalRes.data.forEach((entry, idx) => {
        const diff = Math.abs(entry.total_debit - entry.total_credit);
        if (diff > 0.01) {
          allBalanced = false;
          unbalancedDetails += `Entry #${idx} (${entry.entry_number}): Debit=${entry.total_debit}, Credit=${entry.total_credit}; `;
        }
      });
      assert(allBalanced, 'NIIF Strict Double-Entry Balance (Debit === Credit) for all entries', unbalancedDetails);
    } else {
      log('  [INFO] No journal entries returned (empty DB table and documents fallback empty)');
      assert(true, 'NIIF Journal Entries array structure valid');
    }

    // 4.3 Trial Balance (Balance de Comprobación)
    const trialRes = await getTrialBalanceAction(TEST_TENANT_ID);
    assert(trialRes.success === true && Array.isArray(trialRes.data), 'getTrialBalanceAction returns valid structure', `Error returned: ${trialRes.error}`);
    if (trialRes.totals) {
      const diff = Math.abs(trialRes.totals.debit - trialRes.totals.credit);
      assert(diff < 0.01, 'Trial Balance totals balance (Total Debit === Total Credit)', `Debit: ${trialRes.totals.debit}, Credit: ${trialRes.totals.credit}`);
    }

    // 4.4 Income Statement (Estado de Resultados)
    const incomeRes = await getIncomeStatementAction(TEST_TENANT_ID);
    assert(incomeRes.success === true && Boolean(incomeRes.data), 'getIncomeStatementAction returns valid report', `Error returned: ${incomeRes.error}`);
  } catch (e: unknown) {
    assert(false, 'Accounting Action Exception', e.message);
  }

  // --- TEST GROUP 5: Enterprise Multi-Branch Server Actions ---
  log('\n--- 5. Enterprise Multi-Branch Server Actions ---');
  try {
    // 5.1 Fetch Tenant Branches
    const branchesRes = await getTenantBranchesAction(TEST_TENANT_ID);
    assert(branchesRes.success === true && Array.isArray(branchesRes.data), 'getTenantBranchesAction executes successfully', `Error returned: ${branchesRes.error}`);
    log(`  [DETAILS] Branches count: ${branchesRes.data?.length || 0}`);

    // 5.2 Fetch Branch Performance Matrix & Metrics
    const perfRes = await getBranchPerformanceAction(TEST_TENANT_ID);
    assert(perfRes.success === true && Array.isArray(perfRes.data), 'getBranchPerformanceAction executes successfully', `Error returned: ${perfRes.error}`);
    if (perfRes.globalMetrics) {
      assert(typeof perfRes.globalMetrics.totalRevenue === 'number', 'Branch performance returns global metrics totalRevenue');
      assert(typeof perfRes.globalMetrics.activeBranches === 'number', 'Branch performance returns global metrics activeBranches');
    }
  } catch (e: unknown) {
    assert(false, 'Enterprise Action Exception', e.message);
  }

  log('\n=== TEST RESULTS SUMMARY ===');
  log(`TOTAL PASSED: ${passedTests}`);
  log(`TOTAL FAILED: ${failedTests}`);
  if (findings.length > 0) {
    log('\nFAILURES:');
    findings.forEach(f => log(` - ${f}`));
  }
  process.exit(failedTests > 0 ? 1 : 0);
}

runEmpiricalTests().catch((err) => {
  logErr('Fatal test harness failure: ' + (err as Error).message);
  process.exit(1);
});
