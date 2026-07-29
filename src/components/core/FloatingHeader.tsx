'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Search, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useEffect, useState } from 'react';

export function FloatingHeader() {
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-fit px-4 pointer-events-none">
      <div 
        className={`pointer-events-auto flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out border ${
          scrolled 
            ? 'bg-white/70 dark:bg-slate-900/70 shadow-lg shadow-black/5 dark:shadow-black/20 border-border backdrop-blur-xl' 
            : 'bg-white/40 dark:bg-slate-900/40 shadow-sm border-white/20 dark:border-white/5 backdrop-blur-md hover:bg-white/60 dark:hover:bg-slate-900/60'
        }`}
      >
        
        {/* Botón Volver (Solo visible fuera del dashboard) */}
        {!isDashboard && (
          <div className="flex items-center">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground px-4 py-2 rounded-full text-sm font-bold transition-colors btn-haptic group"
              title="Volver al Launcher"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Launcher</span>
            </Link>
            <div className="w-px h-6 bg-border mx-2" />
          </div>
        )}

        {/* Búsqueda (Compacto) */}
        <button 
          className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic group"
          title="Buscar (Ctrl+K)"
        >
          <Search size={18} className="group-hover:scale-110 transition-transform" />
        </button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Notificaciones */}
        <button className="relative w-10 h-10 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic group">
          <Bell size={18} className="group-hover:animate-swing" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
        </button>

        {/* Modo Oscuro */}
        <div className="w-10 h-10 flex items-center justify-center">
          <ThemeToggle />
        </div>

      </div>
    </div>
  );
}
