# Original User Request

## Initial Request — 2026-08-06T23:15:05Z

Realizar una auditoría e implementación completa del sistema de interfaz de usuario de SaaSCore ERP para eliminar incoherencias visuales, solapamiento de elementos (z-index), asimetrías de paddings/márgenes y estandarizar la maquetación de todas las páginas de módulos (/caja, /clientes, /catalogo, /compras, /equipo, /contabilidad, /calendario, /whatsapp, /integraciones, /configuracion, /admin).

Working directory: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react
Integrity mode: development

## Requirements

### R1. Estandarización de Contenedores y Alineación Simétrica
Todas las vistas de módulos deben utilizar un contenedor unificado con márgenes simétricos (max-w-6xl mx-auto px-4 sm:px-6 py-6), evitando solapamientos con el FloatingHeader (respetando la distancia superior de 80px) y garantizando que las cabeceras, tarjetas de KPI y feeds de listas compartan la misma rejilla visual.

### R2. Auditoría y Corrección de Jerarquía de Capas (Z-Index)
Asegurar que los modales, drawers, botones flotantes (AICopilot, FloatingHeader, CommandPalette) y toasting se desplieguen en niveles de z-index independientes sin cubrir campos de texto o botones de acción.

### R3. Coherencia en Estados Vacíos y Retroalimentación Visual
Garantizar que todos los módulos desplieguen componentes EmptyState uniformes ante listas vacías y notificaciones Toast ante acciones de usuario en lugar de alertas nativas del navegador.

## Acceptance Criteria

### Integridad Visual & Estructura
- Todas las páginas de los módulos principales (/caja, /clientes, /catalogo, /compras, /equipo, /contabilidad) comparten la misma estructura de contenedor sin desbordamientos laterales.
- No existen elementos tapados por el FloatingHeader o el botón del AICopilot.
- Todos los botones de acción primarios utilizan las clases del sistema de diseño (btn-haptic, bg-primary).

### Verificación Técnica
- cmd /c "npx tsc --noEmit" se ejecuta con 0 errores de compilación TypeScript.

## Follow-up — 2026-08-07T15:35:19Z

Realizar la erradicación total de datos mock hardcodeados en todos los módulos de SaaSCore ERP y rediseñar/construir interfaces especializadas y funcionales adaptadas al dominio único de cada vista (/calendario con vista de rejilla de eventos interactiva, /whatsapp con bandeja de entrada CRM omnicanal, /contabilidad con libro mayor NIIF y balance de comprobación, /franquicias con matriz multi-sucursal).

Working directory: c:\Users\rodol\OneDrive\Escritorio\programacion\saascore_react
Integrity mode: development

## Requirements

### R1. Erradicación Total de Datos Mock & Conexión Real a Supabase
Eliminar cualquier arreglo o constante con datos fijos/hardcodeados en todas las páginas de módulos (/calendario, /whatsapp, /integraciones, /franquicias, /configuracion, /contabilidad). Todos los datos deben ser consultados dinámicamente desde PostgreSQL/Supabase vía Server Actions con fallback elegante e inserción optimista.

### R2. Interfaces Especializadas Diferenciadas por Dominio
- /calendario (Gestión de Citas y Turnos): Vista de rejilla de calendario mensual/semanal interactiva con creador de eventos de servicio, asignación de empleados y filtros.
- /whatsapp (CRM Inbox Omnicanal): Interfaz de chat de soporte tipo WhatsApp Web con lista de conversaciones activas, historial de mensajes, etiquetas de cliente y envío de mensajes.
- /contabilidad (Libro Mayor & Balances NIIF): Panel financiero interactivo con Balance de Comprobación, Estado de Resultados, Libro Diario NIIF y filtro por período.
- /franquicias (Matriz Multi-Sucursal): Vista de mapa/tarjetas de rendimiento por sucursal con métricas de ventas en tiempo real y selector de empresa.

### R3. Eliminación de Localizaciones Fiscales Hardcodeadas
Asegurar que ningún módulo contenga impuestos o banderas fiscales rígidas (como IGTF de un solo país), utilizando el motor de impuestos neutro configurable por el usuario.

## Acceptance Criteria

### Funcionalidad & Datos Reales
- Ningún archivo en src/app/(erp)/ contiene datos hardcodeados de prueba (mock arrays fijos).
- La vista de /calendario permite crear y visualizar eventos reales sobre una rejilla mensual/semanal.
- La vista de /whatsapp permite simular/enviar chats transaccionales con clientes registrados en el CRM.
- La vista de /contabilidad renderiza los asientos del Libro Mayor (journal_entries) con cuadre NIIF de Débitos y Créditos.

### Verificación Técnica
- cmd /c "npx tsc --noEmit" se ejecuta con 0 errores de compilación TypeScript.

## Follow-up — 2026-08-07T20:19:06Z

Por favor reanuda el trabajo de estandarización de la interfaz de usuario, corrección de z-index, márgenes y alineación simétrica en todas las páginas de módulos según los requerimientos indicados.


