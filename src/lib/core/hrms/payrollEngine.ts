/**
 * Rendo - Motor de Nómina Localizada & Asientos Contables (HRMS - GDPR)
 * 
 * Gestiona el cálculo de nómina (sueldos base, bonos, retenciones legales)
 * y genera automáticamente el asiento contable de gasto salarial NIIF.
 */

import Decimal from 'decimal.js';
import { createKernelJournalEntry } from '@/lib/core/kernel/ledgerKernel';

export interface EmployeeSalaryItem {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
}

export interface PayrollProcessingPayload {
  tenantId: string;
  periodName: string;
  employees: EmployeeSalaryItem[];
}

export interface PayrollSummary {
  payrollNumber: string;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetDisbursed: number;
  employeeCount: number;
  journalEntryId?: string;
}

/**
 * Calcula la nómina neta de un conjunto de empleados y emite el asiento contable correspondiente.
 */
export async function processPayroll(
  payload: PayrollProcessingPayload
): Promise<{ success: boolean; summary?: PayrollSummary; error?: string }> {
  try {
    let grossSum = new Decimal(0);
    let deductionsSum = new Decimal(0);
    let netSum = new Decimal(0);

    for (const emp of payload.employees) {
      const base = new Decimal(emp.baseSalary);
      const bonus = new Decimal(emp.bonuses);
      const ded = new Decimal(emp.deductions);

      const gross = base.plus(bonus);
      const net = gross.minus(ded);

      grossSum = grossSum.plus(gross);
      deductionsSum = deductionsSum.plus(ded);
      netSum = netSum.plus(net);
    }

    const payrollNumber = `PAY-${Date.now().toString().slice(-6)}`;
    const totalGross = grossSum.toDecimalPlaces(2).toNumber();
    const totalDeductions = deductionsSum.toDecimalPlaces(2).toNumber();
    const totalNet = netSum.toDecimalPlaces(2).toNumber();

    // Asiento Contable NIIF: Gasto de Sueldos (Débito) vs Retenciones e Impuestos (Crédito) vs Bancos por Pagar (Crédito)
    const journalResult = await createKernelJournalEntry({
      tenant_id: payload.tenantId,
      description: `Nómina de Personal ${payrollNumber} (${payload.periodName})`,
      lines: [
        { account_code: '5.2.01', account_name: 'Sueldos y Salarios (Gasto)', debit: totalGross, credit: 0 },
        { account_code: '2.1.02', account_name: 'Retenciones Fiscales por Pagar', debit: 0, credit: totalDeductions },
        { account_code: '1.1.01.02', account_name: 'Bancos / Pasivo Laboral por Pagar', debit: 0, credit: totalNet },
      ],
    });

    return {
      success: true,
      summary: {
        payrollNumber,
        totalGrossSalary: totalGross,
        totalDeductions: totalDeductions,
        totalNetDisbursed: totalNet,
        employeeCount: payload.employees.length,
        journalEntryId: journalResult.entryId,
      },
    };
  } catch (err: unknown) {
    console.error('[processPayroll Error]:', (err as Error).message);
    return { success: false, error: (err as Error).message };
  }
}
