import React from 'react';

interface SkeletonCardProps {
  /** Número de líneas de texto simuladas. Default: 3 */
  lines?: number;
  /** Muestra un avatar/ícono circular arriba */
  showAvatar?: boolean;
  /** Muestra una barra de KPI grande arriba */
  showKPI?: boolean;
  /** Clases adicionales para el contenedor */
  className?: string;
}

/**
 * SkeletonCard — Rendo Design System v2
 *
 * Reemplaza spinners genéricos con un esqueleto animado
 * que dibuja la forma del contenido que va a aparecer.
 * Usa la clase `.skeleton` con shimmer ya definida en globals.css.
 */
export function SkeletonCard({
  lines     = 3,
  showAvatar = false,
  showKPI    = false,
  className  = '',
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-card border border-border rounded-2xl p-5 space-y-3 ${className}`}
      aria-busy="true"
      aria-label="Cargando..."
    >
      {/* Avatar / Ícono */}
      {showAvatar && (
        <div className="flex items-center gap-3 mb-1">
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-2 w-1/3 rounded" />
          </div>
        </div>
      )}

      {/* KPI grande — número prominente */}
      {showKPI && (
        <div className="space-y-2 pb-1">
          <div className="skeleton h-2.5 w-1/3 rounded" />
          <div className="skeleton h-8 w-1/2 rounded" />
          <div className="skeleton h-2 w-1/4 rounded" />
        </div>
      )}

      {/* Líneas de texto */}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton h-2.5 rounded"
            style={{
              // Ancho variable para parecer texto real
              width: i === lines - 1 ? '55%' : i % 2 === 0 ? '90%' : '75%',
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Grid de skeleton cards — útil para listar mientras carga */
export function SkeletonCardGrid({
  count     = 6,
  columns   = 3,
  showKPI   = false,
  showAvatar = false,
  className  = '',
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  showKPI?: boolean;
  showAvatar?: boolean;
  className?: string;
}) {
  const gridClass: Record<2 | 3 | 4, string> = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridClass[columns]} gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} showKPI={showKPI} showAvatar={showAvatar} />
      ))}
    </div>
  );
}
