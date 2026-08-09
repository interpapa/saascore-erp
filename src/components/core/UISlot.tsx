'use client';

import React from 'react';

export interface UISlotExtension {
  id: string;
  slotName: string;
  component: React.ComponentType<{ context?: any }>;
  priority?: number;
}

// Registro global en memoria de extensiones de UI
const registry: Map<string, UISlotExtension[]> = new Map();

/**
 * Registra una extensión de UI en un Slot específico.
 */
export function registerUISlotExtension(extension: UISlotExtension): void {
  const existing = registry.get(extension.slotName) || [];
  registry.set(extension.slotName, [...existing, extension]);
}

interface UISlotProps {
  /** Nombre único del Slot de inyección (ej. "crm.client_drawer.actions", "pos.checkout.header") */
  name: string;
  /** Contexto de datos pasado al componente inyectado */
  context?: any;
  /** Contenido por defecto renderizado si el slot está vacío */
  children?: React.ReactNode;
  className?: string;
}

/**
 * UISlot
 * Puntos de anclaje de interfaz dinámica que permiten a plugins e integraciones
 * inyectar componentes personalizados sin modificar el código fuente del módulo.
 */
export function UISlot({ name, context, children, className = '' }: UISlotProps) {
  const extensions = registry.get(name) || [];

  if (extensions.length === 0) {
    return children ? <div className={className}>{children}</div> : null;
  }

  // Ordenar extensiones por prioridad (menor número = mayor prioridad)
  const sorted = [...extensions].sort((a, b) => (a.priority || 10) - (b.priority || 10));

  return (
    <div className={`ui-slot-container slot-${name} ${className}`}>
      {sorted.map((ext) => {
        const Component = ext.component;
        return <Component key={ext.id} context={context} />;
      })}
      {children}
    </div>
  );
}
