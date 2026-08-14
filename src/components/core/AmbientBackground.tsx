'use client';

import React from 'react';

/**
 * AmbientBackground — SaaSCore Design System
 * 
 * Updated with a clean, premium gray backdrop.
 * - Light theme: A subtle, clean light-gray (bg-zinc-100/bg-slate-50).
 * - Dark theme: A solid executive dark-gray/charcoal (bg-zinc-950/bg-slate-950).
 * Preserves the architectural subtle grid texture.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none transition-colors duration-700 bg-background">
      
      {/* Grid Textura Arquitectónica con opacidad muy sutil sobre la nueva paleta */}
      <div 
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03] transition-opacity duration-700" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H20V20z' fill='%23000000' fill-opacity='0.25' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      ></div>
      
    </div>
  );
}
