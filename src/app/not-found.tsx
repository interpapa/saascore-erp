'use client';

import React from 'react';
import { AmbientBackground } from '@/components/core/AmbientBackground';

/**
 * Custom 404 - Not Found Page
 * 
 * Replaces the generic Vercel/Next 404 error page.
 * Keeps the beautiful ambient blur background orb system
 * and offers a secure, haptic-ready button to return to safety.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-6 relative overflow-hidden">
      
      {/* Orbes ambientados de fondo */}
      <AmbientBackground />

      <div className="relative z-10 text-center max-w-md w-full space-y-6 animate-in fade-in zoom-in-95 duration-400">
        
        {/* Código 404 e Ilustración sutil */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
            <span className="text-2xl font-black text-primary font-mono">404</span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-6 font-sans">
            Recurso No Encontrado
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-2 px-4 leading-relaxed font-sans">
            El módulo, página o recurso al que intentas acceder no existe en este tenant o ha sido movido por seguridad.
          </p>
        </div>

        {/* Botón de Retorno al Launcher */}
        <div className="pt-2">
          <a 
            href="/dashboard"
            className="btn-base btn-primary w-full shadow-lg shadow-primary/25 btn-haptic flex items-center justify-center gap-2"
          >
            Regresar al Launcher
          </a>
        </div>
        
      </div>
    </div>
  );
}
