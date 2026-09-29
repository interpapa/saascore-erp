/**
 * Rendo ERP / SaaSCore - Test Runner Maestro por Módulos
 * Ejecuta todas las suites de prueba unitarias e integrales del sistema.
 */

import { runSeguridadTests } from './01_seguridad.test';
import { runCatalogoTests } from './02_catalogo.test';
import { runClientesTests } from './03_clientes.test';
import { runCitasTests } from './04_citas.test';
import { runCajaTests } from './05_caja.test';
import { runContabilidadTests } from './06_contabilidad.test';
import { runEquipoTests } from './07_equipo.test';
import { runOdontologiaKanbanTests } from './08_odontologia_kanban.test';
import { runQASchemaResilienceTests } from './09_qa_schema_resilience.test';

async function main() {
  console.log('====================================================');
  console.log('       RENDO ERP - MASTER SUITE DE PRUEBAS          ');
  console.log('====================================================');
  const startTime = Date.now();

  const suites = [
    { name: '01. Seguridad & Aislamiento Tenant', fn: runSeguridadTests },
    { name: '02. Catálogo & Inventario', fn: runCatalogoTests },
    { name: '03. Clientes & Directorio CRM', fn: runClientesTests },
    { name: '04. Citas & Agenda de Turnos', fn: runCitasTests },
    { name: '05. Caja POS & Arqueo', fn: runCajaTests },
    { name: '06. Contabilidad NIIF & Partida Doble', fn: runContabilidadTests },
    { name: '07. Personal & Nómina', fn: runEquipoTests },
    { name: '08. Odontología Especializada & Kanban', fn: runOdontologiaKanbanTests },
    { name: '09. QA de Esquema & Resiliencia de Columnas', fn: runQASchemaResilienceTests },
  ];

  let passed = 0;
  let failed = 0;

  for (const suite of suites) {
    try {
      await suite.fn();
      passed++;
    } catch (error) {
      console.error(`\n❌ FALLÓ LA SUITE: ${suite.name}`);
      console.error(error);
      failed++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(` RESUMEN FINAL: ${passed} pasadas, ${failed} fallidas (${duration}s)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✨ TODAS LAS SUITES DE PRUEBA PASARON EXITOSAMENTE ✨\n');
  }
}

main().catch(err => {
  console.error('Error fatal en el runner:', err);
  process.exit(1);
});
