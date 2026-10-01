'use client';

import React, { useEffect, useState } from 'react';
import { Zap, Laptop } from 'lucide-react';
import { useViewModeStore, ViewMode } from '@/store/useViewModeStore';

interface ViewModeToggleProps {
  variant?: 'header' | 'pill' | 'inline';
  className?: string;
}

export function ViewModeToggle({ variant = 'header', className = '' }: ViewModeToggleProps) {
  const { viewMode, setViewMode, toggleViewMode, hasHydrated } = useViewModeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch
  if (!mounted || !hasHydrated) {
    return (
      <div className={`w-8 h-8 rounded-full bg-slate-100/50 dark:bg-slate-800/50 animate-pulse ${className}`} />
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`fixed bottom-20 right-4 z-40 md:bottom-6 md:right-6 pointer-events-auto ${className}`}>
        <div className="flex items-center p-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-border shadow-xl rounded-full text-xs font-bold gap-1 transition-all">
          <button
            onClick={() => setViewMode('express')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all btn-haptic ${
              viewMode === 'express'
                ? 'bg-amber-500 text-white shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-foreground'
            }`}
            title="Modo Operativo Rápido (Táctil, Sillón, 1-Tap)"
          >
            <Zap size={14} className={viewMode === 'express' ? 'fill-current animate-pulse' : ''} />
            <span>Rápido</span>
          </button>
          <button
            onClick={() => setViewMode('pro')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all btn-haptic ${
              viewMode === 'pro'
                ? 'bg-primary text-primary-foreground shadow-sm font-extrabold'
                : 'text-slate-500 hover:text-foreground'
            }`}
            title="Modo Integral Pro (Tablas completas, NIIF, Auditoría)"
          >
            <Laptop size={14} />
            <span>Pro</span>
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-border ${className}`}>
        <button
          type="button"
          onClick={() => setViewMode('express')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'express'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <Zap size={13} className={viewMode === 'express' ? 'fill-current' : ''} />
          <span>Sillón / Rápido</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode('pro')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'pro'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-slate-500 hover:text-foreground'
          }`}
        >
          <Laptop size={13} />
          <span>Vista Pro</span>
        </button>
      </div>
    );
  }

  // Variant: Header (Default in FloatingHeader)
  return (
    <button
      onClick={toggleViewMode}
      className={`relative flex items-center justify-center gap-1 px-2.5 h-9 rounded-full transition-all text-xs font-bold border btn-haptic ${
        viewMode === 'express'
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
          : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20'
      } ${className}`}
      title={viewMode === 'express' ? 'Modo Rápido Activo (Toca para cambiar a Vista Pro)' : 'Modo Pro Activo (Toca para cambiar a Modo Rápido)'}
    >
      {viewMode === 'express' ? (
        <>
          <Zap size={15} className="fill-current text-amber-500" />
          <span className="hidden sm:inline font-extrabold text-[11px]">Rápido</span>
        </>
      ) : (
        <>
          <Laptop size={15} className="text-primary" />
          <span className="hidden sm:inline font-extrabold text-[11px]">Pro</span>
        </>
      )}
    </button>
  );
}
