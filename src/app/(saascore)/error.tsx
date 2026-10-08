'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';
import { AmbientBackground } from '@/components/core/AmbientBackground';

export default function RendoAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Rendo Admin Error Boundary Caught]:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[80vh] w-full flex flex-col justify-center items-center px-6 relative overflow-hidden bg-background text-foreground">
      <AmbientBackground />

      <div className="relative z-10 text-center max-w-lg w-full space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-lg text-rose-500 mb-4">
            <ShieldAlert size={34} />
          </div>
          <h1 className="text-2xl font-black tracking-tight font-sans">
            Incidencia en Rendo Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-2 px-2 leading-relaxed font-sans">
            Ocurrió una interrupción al cargar la consola administrativa de empresas. Puedes intentar restablecer el estado o volver al panel principal.
          </p>

          {error?.message && (
            <div className="mt-4 p-3 w-full text-left text-xs font-mono text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-xl overflow-x-auto max-h-32">
              <span className="font-bold">Detalle:</span> {error.message}
            </div>
          )}

          {error.digest && (
            <div className="mt-2 text-[10px] font-mono text-slate-500 bg-slate-900/40 border border-white/5 rounded-lg px-2.5 py-1">
              Digest: {error.digest}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 btn-haptic"
          >
            <RefreshCw size={16} />
            Reintentar Módulo
          </button>
          <button
            onClick={handleReload}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-foreground transition-all flex items-center justify-center gap-2 btn-haptic"
          >
            Recargar Página
          </button>
        </div>

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-foreground transition-colors"
          >
            <Home size={14} />
            Volver al Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
