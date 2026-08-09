# Handoff Report: Milestone 1 — Neutral Configurable Tax Engine Refactoring

## 1. Observation

### Key File Findings and Verbatim Evidence

1. **`src/lib/core/taxEngine.ts`**
   - Lines 3-4: `export type LocalizationCode = 'VE' | 'INTL' | 'MX' | 'CO' | 'US';`
   - Lines 25-29: `export function calculateTaxes(subtotalNum: number, localizationCode: LocalizationCode, paymentMethod?: string): TaxCalculationResult`
   - Lines 38-56:
     ```ts
     switch (localizationCode) {
       case 'VE':
         taxRateStr = '0.16';
         taxName = 'IVA';
         if (paymentMethod === 'divisas') {
           const igtfRateStr = '0.03';
           const currentTax = subtotal.times(taxRateStr);
           const baseForIgtf = subtotal.plus(currentTax);
           const igtfAmount = baseForIgtf.times(igtfRateStr);
           surcharges.push({
             name: 'IGTF',
             amount: igtfAmount.toDecimalPlaces(2).toNumber(),
             rate: Number(igtfRateStr)
           });
         }
         break;
     ```
   - Observation: Hardcodes country-specific logic (`'VE'`, `'MX'`, `'CO'`, `'US'`, `'INTL'`) and embeds Venezuelan IGTF 3% surcharge rule on foreign currency (`divisas`).

2. **`src/plugins/veTaxPlugin.ts`**
   - Lines 10-30:
     ```ts
     export const veTaxPlugin: SaaSPlugin = {
       id: 'plugin-ve-tax-fiscal',
       name: 'Venezuela Fiscal & IGTF Extension',
       description: 'Procesa impuestos específicos de Venezuela (IGTF 3%) e integra notificaciones fiscales al completar ventas.',
       enabled: true,
       filters: {
         'checkout:tax_calculation': (payload) => {
           if (payload.paymentMethod === 'cash_usd') {
             payload.extraTaxes = payload.extraTaxes || [];
             payload.extraTaxes.push({
               name: 'IGTF (Impuesto a Grandes Transacciones Financieras)',
               rate: 0.03,
               amount: payload.subtotal * 0.03,
             });
           }
           return payload;
         },
       },
     ```
   - Observation: Hardcodes single-country Venezuelan tax logic inside a community plugin enabled by default.

3. **`src/lib/core/plugins/pluginRegistry.ts`**
   - Lines 11-17:
     ```ts
     export function initializePlugins(): void {
       if (initialized) return;
       try {
         pluginManager.registerPlugin(veTaxPlugin);
         initialized = true;
         console.log('[PluginRegistry] Core plugins initialized.');
     ```
   - Observation: Automatically registers `veTaxPlugin` on global application boot, forcing single-country tax logic onto all tenants regardless of region.

4. **`src/lib/core/accounting/chartOfAccounts.ts`**
   - Lines 39-41:
     ```ts
     { code: '2.1.02', name: 'Obligaciones Fiscales e Impuestos', type: 'liability', level: 3, parentCode: '2.1', isHeader: true },
     { code: '2.1.02.01', name: 'Débito Fiscal IVA por Pagar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
     { code: '2.1.02.02', name: 'Retenciones IGTF por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
     ```
   - Observation: Contains country-specific account name (`Retenciones IGTF por Enterar` at `2.1.02.02`).

5. **`src/app/actions/checkout.ts`**
   - Lines 31, 152:
     ```ts
     localizationCode: LocalizationCode = 'VE',
     ...
     const taxResult = calculateTaxes(subtotalDecimal.toNumber(), localizationCode, paymentMethod);
     ```
   - Observation: Hardcodes default parameter `localizationCode = 'VE'` and calls `calculateTaxes` without passing `tenant.metadata.tax_config`.

6. **Technical Verification Baseline**
   - Executed command: `cmd /c "npx tsc --noEmit"`
   - Result: Exit code 0 (0 compilation errors).

---

## 2. Logic Chain

1. **Problem Statement**: The current tax engine relies on hardcoded country switches (`VE`, `MX`, `CO`, `US`) and embeds specific fiscal rules (Venezuela's 3% IGTF) directly into core domain logic (`taxEngine.ts`), sample plugins (`veTaxPlugin.ts`), boot initializers (`pluginRegistry.ts`), default parameter defaults (`checkout.ts`), and chart of accounts (`chartOfAccounts.ts`).
2. **Impact**: Multi-tenant SaaS instances outside Venezuela or operating in multiple jurisdictions cannot configure custom tax rates (e.g., 7% Sales Tax, 19% VAT, custom surcharges) via tenant metadata without hitting hardcoded country branches or having single-country plugins injected.
3. **Solution Principles**:
   - Define a neutral, structured `TenantTaxConfig` interface stored in `tenant.metadata.tax_config`.
   - Refactor `taxEngine.ts` to read `TenantTaxConfig`, evaluating tax rates and surcharges dynamically based on tenant rules (e.g. rate, calculation base, payment method conditions).
   - Provide a backwards-compatible overload/fallback in `taxEngine.ts` so calls omitting `tax_config` or passing legacy `localizationCode` return standard configurable VAT (e.g., 16% IVA) without breaking existing signatures or throwing errors.
   - Refactor `chartOfAccounts.ts` to rename `2.1.02.02` to `Impuestos y Recargos Adicionales por Enterar`.
   - Unregister `veTaxPlugin` from auto-boot in `pluginRegistry.ts` and set `veTaxPlugin.enabled = false` (or make it an opt-in template).
   - Update `checkout.ts` to read `tenant.metadata?.tax_config` from the tenant record and pass it to `calculateTaxes`.

---

## 3. Caveats

- **Assumption on DB Schema**: `tenants.metadata` is a JSONB column in PostgreSQL. No database schema migration (`ALTER TABLE`) is required because `tax_config` can be stored directly inside `metadata->'tax_config'`.
- **Backwards Compatibility**: Code relying on legacy `calculateTaxes(subtotal, 'VE', paymentMethod)` must continue working seamlessly by mapping legacy string arguments to default neutral `TenantTaxConfig` instances.
- **Unexplored Areas**: Multi-jurisdiction invoice line-level tax override (e.g. line-item specific tax exemptions). Current scope focuses on document-level tenant tax configuration as specified in `PROJECT.md` Requirement R3.

---

## 4. Conclusion & Implementation Strategy

### A. Interface & Type Specification

Add the following neutral interfaces in `src/lib/core/taxEngine.ts`:

```ts
import Decimal from 'decimal.js';

export interface TaxSurchargeRule {
  id?: string;
  name: string;                               // e.g. "IGTF", "Municipal Tax", "Luxury Surcharge"
  rate: number;                               // Decimal rate e.g. 0.03 for 3%
  appliesTo?: 'subtotal' | 'total_with_vat'; // Base for calculation
  paymentMethods?: string[];                  // Target payment methods (e.g. ['divisas', 'cash_usd'])
  enabled?: boolean;
}

export interface TenantTaxConfig {
  defaultTaxName: string;                     // e.g. "IVA", "VAT", "Sales Tax", "EXEMPT"
  defaultTaxRate: number;                     // e.g. 0.16, 0.19, 0.07, 0.0
  enableSurcharges?: boolean;
  surcharges?: TaxSurchargeRule[];
  localizationCode?: string;                  // Regional code tag (e.g. "VE", "MX", "CO", "US", "INTL")
}

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  details: {
    taxRate: number;
    taxName: string;
    surcharges: Array<{
      name: string;
      amount: number;
      rate: number;
    }>;
  };
}

export type LocalizationCode = 'VE' | 'INTL' | 'MX' | 'CO' | 'US' | string;
```

---

### B. Target File Modifications

#### File 1: `src/lib/core/taxEngine.ts`

**Proposed Replacement**:
```ts
import Decimal from 'decimal.js';

export interface TaxSurchargeRule {
  id?: string;
  name: string;
  rate: number;
  appliesTo?: 'subtotal' | 'total_with_vat';
  paymentMethods?: string[];
  enabled?: boolean;
}

export interface TenantTaxConfig {
  defaultTaxName: string;
  defaultTaxRate: number;
  enableSurcharges?: boolean;
  surcharges?: TaxSurchargeRule[];
  localizationCode?: string;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  details: {
    taxRate: number;
    taxName: string;
    surcharges: Array<{
      name: string;
      amount: number;
      rate: number;
    }>;
  };
}

export type LocalizationCode = 'VE' | 'INTL' | 'MX' | 'CO' | 'US' | string;

export const DEFAULT_TAX_CONFIG: TenantTaxConfig = {
  defaultTaxName: 'IVA',
  defaultTaxRate: 0.16,
  enableSurcharges: false,
  surcharges: [],
  localizationCode: 'INTL',
};

/**
 * Normalizes input configuration or legacy localization code into TenantTaxConfig.
 */
export function resolveTaxConfig(configInput?: TenantTaxConfig | LocalizationCode | null): TenantTaxConfig {
  if (!configInput) {
    return DEFAULT_TAX_CONFIG;
  }

  if (typeof configInput === 'string') {
    switch (configInput) {
      case 'MX':
        return { defaultTaxName: 'IVA (CFDI)', defaultTaxRate: 0.16, localizationCode: 'MX' };
      case 'CO':
        return { defaultTaxName: 'IVA', defaultTaxRate: 0.19, localizationCode: 'CO' };
      case 'US':
        return { defaultTaxName: 'Sales Tax', defaultTaxRate: 0.0, localizationCode: 'US' };
      case 'VE':
        return { defaultTaxName: 'IVA', defaultTaxRate: 0.16, localizationCode: 'VE' };
      case 'INTL':
      default:
        return { defaultTaxName: 'EXEMPT', defaultTaxRate: 0.0, localizationCode: 'INTL' };
    }
  }

  return {
    defaultTaxName: configInput.defaultTaxName || 'IVA',
    defaultTaxRate: typeof configInput.defaultTaxRate === 'number' ? configInput.defaultTaxRate : 0.16,
    enableSurcharges: Boolean(configInput.enableSurcharges),
    surcharges: Array.isArray(configInput.surcharges) ? configInput.surcharges : [],
    localizationCode: configInput.localizationCode || 'INTL',
  };
}

/**
 * Centralized Neutral Tax Engine.
 * Calculates tax amounts and dynamic surcharges configured in tenant metadata (`tenant.metadata.tax_config`).
 * Uses Decimal.js for precise financial math.
 */
export function calculateTaxes(
  subtotalNum: number,
  configInput?: TenantTaxConfig | LocalizationCode | null,
  paymentMethod?: string
): TaxCalculationResult {
  const subtotal = new Decimal(subtotalNum || 0);
  const config = resolveTaxConfig(configInput);

  const taxRate = new Decimal(config.defaultTaxRate);
  const taxName = config.defaultTaxName;
  const taxAmount = subtotal.times(taxRate);

  const surchargesList: TaxCalculationResult['details']['surcharges'] = [];

  if (config.enableSurcharges && Array.isArray(config.surcharges)) {
    for (const surcharge of config.surcharges) {
      if (surcharge.enabled === false) continue;

      if (
        surcharge.paymentMethods &&
        surcharge.paymentMethods.length > 0 &&
        (!paymentMethod || !surcharge.paymentMethods.includes(paymentMethod))
      ) {
        continue;
      }

      const surchargeRate = new Decimal(surcharge.rate || 0);
      const baseAmount = surcharge.appliesTo === 'total_with_vat'
        ? subtotal.plus(taxAmount)
        : subtotal;

      const surchargeAmount = baseAmount.times(surchargeRate);

      surchargesList.push({
        name: surcharge.name || 'Recargo',
        amount: surchargeAmount.toDecimalPlaces(2).toNumber(),
        rate: surchargeRate.toNumber(),
      });
    }
  }

  const totalSurcharges = surchargesList.reduce(
    (sum, s) => sum.plus(s.amount),
    new Decimal(0)
  );

  const total = subtotal.plus(taxAmount).plus(totalSurcharges);

  return {
    subtotal: subtotal.toDecimalPlaces(2).toNumber(),
    taxAmount: taxAmount.toDecimalPlaces(2).toNumber(),
    total: total.toDecimalPlaces(2).toNumber(),
    details: {
      taxRate: taxRate.toNumber(),
      taxName,
      surcharges: surchargesList,
    },
  };
}
```

---

#### File 2: `src/plugins/veTaxPlugin.ts`

**Proposed Changes**:
- Update `enabled: false` by default.
- Add descriptive documentation noting it as an optional reference community plugin, rather than a hardcoded active core rule.

```ts
import { SaaSPlugin } from '@/lib/core/plugins/pluginTypes';

export const veTaxPlugin: SaaSPlugin = {
  id: 'plugin-ve-tax-fiscal',
  name: 'Venezuela Fiscal & IGTF Extension',
  version: '1.0.0',
  author: 'Comunidad SaaSCore VE',
  description: 'Ejemplo de extensión comunitaria para procesamiento fiscal opcional.',
  enabled: false, // Disabled by default to preserve core neutrality

  filters: {
    'checkout:tax_calculation': (payload) => {
      if (payload.paymentMethod === 'cash_usd') {
        payload.extraTaxes = payload.extraTaxes || [];
        payload.extraTaxes.push({
          name: 'IGTF (Impuesto a Grandes Transacciones Financieras)',
          rate: 0.03,
          amount: payload.subtotal * 0.03,
        });
      }
      return payload;
    },
  },
  ...
};
```

---

#### File 3: `src/lib/core/plugins/pluginRegistry.ts`

**Proposed Replacement**:
```ts
/**
 * SaaSCore ERP Plugin Auto-Initializer
 * Loads default neutral core plugins on app startup.
 */

let initialized = false;

export function initializePlugins(): void {
  if (initialized) return;

  try {
    initialized = true;
    console.log('[PluginRegistry] Core plugins initialized.');
  } catch (err) {
    console.error('[PluginRegistry] Error initializing plugins:', err);
  }
}

// Auto-run initialization
initializePlugins();
```

---

#### File 4: `src/lib/core/accounting/chartOfAccounts.ts`

**Proposed Replacement for Line 41**:
Replace:
```ts
{ code: '2.1.02.02', name: 'Retenciones IGTF por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
```
With:
```ts
{ code: '2.1.02.02', name: 'Impuestos y Recargos Adicionales por Enterar', type: 'liability', level: 4, parentCode: '2.1.02', isHeader: false },
```

---

#### File 5: `src/app/actions/checkout.ts`

**Proposed Integration**:
Fetch `tenantData.metadata` when processing checkout:

```ts
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // CAPA 6: Motor Bimoneda e Impuestos Localizados Neutros
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('metadata')
      .eq('id', tenantId)
      .single();

    const tenantTaxConfig = tenantData?.metadata?.tax_config || localizationCode;
    const taxResult = calculateTaxes(subtotalDecimal.toNumber(), tenantTaxConfig, paymentMethod);
```

---

## 5. Verification Method

1. **TypeScript Build Integrity Check**:
   Run in terminal:
   `cmd /c "npx tsc --noEmit"`
   Expected output: 0 errors (exit code 0).

2. **Unit Test Verification of Tax Engine**:
   - Call `calculateTaxes(100)` -> Returns `subtotal: 100`, `taxAmount: 16`, `total: 116`, `surcharges: []`.
   - Call `calculateTaxes(100, { defaultTaxName: 'Sales Tax', defaultTaxRate: 0.07 })` -> Returns `subtotal: 100`, `taxAmount: 7`, `total: 107`.
   - Call `calculateTaxes(100, { defaultTaxName: 'IVA', defaultTaxRate: 0.16, enableSurcharges: true, surcharges: [{ name: 'IGTF', rate: 0.03, appliesTo: 'total_with_vat', paymentMethods: ['divisas'] }] }, 'divisas')` -> Returns `subtotal: 100`, `taxAmount: 16`, `surcharges: [{ name: 'IGTF', amount: 3.48, rate: 0.03 }]`, `total: 119.48`.
   - Call `calculateTaxes(100, { defaultTaxName: 'IVA', defaultTaxRate: 0.16, enableSurcharges: true, surcharges: [{ name: 'IGTF', rate: 0.03, appliesTo: 'total_with_vat', paymentMethods: ['divisas'] }] }, 'efectivo')` -> Returns `subtotal: 100`, `taxAmount: 16`, `surcharges: []`, `total: 116`.

3. **Chart of Accounts Invariant Check**:
   Inspect `src/lib/core/accounting/chartOfAccounts.ts` line 41 to ensure no single-country tax acronyms (e.g. `IGTF`) remain hardcoded in default chart nodes.
