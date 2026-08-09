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
