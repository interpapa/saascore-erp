'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

// ─── Route label map ──────────────────────────────────────────────────────────
// Maps pathname segments to human-readable labels.
// Extend this map as new routes / sub-routes are added.
const ROUTE_LABELS: Record<string, string> = {
  dashboard:    'Launcher',
  caja:         'Caja',
  clientes:     'Clientes',
  catalogo:     'Catálogo',
  estadisticas: 'Estadísticas',
  compras:      'Compras AP',
  contabilidad: 'Contabilidad',
  calendario:   'Calendario',
  whatsapp:     'WhatsApp',
  tickets:      'Tickets',
  kanban:       'Kanban',
  equipo:       'Equipo',
  franquicias:  'Franquicias',
  integraciones:'Conexiones',
  configuracion:'Ajustes',
  admin:        'Rendo Hub',
  billing:      'Facturación',
  onboarding:   'Onboarding',
  apps:         'Marketplace',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Crumb {
  label: string;
  href: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatQueryParam(key: string, value: string): string {
  switch (key) {
    case 'year':
      return `Año ${value}`;
    case 'month':
      return `Mes ${value}`;
    case 'view':
      return `Vista ${value.charAt(0).toUpperCase() + value.slice(1)}`;
    case 'tab':
      return `Pestaña ${value.charAt(0).toUpperCase() + value.slice(1)}`;
    case 'supplier':
      return `Proveedor ${value.charAt(0).toUpperCase() + value.slice(1)}`;
    default:
      return `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
  }
}

function buildCrumbs(pathname: string, searchParams?: URLSearchParams): Crumb[] {
  // Always start from the Launcher
  const crumbs: Crumb[] = [{ label: 'Launcher', href: '/dashboard' }];

  // Split the pathname and skip empty segments and 'dashboard' itself
  const segments = pathname.split('/').filter(Boolean);

  // Build up crumbs segment by segment
  let accumulated = '';
  for (const segment of segments) {
    if (segment === 'dashboard') continue; // Already added as root
    accumulated += `/${segment}`;
    const label = ROUTE_LABELS[segment] ?? segment; // Fallback: raw segment
    crumbs.push({ label, href: accumulated });
  }

  if (searchParams) {
    const targetKeys = ['year', 'month', 'view', 'tab', 'supplier'];
    const currentParams = new URLSearchParams();
    for (const key of targetKeys) {
      const val = searchParams.get(key);
      if (val) {
        currentParams.set(key, val);
        const label = formatQueryParam(key, val);
        crumbs.push({
          label,
          href: `${accumulated}?${currentParams.toString()}`,
        });
      }
    }
  }

  return crumbs;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Breadcrumbs
 * Dynamic breadcrumb component for the FloatingHeader.
 * - Shows the full path on desktop.
 * - Collapses middle segments with a "..." menu on mobile (≤ 2 crumbs shown).
 * - Only the last (current) segment is styled as active text.
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Convierte ReadonlyURLSearchParams a URLSearchParams
  const params = searchParams ? new URLSearchParams(searchParams.toString()) : undefined;
  const crumbs = buildCrumbs(pathname, params);

  const [collapseOpen, setCollapseOpen] = useState(false);

  // If only one crumb (we are on /dashboard), render nothing — the header
  // is already on the Launcher and doesn't need a "back" breadcrumb.
  if (crumbs.length <= 1) return null;

  // On mobile: show first + last; hide middle crumbs behind a "..." button
  const isMobileCollapsed = crumbs.length > 2;
  const middleCrumbs = crumbs.slice(1, crumbs.length - 1);
  const lastCrumb = crumbs[crumbs.length - 1];

  return (
    <nav
      aria-label="Navegación breadcrumb"
      className="flex items-center gap-1 min-w-0"
    >
      {/* ── Desktop: render all crumbs ───────────────────────────────────── */}
      <div className="hidden sm:flex items-center gap-1 min-w-0">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <span key={crumb.href} className="flex items-center gap-1 min-w-0">
              {idx > 0 && (
                <ChevronRight
                  size={12}
                  className="text-slate-400 dark:text-slate-600 shrink-0"
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span className="text-sm font-bold text-foreground truncate max-w-[140px]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-sm font-medium text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors truncate max-w-[100px]"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>

      {/* ── Mobile: first + … + last ─────────────────────────────────────── */}
      <div className="flex sm:hidden items-center gap-1 min-w-0 relative">
        {/* First crumb (Launcher) */}
        <Link
          href={crumbs[0].href}
          className="text-sm font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors shrink-0"
        >
          {crumbs[0].label}
        </Link>

        {isMobileCollapsed && (
          <>
            <ChevronRight size={12} className="text-slate-400 shrink-0" aria-hidden="true" />
            {/* Ellipsis button */}
            <div className="relative">
              <button
                onClick={() => setCollapseOpen((o) => !o)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-foreground transition-colors"
                aria-label="Ver ruta completa"
              >
                <MoreHorizontal size={14} />
              </button>
              {/* Dropdown of middle crumbs */}
              {collapseOpen && (
                <div className="absolute top-full mt-1.5 left-0 z-40 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-150">
                  {middleCrumbs.map((crumb) => (
                    <Link
                      key={crumb.href}
                      href={crumb.href}
                      onClick={() => setCollapseOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <ChevronRight size={12} className="text-slate-400 shrink-0" aria-hidden="true" />

        {/* Last crumb (current page) */}
        <span className="text-sm font-bold text-foreground truncate max-w-[100px]">
          {lastCrumb.label}
        </span>
      </div>
    </nav>
  );
}
