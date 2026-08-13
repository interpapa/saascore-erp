'use client';

import React from 'react';

/**
 * AmbientBackground — SaaSCore Design System
 * 
 * Restored organic colorful vibe with animating mesh gradient orbs.
 * These blobs give the application its unique "alive" personality.
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none transition-colors duration-700">
      
      {/* Mesh Gradient Orbs (Luces Ambientales Orgánicas) */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full filter blur-[140px] dark:blur-[180px] opacity-70 dark:opacity-40 animate-blob bg-cyan-300 dark:bg-indigo-900 transition-colors duration-1000"></div>
      
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full filter blur-[140px] dark:blur-[180px] opacity-70 dark:opacity-40 animate-blob animation-delay-2000 bg-purple-300 dark:bg-purple-900 transition-colors duration-1000"></div>
      
      <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] rounded-full filter blur-[140px] dark:blur-[180px] opacity-70 dark:opacity-40 animate-blob animation-delay-4000 bg-pink-300 dark:bg-blue-900 transition-colors duration-1000"></div>

      {/* Grid Textura Arquitectónica con opacidad muy sutil */}
      <div 
        className="absolute inset-0 opacity-[0.005] dark:opacity-[0.015] transition-opacity duration-700" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H20V20z' fill='%23000000' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      ></div>
      
    </div>
  );
}
