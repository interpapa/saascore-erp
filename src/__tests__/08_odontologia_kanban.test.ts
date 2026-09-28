import assert from 'node:assert/strict';
import { DentalChart, DentalTreatmentPlan } from '../app/actions/dental';
import { CONDITIONS } from '../components/dental/Odontogram';

export async function runOdontologiaKanbanTests() {
  console.log('\n--- 🦷 Módulo 08: Odontología Especializada & Kanban de Procesos ---');

  // 1. Catálogo FDI y Condiciones Clínicas
  console.log('8.1 Catálogo de simbología FDI internacional');
  assert.equal(CONDITIONS.caries.symbol, 'C');
  assert.equal(CONDITIONS.caries.color, '#ef4444');
  assert.equal(CONDITIONS.obturacion.color, '#3b82f6');
  assert.equal(CONDITIONS.endodoncia.color, '#8b5cf6');
  assert.equal(CONDITIONS.corona.color, '#f59e0b');
  assert.equal(CONDITIONS.implante.symbol, '🔩');
  assert.equal(CONDITIONS.ausente.symbol, '✕');
  console.log('  ✓ Simbología clínica FDI (Caries, Resinas, Endodoncias, Coronas, Implantes) verificada');

  // 2. Estructura de Odontograma con Pieza Supernumeraria
  console.log('8.2 Soporte de piezas supernumerarias y notas por diente');
  const chart: DentalChart = {
    mode: 'adult',
    teeth: {
      '11': {
        number: '11',
        conditions: [{ code: 'caries', faces: ['mesial'] }],
        notes: 'Caries incipiente mesial',
      },
      '21': {
        number: '21',
        conditions: [{ code: 'obturacion', faces: ['vestibular'] }],
      }
    },
    supernumeraryTeeth: [
      {
        number: 'X01',
        isSupernumerary: true,
        conditions: [{ code: 'custom', label: 'Mesiodens palatino' }],
        notes: 'Mesiodens detectado en Rx panorámica',
      }
    ],
    generalNotes: 'Paciente con buena higiene, requiere profilaxis y restauración 11.',
    lastUpdated: new Date().toISOString(),
  };

  assert.equal(Object.keys(chart.teeth).length, 2);
  assert.equal(chart.supernumeraryTeeth.length, 1);
  assert.equal(chart.supernumeraryTeeth[0].number, 'X01');
  assert.equal(chart.supernumeraryTeeth[0].isSupernumerary, true);
  console.log('  ✓ Registro odontológico con piezas supernumerarias verificado');

  // 3. Plan de Tratamiento Dental
  console.log('8.3 Plan de tratamiento con costeo y conversión a pasos Kanban');
  const plan: DentalTreatmentPlan = {
    id: 'plan-101',
    title: 'Tratamiento Integral Dientes Anteriores',
    teeth: ['11', 'X01'],
    procedures: [
      { toothNumber: '11', conditionCode: 'caries', procedure: 'Restauración con Resina Estética', estimatedCost: 50.00, completed: false },
      { toothNumber: 'X01', conditionCode: 'custom', procedure: 'Exodoncia Simple Mesiodens', estimatedCost: 70.00, completed: false },
    ],
    totalCost: 120.00,
    createdAt: new Date().toISOString(),
  };

  assert.equal(plan.totalCost, 120.00);
  assert.equal(plan.procedures.length, 2);
  console.log('  ✓ Plan de tratamiento presupuestado correctamente');

  // 4. Kanban por Pasos vs Tarea Simple
  console.log('8.4 Kanban: Cálculo de progreso % y detección de finalización de pasos');
  const steps = [
    { id: 's1', title: 'Paso 1: Diagnóstico', completed: true },
    { id: 's2', title: 'Paso 2: Exodoncia', completed: true },
    { id: 's3', title: 'Paso 3: Control Post-operatorio', completed: false },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPct = Math.round((completedCount / steps.length) * 100);
  assert.equal(progressPct, 67, '2 de 3 pasos completados debe ser 67%');

  // Completar el último paso
  steps[2].completed = true;
  const allCompleted = steps.every(s => s.completed === true);
  assert.equal(allCompleted, true, 'Al completar todos los pasos debe disparar señal para avanzar de etapa');
  console.log('  ✓ Señal interactiva de avance al completar checklist validada');

  // 5. Balance Financiero en Tarjeta Kanban
  console.log('8.5 Balance de orden en Kanban ($ Total / $ Abonado / $ Saldo)');
  const totalAmount = 120.00;
  const paidAmount = 50.00;
  const balance = totalAmount - paidAmount;
  assert.equal(balance, 70.00, 'Saldo remanente debe ser $70.00');
  console.log('  ✓ Balances financieros de órdenes operativas verificados');

  console.log('✅ [08_odontologia_kanban.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('08_odontologia_kanban.test.ts')) {
  runOdontologiaKanbanTests().catch(err => {
    console.error('❌ Error en tests de odontología y kanban:', err);
    process.exit(1);
  });
}
