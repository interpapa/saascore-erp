---
name: mobile-touch-ux
description: Guía y directrices de diseño táctil móvil para Rendo ERP. Patrones de Bottom Sheets (MobileBottomSheet), botones hápticos (btn-haptic), zonas táctiles con pulgar, teclados numéricos en Caja POS y adaptación responsiva móvil vs escritorio.
---

# 📱 Skill: Patrones de Diseño Móvil Táctil (Rendo ERP UX)

Esta habilidad proporciona los estándares de interfaz gráfica para que cualquier pantalla o componente de Rendo ERP se sienta como una aplicación móvil fluida, moderna y visualmente atractiva en teléfonos y tablets, manteniendo la potencia corporativa en escritorio.

---

## 1. Principios de Interacción Táctil Móvil

1. **La Regla del Pulgar (Thumb Zone):**
   - Las acciones principales (cobrar, guardar, agregar ítem) deben ubicarse en la mitad inferior de la pantalla en dispositivos móviles.
   - Usar la barra persistente `MobileDock.tsx` para accesos directos rápidos.
2. **Dimensiones de Pulsación:**
   - Todo botón o elemento interactivo debe tener un área táctil mínima de **44 × 44 píxeles** para evitar pulsaciones erróneas.
3. **Feedback Visual Inmediato:**
   - Usar siempre la clase `btn-haptic` (animación sutil de compresión al tocar).
   - Usar esqueletos (`SkeletonCard`, `SkeletonTable`) en lugar de pantallas blancas mientras se cargan datos.

---

## 2. Componentes Clave de la Experiencia Móvil

### A. Hojas Inferiores (`MobileBottomSheet.tsx`)
* En pantallas móviles (`max-w-md` / teléfonos), los diálogos deben deslizarse desde abajo (Bottom Sheet) con tirador superior (`drag handle`), no como modales flotantes centrados que se cortan en pantallas pequeñas.

### B. Teclado Numérico Virtual en Caja POS (`FastTenderBottomSheet.tsx`)
* El cajero o doctor no debe depender del teclado virtual del sistema operativo para cobrar.
* Caja POS incluye botones rápidos de denominaciones ($5, $10, $20, $50, $100) y teclado de números grandes con cálculo de vuelto en tiempo real.

### C. Navegación por Aplicaciones
* Al usuario le gusta la visual de **aplicaciones móviles independientes**: iconos grandes con gradientes vibrantes, bordes redondeados (`rounded-2xl` o `rounded-3xl`), sombras sutiles y textos directos.
* Evitar menús de árbol burocráticos o listas aburridas sin identidad visual.
