'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Rendo Root Global Error]:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mx-auto">
            <AlertTriangle size={32} />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-white">
              Error de Aplicación
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              La plataforma encontró un error de inicialización temporal. Puedes recargar la aplicación para restablecer los servicios.
            </p>
          </div>

          {error.digest && (
            <div className="text-[11px] font-mono text-slate-400 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5">
              ID de error: {error.digest}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={() => reset()}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <RefreshCw size={16} />
              Reintentar
            </button>
            <button
              onClick={handleReload}
              className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white/10 hover:bg-white/15 text-white transition-all flex items-center justify-center gap-2"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
