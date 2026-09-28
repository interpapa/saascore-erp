import assert from 'node:assert/strict';

export interface AppointmentSlot {
  start: string; // HH:mm
  end: string;   // HH:mm
  isBooked: boolean;
}

export function generateDailySlots(
  openTime: string,    // "08:00"
  closeTime: string,   // "17:00"
  slotDurationMin: number, // 30
  bookedIntervals: Array<{ start: string; end: string }>
): AppointmentSlot[] {
  const slots: AppointmentSlot[] = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);

  let currentMinTotal = openHour * 60 + openMin;
  const closeMinTotal = closeHour * 60 + closeMin;

  while (currentMinTotal + slotDurationMin <= closeMinTotal) {
    const slotStartMin = currentMinTotal;
    const slotEndMin = currentMinTotal + slotDurationMin;

    const startH = String(Math.floor(slotStartMin / 60)).padStart(2, '0');
    const startM = String(slotStartMin % 60).padStart(2, '0');
    const endH = String(Math.floor(slotEndMin / 60)).padStart(2, '0');
    const endM = String(slotEndMin % 60).padStart(2, '0');

    const startStr = `${startH}:${startM}`;
    const endStr = `${endH}:${endM}`;

    // Verificar si colisiona con algún turno reservado
    const hasCollision = bookedIntervals.some(b => {
      const [bStartH, bStartM] = b.start.split(':').map(Number);
      const [bEndH, bEndM] = b.end.split(':').map(Number);
      const bStartTotal = bStartH * 60 + bStartM;
      const bEndTotal = bEndH * 60 + bEndM;

      // Hay solapamiento si el slot inicia antes del fin de la reserva y termina después del inicio
      return slotStartMin < bEndTotal && slotEndMin > bStartTotal;
    });

    slots.push({
      start: startStr,
      end: endStr,
      isBooked: hasCollision,
    });

    currentMinTotal += slotDurationMin;
  }

  return slots;
}

export async function runCitasTests() {
  console.log('\n--- 📅 Módulo 04: Citas & Agenda de Turnos ---');

  console.log('4.1 Generación de slots regulares de 30 min (08:00 a 12:00)');
  const booked = [
    { start: '09:00', end: '10:00' }, // Cita de 1 hora (bloquea 09:00-09:30 y 09:30-10:00)
    { start: '11:00', end: '11:30' }, // Cita de 30 min
  ];

  const slots = generateDailySlots('08:00', '12:00', 30, booked);
  assert.equal(slots.length, 8, 'De 08:00 a 12:00 con turnos de 30m deben generarse 8 slots');

  // Slot 08:00 - 08:30 (Disponible)
  assert.equal(slots[0].start, '08:00');
  assert.equal(slots[0].isBooked, false);

  // Slot 09:00 - 09:30 (Bloqueado)
  assert.equal(slots[2].start, '09:00');
  assert.equal(slots[2].isBooked, true);

  // Slot 09:30 - 10:00 (Bloqueado por duración de 60m)
  assert.equal(slots[3].start, '09:30');
  assert.equal(slots[3].isBooked, true);

  // Slot 10:00 - 10:30 (Disponible)
  assert.equal(slots[4].start, '10:00');
  assert.equal(slots[4].isBooked, false);

  // Slot 11:00 - 11:30 (Bloqueado)
  assert.equal(slots[6].start, '11:00');
  assert.equal(slots[6].isBooked, true);

  console.log('  ✓ Detección de colisiones de turnos por duración compuesta validada');

  console.log('4.2 Citas completadas o canceladas no deben bloquear slots');
  // Si filtramos citas canceladas/completadas antes de pasar bookedIntervals:
  const appointmentsInDb = [
    { start: '09:00', end: '10:00', status: 'cancelled' },
    { start: '10:00', end: '10:30', status: 'completed' },
    { start: '11:00', end: '11:30', status: 'confirmed' },
  ];

  const activeBookings = appointmentsInDb
    .filter(a => a.status !== 'cancelled' && a.status !== 'completed')
    .map(a => ({ start: a.start, end: a.end }));

  const slotsFiltered = generateDailySlots('08:00', '12:00', 30, activeBookings);
  assert.equal(slotsFiltered[2].isBooked, false, 'Turno con cita cancelada debe quedar libre');
  assert.equal(slotsFiltered[4].isBooked, false, 'Turno con cita completada debe quedar libre para el próximo paciente');
  assert.equal(slotsFiltered[6].isBooked, true, 'Turno con cita confirmada debe permanecer bloqueado');
  console.log('  ✓ Liberación de turnos tras cancelación o conclusión verificada');

  console.log('✅ [04_citas.test.ts] Todos los tests pasaron exitosamente.');
}

if (process.argv[1]?.endsWith('04_citas.test.ts')) {
  runCitasTests().catch(err => {
    console.error('❌ Error en tests de citas:', err);
    process.exit(1);
  });
}
