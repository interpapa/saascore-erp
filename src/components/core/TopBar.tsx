'use client';

import { Search, Bell, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

export const TopBar = () => {
  const [isFocused, setIsFocused] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="absolute top-0 w-full z-40 pointer-events-none p-4 flex justify-between items-start">
      
      {/* Buscador Global Flotante */}
      <div className={`pointer-events-auto bg-white/40 dark:bg-black/20 backdrop-blur-xl border ${isFocused ? 'border-primary shadow-lg shadow-primary/20' : 'border-border shadow-sm'} rounded-full flex items-center px-4 py-2.5 transition-all duration-300 w-full max-w-md mx-auto sm:ml-4 sm:mx-0`}>
        <Search size={18} className="text-slate-400 mr-3 shrink-0" />
        <input 
          type="text" 
          placeholder="Buscar clientes, tickets, facturas (Ctrl+K)..." 
          className="bg-transparent border-none text-sm text-foreground placeholder:text-slate-600 dark:text-slate-400 w-full focus:outline-none focus:ring-0"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        <div className="hidden sm:flex shrink-0 items-center gap-1 bg-black/5 dark:bg-white/10 px-2 py-1 rounded text-[10px] font-bold text-slate-600 dark:text-slate-400 ml-2">
          <span>⌘</span>K
        </div>
      </div>

      {/* Acciones Rápidas (Derecha) */}
      <div className="hidden sm:flex pointer-events-auto items-center gap-3">
        {mounted && (
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-border flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-foreground transition-colors btn-haptic"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}
        <button className="w-10 h-10 rounded-full bg-white/40 dark:bg-black/20 backdrop-blur-md border border-border flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-white/10 hover:text-foreground transition-colors btn-haptic">
          <Bell size={18} />
        </button>
      </div>

    </div>
  );
};
