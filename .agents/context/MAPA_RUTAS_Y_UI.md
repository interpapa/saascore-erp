# 🗺️ Mapa Maestro de Rutas, Navegación y UI (Rendo ERP)

> **Propósito:** Fuente única de verdad sobre la estructura de pantallas, navegación real y componentes del sistema. Ningún agente debe asumir cómo navega el usuario sin consultar este documento.

---

## 1. Topología de Navegación del Usuario (¿Cómo se mueve el usuario?)

Existen **3 mecanismos reales de navegación** en el sistema:

### A. El Tablero Principal (`/dashboard`)
* **Archivo:** `src/app/(erp)/dashboard/page.tsx`
* **Función:** Es la pantalla de inicio del ERP tras el login.
* **Comportamiento:** Muestra el saludo al negocio, métricas rápidas y el **Grid Principal de Aplicaciones** con tarjetas visuales táctiles. Cada tarjeta tiene su propiedad `href` explícita (`href: '/caja'`, `href: '/inventario'`, etc.) y abre directamente el módulo al hacer clic.

### B. El Muelle Inferior Táctil (`MobileDock.tsx`)
* **Archivo:** `src/components/core/MobileDock.tsx`
* **Función:** Barra de navegación persistente en la parte inferior para teléfonos y tablets.
* **Comportamiento:**
  - Botón fijo de **Inicio** (`/dashboard`).
  - Hasta **3 accesos directos configurables** por el usuario en `/configuracion` (almacenados en `currentTenant.metadata.mobile_dock_modules`).
  - Botón **"Más"** (`LayoutGrid`) que despliega un Bottom Sheet modal categorizado (Comercial, Operaciones, Salud, Servicios) con todos los módulos activos del tenant para saltar a cualquiera con un solo toque.

### C. La Barra Superior Flotante (`FloatingHeader.tsx`)
* **Archivo:** `src/components/core/FloatingHeader.tsx`
* **Función:** Navegación auxiliar en escritorio.
* **Comportamiento:**
  - `Breadcrumbs` interactivos para saber la ruta activa.
  - Gatillo de `CommandPalette` (`Ctrl + K` o lupa) para búsqueda rápida global.
  - Notificaciones y selector de tema claro/oscuro.
  - Se oculta automáticamente cuando se abre cualquier modal para no interferir visualmente.

### D. El Gestor de Licencias de Módulos (`/apps`)
* **Archivo:** `src/app/(erp)/apps/page.tsx`
* **Función:** Es la tienda/gestor de activación de módulos (estilo Odoo Apps).
* **Comportamiento:** Permite al administrador activar (`+ Activar`) o desactivar módulos disponibles según la suscripción. Resuelve dependencias en cascada (ej. si activas caja, activa inventario). Para módulos ya instalados, incluye el botón directo `Abrir Módulo ↗` para ingresar inmediatamente a la aplicación.

---

## 2. Catálogo Completo de Rutas del ERP (`src/app/(erp)/*`)

### 🛒 Clúster Comercial & Finanzas
| Ruta | Archivo Principal | Tamaño / Tipo | Propósito y Capacidades |
| :--- | :--- | :--- | :--- |
| `/caja` | `src/app/(erp)/caja/page.tsx` | ~195 KB (Página Mayor) | Punto de Venta (POS) bimoneda ($ USD / Bs VES), calculadora de vuelto, arqueo de turno, pago mixto (Efectivo, Pago Móvil, Zelle, Tarjeta), régimen fiscal opt-in (exento o IVA/IGTF). |
| `/clientes` | `src/app/(erp)/clientes/page.tsx` | ~41 KB | Directorio CRM de pacientes y clientes, saldos deudores, abonos, historial de visitas y etiquetas. |
| `/inventario` | `src/app/(erp)/inventario/page.tsx` | ~64 KB | Catálogo de productos/servicios, existencias físicas, precios, costos, stock crítico y ajustes de Kardex. |
| `/compras` | `src/app/(erp)/compras/page.tsx` | ~8.5 KB | Órdenes de compra a proveedores, recepción de mercancía y conciliación 3-Way Match. |
| `/contabilidad` | `src/app/(erp)/contabilidad/page.tsx` | ~15 KB | Libro mayor de doble partida NIIF, asientos automáticos de ventas/gastos, balance de comprobación. |
| `/estadisticas` | `src/app/(erp)/estadisticas/page.tsx` | ~101 KB | Gráficos ejecutivos, ventas históricas, top productos, márgenes y métricas de desempeño. |
| `/suscripciones` | `src/app/(erp)/suscripciones/page.tsx` | ~78 KB | Facturación recurrente, mensualidades de membresías, academias o pólizas. |

### 🩺 Clúster de Salud & Especialidades
| Ruta | Archivo Principal | Tamaño / Tipo | Propósito y Capacidades |
| :--- | :--- | :--- | :--- |
| `/clinica` | `src/app/(erp)/clinica/page.tsx` | ~88 KB (Estación Clínica) | Estación unificada de consulta médica, triaje de signos vitales (PAM, IMC), evolución SOAP, recetas digitales, diagnóstico CIE-10 e historial clínico filtrado por especialidad. |
| `/odontologia` | `src/app/(erp)/odontologia/page.tsx` | ~154 KB (Suite Especializada) | Odontograma digital FDI interactivo (piezas 11-48 y temporales 51-85), ortodoncia, endodoncia, periodoncia y presupuestos por fases. |
| `/ginecologia` | `src/app/(erp)/ginecologia/page.tsx` | ~139 KB (Suite Especializada) | Historia obstétrica (G-P-C-A), gestograma interactivo por FUM, ecografía gineco-obstétrica, citología Bethesda y control prenatal. |
| `/cardiologia` | `src/app/(erp)/cardiologia/page.tsx` | 140 B (Redirección) | `redirect('/clinica?spec=cardiologia')` con widgets cardiovasculares específicos. |
| `/pediatria` | `src/app/(erp)/pediatria/page.tsx` | 136 B (Redirección) | `redirect('/clinica?spec=pediatria')` con percentiles de crecimiento y dosis por peso. |
| `/dermatologia` | `src/app/(erp)/dermatologia/page.tsx` | 142 B (Redirección) | `redirect('/clinica?spec=dermatologia')` con fototipo Fitzpatrick y mapa dérmico. |
| `/oftalmologia` | `src/app/(erp)/oftalmologia/page.tsx` | 142 B (Redirección) | `redirect('/clinica?spec=oftalmologia')` con Snellen y refracción OD/OI. |
| `/traumatologia` | `src/app/(erp)/traumatologia/page.tsx` | 144 B (Redirección) | `redirect('/clinica?spec=traumatologia')` con arcos de movilidad articular (ROM). |

### ⚙️ Clúster Operativo & Especialidades de Servicio
| Ruta | Archivo Principal | Tamaño / Tipo | Propósito y Capacidades |
| :--- | :--- | :--- | :--- |
| `/calendario` | `src/app/(erp)/calendario/page.tsx` | ~28 KB | Agenda de citas y turnos, slots horarios por profesional, sincronización con clientes. |
| `/whatsapp` | `src/app/(erp)/whatsapp/page.tsx` | ~25 KB | Bandeja omnicanal de mensajería vinculada a fichas de clientes y recordatorios. |
| `/kanban` | `src/app/(erp)/kanban/page.tsx` | ~23 KB | Tablero interactivo de órdenes de trabajo, seguimiento de servicios y diagnósticos. |
| `/barberia` | `src/app/(erp)/barberia/page.tsx` | ~36 KB | Estaciones de silla de barbero, turnos walk-in, comisiones por corte y catálogo de estilo. |
| `/grooming` | `src/app/(erp)/grooming/page.tsx` | ~35 KB | Ficha de mascotas (canino/felino), temperamento, pipeline de baño/corte y citas. |
| `/produccion` | `src/app/(erp)/produccion/page.tsx` | ~59 KB | Listas de materiales (BOM), recetas, escandallos y conversión de materia prima (MRP). |

### 🏢 Clúster de Administración & Gobernanza
| Ruta | Archivo Principal | Tamaño / Tipo | Propósito y Capacidades |
| :--- | :--- | :--- | :--- |
| `/configuracion` | `src/app/(erp)/configuracion/page.tsx` | ~47 KB | Datos fiscales, régimen tributario (opt-in por país), cuentas bancarias, Pago Móvil y accesos del dock móvil. |
| `/equipo` | `src/app/(erp)/equipo/page.tsx` | ~7 KB | Empleados, roles RBAC, registro biométrico de asistencia y liquidación salarial. |
| `/franquicias` | `src/app/(erp)/franquicias/page.tsx` | ~13 KB | Gestión multi-sede, sucursales y consolidación de ingresos. |
| `/tickets` | `src/app/(erp)/tickets/page.tsx` | ~9 KB | Mesa de ayuda interna e incidencias de soporte. |
