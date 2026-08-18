'use client';

import React from 'react';

/**
 * AmbientBackground — SaaSCore Design System
 * 
 * Restored organic colorful vibe with higher saturation and opacity
 * to prevent the background from looking flat white in light mode.
 * Grid lines ("cuadros") opacity has been reduced significantly to make 
 * them almost invisible and prevent any visual strain.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none transition-colors duration-700 bg-[#F8FAFC] dark:bg-[#080E1A]">
      
      {/* 
        Luces Ambientales Orgánicas (Cyan, Purple & Pink)
        Devolvemos los colores vivos (cyan, fucsia y púrpura) con una opacidad equilibrada (45%)
        para que los destellos de color se vean claramente sin enceguecer.
      */}
      <div className="absolute top-[-5%] left-[-5%] w-[55%] h-[55%] rounded-full filter blur-[110px] dark:blur-[140px] opacity-45 dark:opacity-50 animate-blob bg-cyan-400 dark:bg-indigo-900 transition-all duration-1000"></div>
      
      <div className="absolute top-[25%] right-[-5%] w-[45%] h-[45%] rounded-full filter blur-[110px] dark:blur-[140px] opacity-45 dark:opacity-50 animate-blob animation-delay-2000 bg-purple-400 dark:bg-purple-900 transition-all duration-1000"></div>
      
      <div className="absolute bottom-[-5%] left-[15%] w-[55%] h-[55%] rounded-full filter blur-[110px] dark:blur-[140px] opacity-50 dark:opacity-50 animate-blob animation-delay-4000 bg-pink-400 dark:bg-blue-900 transition-all duration-1000"></div>

      {/* 
        Grid Textura Arquitectónica 
        Reducimos la opacidad a valores extremadamente bajos (0.003 y 0.006) 
        para hacer los cuadros casi invisibles, evitando que molesten a la vista.
      */}
      <div 
        className="absolute inset-0 opacity-[0.003] dark:opacity-[0.006] transition-opacity duration-700" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H20V20z' fill='%23000000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      ></div>
      
    </div>
  );
}
