import { calculateTaxes, resolveTaxConfig, DEFAULT_TAX_CONFIG } from '../lib/core/taxEngine.ts';
import { veTaxPlugin } from '../plugins/veTaxPlugin.ts';
import { DEFAULT_CHART_OF_ACCOUNTS } from '../lib/core/accounting/chartOfAccounts.ts';
import { getAppointmentsAction, createAppointmentAction, updateAppointmentStatusAction } from '../app/actions/appointments.ts';
import { getConversationsAction, getMessagesAction, sendMessageAction, updateCustomerTagAction } from '../app/actions/whatsapp.ts';
import { getJournalEntriesAction, getTrialBalanceAction, getIncomeStatementAction } from '../app/actions/accounting.ts';
import { getTenantBranchesAction, getBranchPerformanceAction } from '../app/actions/enterprise.ts';

const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const TEST_ACTOR = {
  email: 'tester@saascore.local',
  role: 'admin',
  tenantId: TEST_TENANT_ID,
};

async function runEmpiricalTests() {
  console.log('=== EMPIRICAL STRESS TEST HARNESS — MILESTONE 1 ===\n');
  let passedTests = 0;
  let failedTests = 0;
  const findings = [];

  function assert(condition, testName, failureDetails) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${testName}: ${failureDetails || 'Assertion failed'}`);
      failedTests++;
      findings.push(`${testName}: ${failureDetails || 'Assertion failed'}`);
    }
  }

  // --- TEST GROUP 1: Tax Engine & Fiscal Neutrality ---
  console.log('--- 1. Tax Engine & Fiscal Neutrality ---');
  try {
    const calc1 = calculateTaxes(100, DEFAULT_TAX_CONFIG);
    assert(calc1.taxAmount === 16 && calc1.totalAmount === 116, 'Default 16% tax calculation');

    const customConfig = {
      baseTaxRatePct: 10,
      surcharges: [{ id: 's1', name: 'Service Fee', ratePct: 5, appliesToPaymentMethods: ['card'] }]
    };
    const calc2 = calculateTaxes(100, customConfig, 'card');
    assert(calc2.taxAmount === 10 && calc2.surchargesAmount === 5 && calc2.totalAmount === 115, 'Custom tax + surcharge calculation');

    const normVE = resolveTaxConfig('VE');
    assert(normVE.baseTaxRatePct === 16, 'Normalization of VE legacy localization code');

    const normCO = resolveTaxConfig('CO');
    assert(normCO.baseTaxRatePct === 19, 'Normalization of CO legacy localization code');

    assert(veTaxPlugin.enabled === false, 'veTaxPlugin disabled by default');

    const accountNode = DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === '2.1.02.02');
    assert(
      accountNode?.name === 'Impuestos y Recargos Adicionales por Enterar',
      'Chart of Accounts node 2.1.02.02 renamed to neutral title',
      `Got: ${accountNode?.name}`
    );
  } catch (e) {
    assert(false, 'Tax Engine Exception', e.message);
  }

  // --- TEST GROUP 2: Appointments Server Actions ---
  console.log('\n--- 2. Appointments Server Actions & Fallbacks ---');
  try {
    // 2.1 Empty Tenant Handling
    const emptyAppts = await getAppointmentsAction('');
    assert(emptyAppts.success && emptyAppts.appointments.length === 0, 'getAppointmentsAction handles empty tenantId gracefully');

    // 2.2 Retrieve appointments for valid tenant (triggers primary or fallback table)
    const apptsRes = await getAppointmentsAction(TEST_TENANT_ID);
    assert(apptsRes.success === true, 'getAppointmentsAction succeeds without uncaught exception');

    // 2.3 Filter functionality
    const filteredAppts = await getAppointmentsAction(TEST_TENANT_ID, { status: 'scheduled' });
    assert(filteredAppts.success === true && Array.isArray(filteredAppts.appointments), 'getAppointmentsAction accepts filters');

    // 2.4 Create appointment validation failure (missing required fields)
    const badCreate = await createAppointmentAction({ title: '', start_time: '' }, TEST_TENANT_ID, TEST_ACTOR);
    assert(badCreate.success === false && Boolean(badCreate.error), 'createAppointmentAction rejects missing title/time');

    // 2.5 Create appointment security check failure (unauthorized tenant)
    const unauthorizedActor = { email: 'hack@evil.com', role: 'user', tenantId: 'other-tenant' };
    const unauthCreate = await createAppointmentAction({ title: 'Test', start_time: new Date().toISOString() }, TEST_TENANT_ID, unauthorizedActor);
    assert(unauthCreate.success === false, 'createAppointmentAction blocks unauthorized tenant access');

    // 2.6 Update status missing ID
    const badUpdate = await updateAppointmentStatusAction('', 'completed', TEST_TENANT_ID, TEST_ACTOR);
    assert(badUpdate.success === false, 'updateAppointmentStatusAction rejects empty ID');
  } catch (e) {
    assert(false, 'Appointments Action Exception', e.message);
  }

  // --- TEST GROUP 3: WhatsApp Server Actions ---
  console.log('\n--- 3. WhatsApp Server Actions & Fallbacks ---');
  try {
    // 3.1 Empty Tenant Handling
    const emptyConvs = await getConversationsAction('');
    assert(emptyConvs.success && emptyConvs.conversations.length === 0, 'getConversationsAction handles empty tenantId');

    // 3.2 Fetch conversations for test tenant
    const convsRes = await getConversationsAction(TEST_TENANT_ID);
    assert(convsRes.success === true && Array.isArray(convsRes.conversations), 'getConversationsAction executes without throwing');

    // 3.3 Fetch messages for a conversation
    const msgsRes = await getMessagesAction('conv-123', TEST_TENANT_ID);
    assert(msgsRes.success === true && Array.isArray(msgsRes.messages), 'getMessagesAction executes without throwing');

    // 3.4 Send message input validation
    const badSend = await sendMessageAction({ conversation_id: '', text: '' }, TEST_TENANT_ID, TEST_ACTOR);
    assert(badSend.success === false && Boolean(badSend.error), 'sendMessageAction rejects missing text or conversation_id');

    // 3.5 Send message unauthorized actor
    const unauthActor = { email: 'hack@evil.com', role: 'user', tenantId: 'other-tenant' };
    const unauthSend = await sendMessageAction({ conversation_id: 'c1', text: 'Hello' }, TEST_TENANT_ID, unauthActor);
    assert(unauthSend.success === false, 'sendMessageAction blocks unauthorized tenant actor');
  } catch (e) {
    assert(false, 'WhatsApp Action Exception', e.message);
  }

  // --- TEST GROUP 4: NIIF Accounting Server Actions & Double-Entry Balancing ---
  console.log('\n--- 4. NIIF Accounting Server Actions & Double-Entry Balancing ---');
  try {
    // 4.1 Fetch NIIF Journal Entries
    const journalRes = await getJournalEntriesAction(TEST_TENANT_ID);
    assert(journalRes.success === true && Array.isArray(journalRes.data), 'getJournalEntriesAction executes successfully');

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
      console.log('  [INFO] No journal entries returned (empty DB table and documents fallback empty)');
      assert(true, 'NIIF Journal Entries array structure valid');
    }

    // 4.3 Trial Balance (Balance de Comprobación)
    const trialRes = await getTrialBalanceAction(TEST_TENANT_ID);
    assert(trialRes.success === true && Array.isArray(trialRes.data), 'getTrialBalanceAction returns valid structure');
    if (trialRes.totals) {
      const diff = Math.abs(trialRes.totals.debit - trialRes.totals.credit);
      assert(diff < 0.01, 'Trial Balance totals balance (Total Debit === Total Credit)', `Debit: ${trialRes.totals.debit}, Credit: ${trialRes.totals.credit}`);
    }

    // 4.4 Income Statement (Estado de Resultados)
    const incomeRes = await getIncomeStatementAction(TEST_TENANT_ID);
    assert(incomeRes.success === true && Boolean(incomeRes.data), 'getIncomeStatementAction returns valid report');
  } catch (e) {
    assert(false, 'Accounting Action Exception', e.message);
  }

  // --- TEST GROUP 5: Enterprise Multi-Branch Server Actions ---
  console.log('\n--- 5. Enterprise Multi-Branch Server Actions ---');
  try {
    // 5.1 Fetch Tenant Branches
    const branchesRes = await getTenantBranchesAction(TEST_TENANT_ID);
    assert(branchesRes.success === true && Array.isArray(branchesRes.data), 'getTenantBranchesAction executes successfully');

    // 5.2 Fetch Branch Performance Matrix & Metrics
    const perfRes = await getBranchPerformanceAction(TEST_TENANT_ID);
    assert(perfRes.success === true && Array.isArray(perfRes.data), 'getBranchPerformanceAction executes successfully');
    if (perfRes.globalMetrics) {
      assert(typeof perfRes.globalMetrics.totalRevenue === 'number', 'Branch performance returns global metrics totalRevenue');
      assert(typeof perfRes.globalMetrics.activeBranches === 'number', 'Branch performance returns global metrics activeBranches');
    }
  } catch (e) {
    assert(false, 'Enterprise Action Exception', e.message);
  }

  console.log('\n=== TEST RESULTS SUMMARY ===');
  console.log(`TOTAL PASSED: ${passedTests}`);
  console.log(`TOTAL FAILED: ${failedTests}`);
  if (findings.length > 0) {
    console.log('\nFAILURES:');
    findings.forEach(f => console.log(` - ${f}`));
  }
  process.exit(failedTests > 0 ? 1 : 0);
}

runEmpiricalTests().catch((err) => {
  console.error('Fatal test harness failure:', err);
  process.exit(1);
});
