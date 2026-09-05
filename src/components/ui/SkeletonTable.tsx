import React from 'react';

interface SkeletonTableProps {
  /** Número de filas simuladas. Default: 5 */
  rows?: number;
  /** Número de columnas simuladas. Default: 4 */
  columns?: number;
  /** Muestra encabezado de tabla skeleton */
  showHeader?: boolean;
  /** Clases adicionales */
  className?: string;
}

/**
 * SkeletonTable — Rendo Design System v2
 *
 * Simula una tabla de datos mientras carga.
 * Usa la clase `.skeleton` con shimmer de globals.css.
 */
export function SkeletonTable({
  rows       = 5,
  columns    = 4,
  showHeader = true,
  className  = '',
}: SkeletonTableProps) {
  // Anchos de columna variables para parecer datos reales
  const columnWidths = ['w-1/4', 'w-1/3', 'w-1/5', 'w-1/4', 'w-1/6', 'w-1/3'];

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      aria-busy="true"
      aria-label="Cargando tabla..."
    >
      {/* Encabezado */}
      {showHeader && (
        <div className="flex items-center gap-4 px-4 py-3 border-b border-border mb-1">
          {Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className={`skeleton h-2 rounded ${columnWidths[i % columnWidths.length]}`}
            />
          ))}
        </div>
      )}

      {/* Filas */}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-4 px-4 py-3.5"
            style={{ opacity: 1 - rowIdx * (0.08 / rows) }} // Fade sutil hacia abajo
          >
            {/* Primera columna: ícono + texto */}
            <div className="flex items-center gap-2.5 w-1/4 shrink-0">
              <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
              <div className="skeleton h-2.5 rounded flex-1" />
            </div>

            {/* Columnas restantes */}
            {Array.from({ length: columns - 1 }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={`skeleton h-2 rounded ${columnWidths[(colIdx + 1) % columnWidths.length]}`}
              />
            ))}

            {/* Última columna: badge simulado */}
            <div className="skeleton h-5 w-16 rounded-full ml-auto shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
