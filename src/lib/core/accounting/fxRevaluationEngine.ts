/**
 * Rendo - Motor de Revaluación por Diferencia en Cambio (NIIF 21 / IAS 21)
 * 
 * Calcula y genera los asientos de ajuste por la variación en la tasa oficial
 * de cambio (BCV / Banco Central) sobre partidas monetarias en moneda extranjera (USD/EUR).
 */

import { getExchangeRate, convertUSDToLocal } from '@/lib/core/currencyEngine';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';
import Decimal from 'decimal.js';

export interface FXRevaluationResult {
  previousRate: number;
  currentRate: number;
  unrealizedGainLoss: number;
  adjustedLocalTotal: number;
  journalEntryId?: string;
}

export async function processFXRevaluation(
  tenantId: string,
  totalUSDReceivables: number,
  historicalBookedRate: number
): Promise<{ success: boolean; result?: FXRevaluationResult; error?: string }> {
  try {
    const currentFx = await getExchangeRate('VES', tenantId);
    const newRate = currentFx.rate;

    if (newRate === historicalBookedRate) {
      return {
        success: true,
        result: {
          previousRate: historicalBookedRate,
          currentRate: newRate,
          unrealizedGainLoss: 0,
          adjustedLocalTotal: convertUSDToLocal(totalUSDReceivables, newRate),
        },
      };
    }

    const previousLocal = new Decimal(totalUSDReceivables).times(historicalBookedRate);
    const newLocal = new Decimal(totalUSDReceivables).times(newRate);
    const diffDecimal = newLocal.minus(previousLocal).toDecimalPlaces(2);
    const diffAmount = diffDecimal.toNumber();

    let entryResult;
    if (diffAmount > 0) {
      // Ganancia no realizada por diferencia en cambio
      entryResult = await createKernelJournalEntry({
        tenant_id: tenantId,
        description: `Ajuste por Revaluación Cambiaria (Tasa ${historicalBookedRate} -> ${newRate} ${currentFx.currency})`,
        lines: [
          { account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)', debit: diffAmount, credit: 0 },
          { account_code: '4.2', account_name: 'Otros Ingresos (Ganancia en Cambio)', debit: 0, credit: diffAmount },
        ],
      });
    } else {
      // Pérdida no realizada por diferencia en cambio
      const absLoss = Math.abs(diffAmount);
      entryResult = await createKernelJournalEntry({
        tenant_id: tenantId,
        description: `Ajuste por Revaluación Cambiaria (Tasa ${historicalBookedRate} -> ${newRate} ${currentFx.currency})`,
        lines: [
          { account_code: '5.2.02', account_name: 'Pérdida por Diferencia en Cambio', debit: absLoss, credit: 0 },
          { account_code: '1.1.02.01', account_name: 'Clientes Nacionales (AR)', debit: 0, credit: absLoss },
        ],
      });
    }

    return {
      success: true,
      result: {
        previousRate: historicalBookedRate,
        currentRate: newRate,
        unrealizedGainLoss: diffAmount,
        adjustedLocalTotal: newLocal.toNumber(),
        journalEntryId: entryResult.entryId,
      },
    };
  } catch (err: unknown) {
    console.error('[FXRevaluationEngine Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
