---
name: forensic-qa
description: Protocolo y procedimientos forenses de aseguramiento de calidad (QA) para Rendo ERP. Ejecución de las 17 suites maestras (npm run test:runner), verificación de build de producción (npm run build), auditoría Anti-IDOR, blindaje de esquemas aditivos y chequeo de sincronización de contexto vivo.
---

# 🛡️ Skill: Protocolo Forense de Pruebas & Blindaje (Rendo ERP QA)

Esta habilidad dicta el protocolo de verificación forense que todo cambio de código debe superar antes de considerarse listo para producción.

---

## 1. La Regla de Oro: Evidencia Forense Obligatoria
* PROHIBIDO asumir o dar por bueno un flujo sin inspección de código.
* La palabra de un bot o desarrollador no tiene validez si no está respaldada por:
  1. Lectura del código modificado (`read_file`).
  2. Ejecución demostrada del runner de pruebas (`npm run test:runner`).
  3. Compilación limpia sin errores de Next.js (`npm run build`).

---

## 2. Las 17 Suites Maestras de Pruebas (`npm run test:runner`)

El proyecto cuenta con un runner centralizado (`src/__tests__/runner.ts`) que evalúa en menos de 1 segundo:
1. `01_seguridad.test.ts`: Whitelist de Superadmin, RBAC y bypass legítimo.
2. `02_catalogo.test.ts`: Precios, márgenes, alertas de stock mínimo y reposiciones.
3. `03_clientes.test.ts`: Saneamiento WhatsApp, normalización RIF y ledger de deuda de cliente.
4. `04_citas.test.ts`: Detección de colisiones horarias, jornadas de doctores y horas sin discrepancia de zona.
5. `05_caja.test.ts`: Venta en mostrador, pagos mixtos, arqueo de turno y reajuste interactivo de ticket.
6. `06_contabilidad.test.ts`: Asientos de partida doble NIIF automáticos para efectivo, banco y crédito.
7. `07_equipo.test.ts`: Liquidación salarial y cálculo biométrico de horas trabajadas.
8. `08_odontologia_kanban.test.ts`: Odontograma FDI, fases de tratamiento y balance Kanban.
9. `09_resiliencia_columnas.test.ts`: Estructura segura de tablas en PostgreSQL sin columnas inventadas.
10. `10_multi_sucursal.test.ts`: Consolidación multi-sede y aislamiento de datos.
11. `11_kardex_avanzado.test.ts`: Trazabilidad atómica de inventario y prevención de stock fantasma.
12. `12_barberia_grooming.test.ts`: Fórmulas de comisión de estilistas y fichas de mascotas.
13. `13_clinica_unificada.test.ts`: Triaje vital, cálculo de PAM, IMC y expediente aislado por especialidad.
14. `14_suscripciones_y_produccion.test.ts`: Ciclos de cobro recurrente y escandallo MRP.
15. `QA Sintético Intermodular`: Flujo cruzado Citas ➔ Clínica ➔ Kardex ➔ POS ➔ NIIF.
16. `QA Concurrencia e Idempotencia`: Protección contra 5 clics simultáneos y carrera por última unidad de stock.
17. `QA Fuzzing Hostil`: Resiliencia ante inyecciones SQL, textos de 5,000 caracteres y ataques Anti-IDOR.

---

## 3. Checklist Pre-Commit Inquebrantable

Antes de crear un commit en `main`:
- [ ] ¿Se ejecutó `npm run test:runner` y pasaron las 17 suites?
- [ ] ¿Se ejecutó `npm run build` y compilaron las 44 páginas de Next.js sin errores de TypeScript?
- [ ] ¿El cambio en base de datos es 100% aditivo (cero `DROP/RENAME COLUMN`)?
- [ ] ¿Toda Server Action tiene `validateUserTenantAccess(tenantId, actor)`?
- [ ] ¿Se actualizó el archivo correspondiente en `.agents/context/` si se tocó una ruta, tabla o store?
