# 🧠 MEMORIA INSTITUCIONAL: LECCIONES APRENDIDAS Y ANTI-PATRONES (RENDO ERP)

> **PROPÓSITO DE ESTE DOCUMENTO:**
> Rendo ERP es gestionado por un fundador único (*Solo Founder*). Para suplir la falta de un departamento completo de directores (CTO, CFO, Director Médico, VP de Producto, SRE), este archivo actúa como la **Memoria Cognitiva y Consejo Consultivo Permanente**.
> 
> Antes de plantear una solución, rediseño o cambio en la plataforma, los agentes y el desarrollador DEBEN contrastar la propuesta contra estos anti-patrones para **evitar dar vueltas donde no es, no asumir supuestos falsos y jamás tumbar la plataforma**.

---

## 🏛️ CATEGORÍA 1: ERRORES DE PLANTEAMIENTO Y GESTIÓN (MANAGEMENT & STRATEGY)

### 1.1 "El Síndrome de la Solución Inmediata en el Síntoma" (Dar vueltas donde no es)
* **El Error:** Cuando un cliente reporta que "no ve las citas", ir directo a modificar la consulta SQL o el componente visual sin antes verificar: ¿Está en el tenant correcto? ¿Tiene el rol adecuado? ¿El especialista tiene horario configurado?
* **Costo Real:** Horas perdidas reescribiendo código funcional cuando el problema era una membresía de usuario desajustada en la base de datos o un filtro de fecha mal seleccionado.
* **Regla Preventiva (Filtro 360° antes de picar código):**
  1. ¿Es un problema de **Datos/Configuración** (tenant, horarios, roles)?
  2. ¿Es un problema de **Permisos/Sesión** (IDOR, cookies, token desactualizado)?
  3. ¿Es un problema de **Red/Infraestructura** (timeout, cold-start, socket colgado)?
  4. Solo si las 3 anteriores están descartadas, se concluye que es un **Bug en el Código**.

### 1.2 "Sobrecarga del Solo Founder" (Falta de Delegación Multi-Ángulo)
* **El Error:** Como una sola persona toma todas las decisiones, tiende a ver el software solo desde el ángulo de programador (código limpio, queries eficientes) olvidando el ángulo del **doctor en consulta con 10 pacientes esperando** o la **recepcionista con poca experiencia digital**.
* **Regla Preventiva (El Consejo de los 5 Sombreros):**
  Toda decisión crítica debe ser evaluada por el agente bajo 5 roles antes de ejecutar:
  - 🩺 **El Director Médico/Clínico:** ¿Esto interrumpe la atención al paciente? ¿Cumple normativas?
  - 💼 **El Gerente Financiero (CFO):** ¿Cuadra con la caja y la partida doble? ¿Cumple SENIAT/NIIF?
  - 📱 **La Recepcionista/Usuario Operativo:** ¿Es intuitivo en un teléfono con prisa o requiere 10 clics?
  - 🏗️ **El Arquitecto de Sistemas (CTO):** ¿Rompe la compatibilidad con clientes existentes en producción?
  - 🛡️ **El Ingeniero de Resiliencia (SRE):** Si se cae la conexión a mitad, ¿se pierde la información?

### 1.3 "Despliegues en Caliente sin Empresa Test"
* **El Error:** Probar nuevas funciones (como anulación de facturas o borrado masivo) directamente en el tenant real del cliente o en la base compartida sin aislarlo en una empresa ficticia de pruebas.
* **Regla Preventiva:** Todo ensayo destructivo se ejecuta en el tenant `Empresa Test / Consultorio Demo`, jamás en cuentas reales de producción.

---

## 🏗️ CATEGORÍA 2: ERRORES DE ARQUITECTURA Y BASE DE DATOS

### 2.1 "El Supuesto de Columna o Tabla Fantasma" (El error de las facturas que tumbó Rendo)
* **El Error:** Escribir código que asume que una columna (`entities.role`, `documents.tax_id`, etc.) existe en PostgreSQL porque "debería existir" según la lógica del programador, provocando que Supabase lance un error de esquema y rompa todos los Server Components dependientes.
* **Regla Preventiva (Ley de Inspección Forense Obligatoria):**
  - Ningún agente puede escribir un `.select('campo')` o `.insert({ campo })` sin haber verificado previamente su existencia en `.agents/context/ESQUEMA_BASE_DATOS.md` o mediante una consulta SQL real.
  - Los esquemas son **estrictamente aditivos**: se pueden agregar campos nuevos con valores por defecto o nulos; **prohibido borrar (`DROP`) o renombrar (`RENAME`)**.

### 2.2 "Contaminación Cruzada entre Canal Público y Privado"
* **El Error:** Reutilizar Server Actions que leen cookies de sesión de administrador (`cookies()`, `getUser()`) dentro de la página pública de reservas (`/reservas/[tenantId]`), provocando que a los clientes externos les aparezca error de autenticación o pantalla en blanco.
* **Regla Preventiva:**
  - El portal de reservas público es un canal **100% anónimo y desacoplado**.
  - No debe importar ni depender de funciones de sesión privada. Utiliza endpoints específicos con `tenantId` explícito y rate limiting por IP.

### 2.3 "Secuestro de Membresía por Residuos en LocalStorage o DB"
* **El Error:** Cuando un usuario pertenece a múltiples empresas (ej. su propio negocio y soporte técnico de Rendo Corp), el sistema tomaba la primera empresa encontrada o la guardada en caché de navegador, bloqueándole el acceso a su negocio legítimo.
* **Regla Preventiva:**
  - La membresía de tipo `owner` (dueño de negocio propio) **siempre prevalece** sobre cualquier membresía secundaria de invitado o soporte.
  - Al detectar inconsistencias, se purga la caché residual y se fuerza la selección de su empresa titular.

### 2.4 "Envenenamiento de Rol y Caché Local (Incidente Djumbo)"
* **Fecha / Incidente:** 2026-11-24 - La dueña de Djumbo no veía sus productos ni clientes y reportaba que su cuenta parecía de "Admin" con acceso a otras empresas.
* **Planteamiento Inicial Erróneo:** Pensar que la base de datos tenía duplicados o que el catálogo de inventario tenía un fallo de filtrado en el cliente.
* **Causa Raíz Real:** Su correo estuvo temporalmente en `DEFAULT_SUPERADMINS`. El navegador persistió `role: 'superadmin'` y `currentTenant: Rendo Corp (demo)` en `Rendo-erp-storage` (localStorage). `TenantSwitcher.tsx` tenía `isSuper = isSuperAdminEmail(...) || session?.role === 'superadmin'`. Al leer el rol obsoleto de la caché, la UI le abría el conmutador de empresas global y la dejaba varada en la empresa demo Rendo Corp, que no tiene sus productos ni sus clientes.
* **Regla Inmutable:**
  1. **Tolerancia Cero a Roles No Validados:** Jamás evaluar `session.role === 'superadmin'` sin cruzarlo obligatoriamente con `isSuperAdminEmail(session.userEmail)`.
  2. **Auto-Saneamiento en Rehidratación:** En `useERPStore` (`onRehydrateStorage`), todo usuario que no esté en whitelist debe purgar cualquier residuo de `superadmin` o `admin`, limpiar `impersonatedTenant` y expulsar tenants demo (`Rendo Corp`).
  3. **Pre-Flight Canary Prober:** Ejecutar `npm run test:preflight` antes de desplegar para comprobar que la resolución de tenants en vivo responde con su tenant y rol legítimos.

---

## 📱 CATEGORÍA 3: ERRORES DE EXPERIENCIA DE USUARIO (UX & CLÍNICA)

### 3.1 "Mensajes de Error Criptográficos para Usuarios No Técnicos"
* **El Error:** Mostrar al doctor o al cliente alertas como: `Server Components render digest error #12984` o `SLOT_OCCUPIED_COLLISION_FAILED`. El usuario se asusta, piensa que la app se dañó y se frustra.
* **Regla Preventiva:**
  - **Frente al Usuario:** Mensajes claros, humanos y orientados a la solución (ej. *"Este horario acaba de ser reservado por otro paciente. Por favor selecciona otro turno."* o *"No se pudo conectar con el servidor. Tus datos están a salvo, por favor intenta en unos segundos."*).
  - **En la Consola/Logs APM:** Guardar el stack técnico completo, duración en milisegundos, tenant ID y código exacto para el equipo de desarrollo.

### 3.2 "Uso de Alertas Nativas del Navegador (`window.alert`, `window.confirm`)"
* **El Error:** Usar los diálogos grises del navegador para confirmar acciones como eliminar una cita o borrar un producto. Rompe la estética móvil, bloquea el hilo principal y desentona en dispositivos táctiles.
* **Regla Preventiva:**
  - Usar modales integrados en la aplicación con diseño háptico (`btn-haptic`), animación suave y confirmación explícita con botón de cancelar destacado.

---

## ⚡ CATEGORÍA 4: PROTOCOLO DE APRENDIZAJE VIVO (CÓMO REGISTRAR UN NUEVO ERROR)

Cuando ocurra un incidente o detectemos que dimos un enfoque equivocado:

1. **Paso 1: Detener la urgencia y aislar la causa raíz.** No aplicar parches sobre parches.
2. **Paso 2: Documentar la entrada en este archivo:**
   - **Fecha / Incidente:** Qué falló.
   - **Planteamiento Inicial Erróneo:** Qué pensamos que era y por qué dimos vueltas.
   - **Causa Raíz Real:** Qué pasaba realmente en el sistema.
   - **Regla Inmutable:** Qué instrucción específica se agrega a las reglas para que la IA y el desarrollador no lo repitan jamás.
3. **Paso 3: Blindar con un Test Automatizado:** Agregar la aserción correspondiente en el runner (`src/__tests__/runner.ts`).
