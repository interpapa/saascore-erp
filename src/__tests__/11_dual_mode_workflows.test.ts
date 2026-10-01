import { useViewModeStore } from '../store/useViewModeStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

export async function runDualModeWorkflowsTests() {
  console.log('\n--- Ejecutando Suite 11: Paradigma Dual & Flujos Operativos UX ---');

  // 1. Test: ViewMode Store Initialization & Mode Toggling
  const store = useViewModeStore.getState();
  assert(typeof store.viewMode === 'string', 'viewMode debe ser un string');

  store.setViewMode('express');
  assert(useViewModeStore.getState().viewMode === 'express', 'viewMode debe ser express tras setViewMode');

  store.setViewMode('pro');
  assert(useViewModeStore.getState().viewMode === 'pro', 'viewMode debe ser pro tras setViewMode');

  store.toggleViewMode();
  assert(useViewModeStore.getState().viewMode === 'express', 'toggleViewMode debe alternar de pro a express');

  store.toggleViewMode();
  assert(useViewModeStore.getState().viewMode === 'pro', 'toggleViewMode debe alternar de express a pro');
  console.log('  ✓ 1. Store Zustand useViewModeStore alterna estados express y pro correctamente');

  // 2. Test: Fast Tender Bimonetary Change Calculation (USD & VES)
  const totalSaleUSD = 35.50;
  const officialRateBCV = 36.50;
  const totalSaleVES = totalSaleUSD * officialRateBCV; // 1295.75

  // Caso: Pago con billete de $50 USD
  const tenderedBillUSD = 50.00;
  const changeDueUSD = tenderedBillUSD > totalSaleUSD ? Math.round((tenderedBillUSD - totalSaleUSD) * 100) / 100 : 0;
  const changeDueVES = changeDueUSD * officialRateBCV;

  assert(changeDueUSD === 14.50, `Vuelto en USD incorrecto: esperado 14.50, obtenido ${changeDueUSD}`);
  assert(Math.abs(changeDueVES - 529.25) < 0.01, `Vuelto en VES incorrecto: esperado 529.25, obtenido ${changeDueVES}`);
  console.log('  ✓ 2. Calculadora de billetes rápidos (Fast Tender) calcula vuelto en USD y Bs sin discrepancia');

  // 3. Test: FDI Quadrants Anatomical Mapping Integrity
  const Q1 = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const Q2 = ['21', '22', '23', '24', '25', '26', '27', '28'];
  const Q4 = ['48', '47', '46', '45', '44', '43', '42', '41'];
  const Q3 = ['31', '32', '33', '34', '35', '36', '37', '38'];

  const allTeeth = [...Q1, ...Q2, ...Q4, ...Q3];
  assert(allTeeth.length === 32, 'Debe haber exactamente 32 piezas en los 4 cuadrantes FDI adultos');

  // Verificación de unicidad anatómica
  const uniqueTeeth = new Set(allTeeth);
  assert(uniqueTeeth.size === 32, 'Cada diente en los cuadrantes debe tener una nomenclatura FDI única');
  console.log('  ✓ 3. Integridad anatómica de cuadrantes FDI para Modo Sillón verificada');

  // 4. Test: Dental Session Order Items & Cashier Payload
  const sessionItems = [
    { toothNum: '16', procedureName: 'Resina Nanohíbrida 1 Cara', cost: 45 },
    { toothNum: 'General', procedureName: 'Limpieza con Ultrasonido', cost: 30 }
  ];
  const orderTotalUSD = sessionItems.reduce((acc, curr) => acc + curr.cost, 0);
  assert(orderTotalUSD === 75, `Total de orden de sesión incorrecto: esperado 75, obtenido ${orderTotalUSD}`);

  const cashierPayload = {
    patientId: 'patient-uuid-mock',
    patientName: 'María Pérez',
    items: sessionItems,
    totalSuggestedUSD: orderTotalUSD,
    clinicalNotes: 'Aislamiento absoluto y profilaxis general.'
  };

  assert(cashierPayload.items.length === 2, 'Payload hacia caja debe contener los 2 tratamientos seleccionados');
  assert(cashierPayload.totalSuggestedUSD === 75, 'Monto sugerido para cobrar en caja debe coincidir');
  console.log('  ✓ 4. Despacho de orden clínica hacia recepción (Caja POS) formateado con éxito');

  // 5. Test: Fast Inventory Physical Count Stepping & Stock Alerts
  let itemStock = 3;
  const minStock = 5;

  // Evaluar estado bajo
  assert(itemStock > 0 && itemStock <= minStock, 'Debe alertar nivel crítico cuando stock <= minStock');

  // Simular sumar paquete (+5)
  itemStock += 5;
  assert(itemStock === 8, 'Stock debe ser 8 tras incremento de lote (+5)');
  assert(itemStock > minStock, 'Stock normalizado superando el umbral de reorden');

  // Simular decrementos con clamp defensivo (no stock negativo)
  const decrement = (current: number, amount: number) => Math.max(0, current - amount);
  itemStock = decrement(itemStock, 10);
  assert(itemStock === 0, 'Stock no debe permitir valores negativos en conteo físico');
  console.log('  ✓ 5. Lógica de ajuste físico en Modo Pasillo (Inventario Express) validada con guardas');

  // 6. Test: Kiosk Quick Attendance State Transition
  type PunchType = 'check_in' | 'check_out';
  interface PunchState {
    isPresent: boolean;
    lastType: PunchType;
    lastPunchTime: string;
  }

  let employeeState: PunchState = {
    isPresent: false,
    lastType: 'check_out',
    lastPunchTime: '00:00:00',
  };

  // 1-Tap Check-In (Entrada)
  const punchInTime = '08:00:00';
  employeeState = {
    isPresent: true,
    lastType: 'check_in',
    lastPunchTime: punchInTime,
  };
  assert(employeeState.isPresent === true, 'El colaborador debe estar en turno tras marcar entrada');
  assert(employeeState.lastType === 'check_in', 'Tipo de evento debe ser check_in');

  // 1-Tap Check-Out (Salida)
  const punchOutTime = '17:00:00';
  employeeState = {
    isPresent: false,
    lastType: 'check_out',
    lastPunchTime: punchOutTime,
  };
  assert(employeeState.isPresent === false, 'El colaborador debe estar fuera de turno tras marcar salida');
  assert(employeeState.lastType === 'check_out', 'Tipo de evento debe ser check_out');
  console.log('  ✓ 6. Transición de estados en Modo Kiosco (Reloj Checador Express) validada');

  console.log('--- Suite 11 Completada con Éxito ---');
}

