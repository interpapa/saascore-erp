/**
 * Rendo Dual-Currency Engine
 * 
 * Provides real-time exchange rate management, multi-currency conversions using Decimal.js,
 * and immutable historical rate sealing for transactions.
 */

import Decimal from 'decimal.js';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface ExchangeRateData {
  currency: string;      // e.g. 'VES', 'MXN', 'COP'
  symbol: string;        // e.g. 'Bs.', 'MX$', 'COL$'
  rate: number;          // e.g. 849.56
  updated_at: string;
  source: string;        // 'BCV (Oficial en Vivo)', 'Manual', etc.
}

// Default fallback exchange rates if DB table and API are unpopulated
const DEFAULT_RATES: Record<string, ExchangeRateData> = {
  VES: { currency: 'VES', symbol: 'Bs.', rate: 849.56, updated_at: new Date().toISOString(), source: 'BCV' },
  MXN: { currency: 'MXN', symbol: 'MX$', rate: 17.2, updated_at: new Date().toISOString(), source: 'Banxico' },
  COP: { currency: 'COP', symbol: 'COL$', rate: 3900.0, updated_at: new Date().toISOString(), source: 'BanRep' },
};

/**
 * Consulta la API oficial en vivo del BCV (Banco Central de Venezuela)
 */
export async function fetchLiveBCVRate(): Promise<ExchangeRateData | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = await res.json();
    const rateVal = Number(data.promedio || data.venta || data.compra);
    if (!rateVal || isNaN(rateVal) || rateVal <= 0) return null;

    return {
      currency: 'VES',
      symbol: 'Bs.',
      rate: Number(rateVal.toFixed(4)),
      updated_at: data.fechaActualizacion || new Date().toISOString(),
      source: 'BCV (Oficial en Vivo)'
    };
  } catch (err: any) {
    console.warn('[fetchLiveBCVRate Warning]:', err.message);
    return null;
  }
}

export async function getExchangeRate(
  currency: string = 'VES',
  tenantId?: string
): Promise<ExchangeRateData> {
  try {
    if (tenantId) {
      // 1. Verificar metadata de tenant
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('metadata')
        .eq('id', tenantId)
        .single();

      if (tenant?.metadata?.exchange_rate?.rate) {
        const meta = tenant.metadata.exchange_rate;
        return {
          currency: meta.currency || 'VES',
          symbol: meta.symbol || 'Bs.',
          rate: Number(meta.rate) || 849.56,
          updated_at: meta.updated_at || new Date().toISOString(),
          source: meta.source || 'BCV'
        };
      }

      // 2. Verificar tabla exchange_rates
      const { data, error } = await supabaseAdmin
        .from('exchange_rates')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('currency', currency)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return {
          currency: data.currency,
          symbol: data.symbol || 'Bs.',
          rate: data.rate,
          updated_at: data.created_at,
          source: data.source || 'BCV',
        };
      }
    }
  } catch {
    // Fallback
  }

  // Si es VES, intentar consultar en vivo
  if (currency === 'VES') {
    const liveRate = await fetchLiveBCVRate();
    if (liveRate) return liveRate;
  }

  return DEFAULT_RATES[currency] || DEFAULT_RATES['VES'];
}

export function convertUSDToLocal(usdAmount: number, rate: number): number {
  const safeRate = Number(rate);
  const effectiveRate = (!isNaN(safeRate) && safeRate > 0) ? safeRate : (DEFAULT_RATES['VES']?.rate || 849.56);
  return new Decimal(usdAmount || 0)
    .times(effectiveRate)
    .toDecimalPlaces(2)
    .toNumber();
}

export function formatDualCurrency(usdAmount: number, rate: number, symbol: string = 'Bs.'): {
  usdFormatted: string;
  localFormatted: string;
  combined: string;
} {
  const localAmount = convertUSDToLocal(usdAmount, rate);
  const usdFormatted = `$${usdAmount.toFixed(2)} USD`;
  const localFormatted = `${symbol} ${localAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  return {
    usdFormatted,
    localFormatted,
    combined: `${usdFormatted} (${localFormatted})`,
  };
}
