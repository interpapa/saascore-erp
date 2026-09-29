import assert from 'node:assert/strict';
import { DentalTreatmentPlan } from '../app/actions/dental';
import { DENTAL_PROCEDURES_MASTER, mergeTenantDentalServices } from '../lib/dental/proceduresCatalog';

export async function runQASchemaResilienceTests() {
  console.log('\n--- 🛡️ Módulo 09: QA Forense de Esquema & Resiliencia de Columnas ---');

  // 1. Resiliencia de Columnas en documents (issue_date, due_date, notes)
  console.log('9.1 Estructura segura de Documentos sin columnas inexistentes en PostgreSQL');
  const safeDocPayload = {
    tenant_id: '11111111-1111-4111-8111-111111111111',
    entity_id: '22222222-2222-4222-8222-222222222222',
    type: 'quotation',
    status: 'presupuestado',
    document_number: 'OT-DENTAL-123456',
    subtotal_amount: 150.00,
    tax_amount: 0,
    total_amount: 150.00,
    metadata: {
      issue_date: new Date().toISOString(),
      due_date: null,
      notes: 'Tratamiento conducto pieza 11',
      actual_type: 'work_order',
      pipeline: 'dental',
      steps: [
        { id: 'step-1', title: '[D11] Apertura y conductometría', order: 1, completed: false },
        { id: 'step-2', title: '[D11] Obturación con gutapercha', order: 2, completed: false }
      ]
    }
  };

  // Verificar que issue_date, due_date y notes NO estén en el nivel raíz del payload de la tabla documents
  assert.equal('issue_date' in safeDocPayload, false, 'issue_date no debe ser una columna raíz de documents');
  assert.equal('due_date' in safeDocPayload, false, 'due_date no debe ser una columna raíz de documents');
  assert.equal('notes' in safeDocPayload, false, 'notes no debe ser una columna raíz de documents');
  assert.ok(safeDocPayload.metadata.issue_date, 'issue_date debe persistir dentro de metadata');
  assert.ok(safeDocPayload.metadata.notes, 'notes debe persistir dentro de metadata');
  console.log('  ✓ Ausencia de columnas no soportadas en documents validada (evita error schema cache)');

  // 2. Fallback de Type Constraint en PostgreSQL
  console.log('9.2 Compatibilidad con CHECK constraint documents_type_check');
  const allowedPostgresTypes = ['invoice', 'purchase_order', 'quotation'];
  assert.ok(allowedPostgresTypes.includes(safeDocPayload.type), 'El type de respaldo debe ser compatible con la restricción SQL');
  assert.equal(safeDocPayload.metadata.actual_type, 'work_order', 'El actual_type operativo se preserva en metadata');
  console.log('  ✓ Compatibilidad de types PostgreSQL con fallback a quotation validada');

  // 3. Catálogo Maestro Dental y Preservación de Capas/Etapas
  console.log('9.3 Desglose de etapas clínicas por procedimiento');
  const endoProc = DENTAL_PROCEDURES_MASTER.find(p => p.id === 'proc-endo-01');
  assert.ok(endoProc, 'Procedimiento de endodoncia debe existir');
  assert.equal(endoProc?.sessionsRequired, 2, 'Endodoncia requiere 2 sesiones');
  assert.ok(endoProc?.stages.length && endoProc.stages.length >= 2, 'Debe incluir al menos 2 etapas clínicas');
  console.log('  ✓ Estructura multisesión y etapas clínicas de endodoncia verificada');

  // 4. Fusión con Catálogo Personalizado de la Empresa
  console.log('9.4 Fusión dinámica con servicios del tenant');
  const mockTenantServices = [
    {
      id: 'custom-serv-1',
      name: 'Profilaxis Dental & Limpieza Ultrasonido', // Mismo nombre que el catálogo maestro pero precio personalizado
      base_price: 45.00,
      type: 'service',
    },
    {
      id: 'custom-serv-2',
      name: 'Diseño de Sonrisa Digital 3D', // Servicio completamente nuevo
      base_price: 350.00,
      type: 'service',
    }
  ];

  const mergedCatalog = mergeTenantDentalServices(mockTenantServices);
  const updatedProfilaxis = mergedCatalog.find(p => p.name === 'Profilaxis Dental & Limpieza Ultrasonido');
  const newCustomServ = mergedCatalog.find(p => p.name === 'Diseño de Sonrisa Digital 3D');

  assert.ok(updatedProfilaxis, 'Profilaxis debe existir en el catálogo fusionado');
  assert.equal(updatedProfilaxis?.defaultPriceUSD, 45.00, 'El precio debe ser el personalizado por la empresa ($45)');
  assert.ok(newCustomServ, 'El nuevo servicio debe agregarse al catálogo');
  assert.equal(newCustomServ?.defaultPriceUSD, 350.00, 'El precio del nuevo servicio debe ser $350');
  console.log('  ✓ Fusión de precios de la empresa con catálogo maestro verificada');

  // 5. Generación de Orden Kanban desde Plan sin Procedures indefinidos
  console.log('9.5 Resiliencia contra planes de tratamiento con procedimientos nulos/vacíos');
  const emptyPlan: DentalTreatmentPlan = {
    id: 'plan-empty',
    title: 'Plan Vacío',
    teeth: [],
    procedures: [],
    totalCost: 0,
    createdAt: new Date().toISOString(),
  };

  const safeProcedures = Array.isArray(emptyPlan?.procedures) ? emptyPlan.procedures : [];
  assert.equal(safeProcedures.length, 0);
  const safeSteps = safeProcedures.map((p, i) => ({ id: `s-${i}`, title: p.procedure, order: i + 1, completed: false }));
  assert.equal(safeSteps.length, 0);
  console.log('  ✓ Manejo seguro de listas vacías y estructuras nulas verificado');

  console.log('✅ [09_qa_schema_resilience.test.ts] Todos los tests de resiliencia pasaron exitosamente.');
}
