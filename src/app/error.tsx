'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { AmbientBackground } from '@/components/core/AmbientBackground';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registrar error detallado en consola para diagnóstico
    console.error('[Rendo Route Error Caught]:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-6 relative overflow-hidden bg-background text-foreground">
      <AmbientBackground />

      <div className="relative z-10 text-center max-w-md w-full space-y-6 animate-in fade-in zoom-in-95 duration-400">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-sm text-rose-500 mb-4">
            <AlertTriangle size={32} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight font-sans">
            Algo no salió como esperábamos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2 px-4 leading-relaxed font-sans">
            La conexión con el servidor o la base de datos se interrumpió momentáneamente. Puedes reintentar la operación o recargar la página.
          </p>

          {error.digest && (
            <div className="mt-3 text-[11px] font-mono text-slate-400 bg-slate-900/40 border border-white/5 rounded-lg px-3 py-1">
              Código de referencia: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
          >
            <RefreshCw size={16} />
            Reintentar
          </button>
          <button
            onClick={handleReload}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-foreground transition-all flex items-center justify-center gap-2"
          >
            Recargar
          </button>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-foreground transition-colors"
          >
            <Home size={14} />
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
