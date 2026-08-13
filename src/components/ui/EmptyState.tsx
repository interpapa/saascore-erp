'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  /** Ícono de Lucide */
  icon: LucideIcon;
  /** Título principal */
  title: string;
  /** Descripción opcional */
  description?: string;
  /** Texto del botón de acción */
  actionLabel: string;
  /** Callback del botón de acción */
  onAction: () => void;
  /** Acción secundaria opcional */
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * EmptyState — SaaSCore Design System v2
 *
 * Estado vacío unificado para todos los módulos.
 * SIEMPRE tiene una acción sugerida — no deja al usuario
 * sin saber qué hacer cuando no hay datos.
 *
 * Uso:
 * <EmptyState
 *   icon={Package}
 *   title="Aún no tienes productos"
 *   description="Agrega tu primer producto al catálogo para comenzar a vender."
 *   actionLabel="Agregar producto"
 *   onAction={() => setShowCreateModal(true)}
 * />
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-16 ${className}`}
      role="status"
    >
      {/* Ícono con fondo sutil */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform hover:scale-105"
        style={{
          background: 'var(--primary-50)',
          border: '1px solid var(--border)',
        }}
      >
        <Icon
          size={28}
          style={{ color: 'var(--primary)' }}
          strokeWidth={1.5}
        />
      </div>

      {/* Textos */}
      <h3
        className="font-semibold text-foreground mb-1.5"
        style={{ fontSize: '16px' }}
      >
        {title}
      </h3>

      {description && (
        <p
          className="text-sm max-w-xs leading-relaxed mb-6"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {description}
        </p>
      )}

      {!description && <div className="mb-5" />}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onAction}
          className="btn-base btn-primary btn-haptic"
        >
          {actionLabel}
        </button>

        {secondaryLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="btn-base btn-ghost"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
