'use client';

import React from 'react';

/**
 * AmbientBackground — SaaSCore Design System v2
 *
 * Dark: Gradiente radial tonal desde esquina superior derecha (azul corporativo al 12%)
 *       + dot grid 24px al 2.5% de opacidad.
 *       Sin blobs de colores genéricos — fondo tipo "cockpit premium".
 *
 * Light: Fondo base blanco con dot grid muy sutil.
 */
export function AmbientBackground() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* ── Dark: Gradiente radial tonal desde top-right ── */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(
              ellipse 75% 55% at 100% 0%,
              rgba(27, 95, 168, 0.13) 0%,
              transparent 70%
            )
          `,
        }}
      />

      {/* ── Dark: Segundo gradiente sutil desde bottom-left para profundidad ── */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(
              ellipse 60% 40% at 0% 100%,
              rgba(27, 95, 168, 0.05) 0%,
              transparent 65%
            )
          `,
        }}
      />

      {/* ── Dot grid — 24px, 2.5% opacidad en dark / 1.5% en light ── */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* ── Light: Gradiente suave desde top para dar dirección ── */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: `
            linear-gradient(
              160deg,
              rgba(232, 240, 254, 0.6) 0%,
              transparent 45%
            )
          `,
        }}
      />
    </div>
  );
}
