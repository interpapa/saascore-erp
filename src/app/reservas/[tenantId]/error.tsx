'use client';

import React, { useEffect } from 'react';
import { RefreshCw, Calendar, ArrowLeft } from 'lucide-react';

export default function ReservasRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Reservas Error Boundary]:', error);
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Calendar size={32} />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black tracking-tight">
            Portal de Reservas Online
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">
            Estamos actualizando los turnos y servicios disponibles. Puedes reintentar para cargar la información más reciente.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
          <button
            onClick={handleReload}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2"
          >
            Recargar
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Volver al inicio</span>
          </a>
        </div>
      </div>
    </div>
  );
}
