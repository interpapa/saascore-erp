'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';

type ViewMode = 'grid' | 'list';

interface ViewToggleProps {
  /** Clave de localStorage para persistir la preferencia */
  storageKey: string;
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
}

/**
 * ViewToggle — Rendo Design System v2
 *
 * Toggle reutilizable Grid / Lista.
 * Persiste la preferencia en localStorage por módulo (storageKey).
 *
 * Uso:
 *   const [view, setView] = useViewPreference('catalogo-view');
 *   <ViewToggle storageKey="catalogo-view" currentView={view} onViewChange={setView} />
 */
export function ViewToggle({
  currentView,
  onViewChange,
  className = '',
}: ViewToggleProps) {
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-border p-0.5 bg-card ${className}`}
      role="group"
      aria-label="Cambiar vista"
    >
      <button
        onClick={() => onViewChange('grid')}
        title="Vista en tarjetas"
        aria-pressed={currentView === 'grid'}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
          ${currentView === 'grid'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-border-subtle'
          }
        `}
      >
        <LayoutGrid size={15} />
      </button>

      <button
        onClick={() => onViewChange('list')}
        title="Vista en lista compacta"
        aria-pressed={currentView === 'list'}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200
          ${currentView === 'list'
            ? 'bg-primary text-white shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-border-subtle'
          }
        `}
      >
        <List size={15} />
      </button>
    </div>
  );
}

/**
 * Hook para leer/escribir la preferencia de vista en localStorage.
 * Devuelve 'grid' por defecto si no hay preferencia guardada.
 *
 * Uso:
 *   const [view, setView] = useViewPreference('catalogo-view');
 */
export function useViewPreference(storageKey: string, defaultView: ViewMode = 'grid') {
  // Estado con inicializador perezoso que lee de localStorage (si existe)
  const [view, setView] = React.useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem(storageKey) as ViewMode | null;
      if (saved === 'grid' || saved === 'list') return saved;
    } catch {
      // Ignorar errores de localStorage
    }
    return defaultView;
  });

  const handleViewChange = React.useCallback(
    (newView: ViewMode) => {
      setView(newView);
      try {
        localStorage.setItem(storageKey, newView);
      } catch {
        // silent
      }
    },
    [storageKey],
  );

  return [view, handleViewChange] as const;
}
