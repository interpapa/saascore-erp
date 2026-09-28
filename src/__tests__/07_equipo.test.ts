import assert from 'node:assert/strict';

export interface EmployeePayrollInput {
  baseSalary: number;
  bonus?: number;
  deductions?: number;
  role: 'employee' | 'specialist' | 'admin';
}

export function computePayrollSlip(input: EmployeePayrollInput) {
  if (isNaN(input.baseSalary) || input.baseSalary < 0) {
    throw new Error('El salario base debe ser un número válido no negativo.');
  }

  const base = Math.round(input.baseSalary * 100) / 100;
  const bonus = Math.round((input.bonus || 0) * 100) / 100;
  const deductions = Math.round((input.deductions || 0) * 100) / 100;

  const grossSalary = Math.round((base + bonus) * 100) / 100;
  const netSalary = Math.round((grossSalary - deductions) * 100) / 100;

  return {
    baseSalary: base,
    bonus,
    deductions,
    grossSalary,
    netSalary,
    isPayable: netSalary > 0,
  };
}

export function calculateWorkHours(checkIn: string, checkOut: string): number {
  const inDate = new Date(checkIn);
  const outDate = new Date(checkOut);

  const diffMs = outDate.getTime() - inDate.getTime();
  if (diffMs < 0) throw new Error('La hora de salida no puede ser previa a la de entrada.');

  const hours = diffMs / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

export async function runEquipoTests() {
  console.log('\n--- 👥 Módulo 07: Equipo, Asistencia & Nómina ---');

  console.log('7.1 Liquidación de nómina de colaborador');
  const slip = computePayrollSlip({
    baseSalary: 400.00,
    bonus: 50.00,
    deductions: 20.00,
    role: 'specialist',
  });

  assert.equal(slip.grossSalary, 450.00);
  assert.equal(slip.netSalary, 430.00);
  assert.equal(slip.isPayable, true);

  assert.throws(() => computePayrollSlip({ baseSalary: -100, role: 'employee' }), /no negativo/);
  console.log('  ✓ Liquidación salarial y validación anti-negativos verificada');

  console.log('7.2 Cálculo de jornada laboral y asistencia biométrica');
  const checkIn = '2026-09-27T08:00:00.000Z';
  const checkOut = '2026-09-27T16:30:00.000Z'; // 8 horas y media

  const hours = calculateWorkHours(checkIn, checkOut);
  assert.equal(hours, 8.50, 'De 08:00 a 16:30 son 8.5 horas de jornada');
  console.log('  ✓ Horas trabajadas calculadas con precisión horaria');

  console.log('✅ [07_equipo.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('07_equipo.test.ts')) {
  runEquipoTests().catch(err => {
    console.error('❌ Error en tests de equipo:', err);
    process.exit(1);
  });
}
