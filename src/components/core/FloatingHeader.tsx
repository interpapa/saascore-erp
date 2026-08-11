'use client';

import { Search, Bell, CheckCircle2, AlertTriangle, MessageCircle, X } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Breadcrumbs } from '@/components/core/Breadcrumbs';
import { CommandPalette } from '@/components/core/CommandPalette';
import { useEffect, useState } from 'react';

export function FloatingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: '1', type: 'warning', title: 'Stock Bajo', message: 'Filtro de Aceite (3 unidades restantes)', time: 'Hace 5 min', read: false },
    { id: '2', type: 'success', title: 'Venta Registrada', message: 'Factura #INV-2026-004 ($150.00)', time: 'Hace 12 min', read: false },
    { id: '3', type: 'info', title: 'Cita Próxima', message: 'Mantenimiento preventivo agendado', time: 'Hace 30 min', read: true },
  ]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOpenCommandPalette = () => setIsSearchOpen(true);
    window.addEventListener('global:open_command_palette', handleOpenCommandPalette);
    return () => window.removeEventListener('global:open_command_palette', handleOpenCommandPalette);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-30 w-full max-w-fit px-4 pointer-events-none">
        <div
          className={`pointer-events-auto flex items-center gap-2 p-2 rounded-full transition-all duration-500 ease-out border ${
            scrolled
              ? 'bg-white/70 dark:bg-slate-900/70 shadow-lg shadow-black/5 dark:shadow-black/20 border-border backdrop-blur-xl'
              : 'bg-white/40 dark:bg-slate-900/40 shadow-sm border-white/20 dark:border-white/5 backdrop-blur-md hover:bg-white/60 dark:hover:bg-slate-900/60'
          }`}
        >
          {/* Breadcrumbs */}
          <div className="flex items-center pl-2 pr-1">
            <Breadcrumbs />
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Búsqueda (Command Palette Trigger) */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic group"
            title="Buscar (Ctrl+K)"
          >
            <Search size={18} className="group-hover:scale-110 transition-transform" />
          </button>

          <div className="w-px h-6 bg-border mx-1" />

          {/* Notificaciones */}
          <div className="relative">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-full text-slate-600 dark:text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors btn-haptic group"
              title="Centro de Notificaciones"
            >
              <Bell size={18} className="group-hover:animate-swing" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
              )}
            </button>

            {/* Dropdown de Notificaciones */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-card border border-border rounded-3xl shadow-2xl p-4 z-50 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-sm">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead} 
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Marcar leídas
                      </button>
                    )}
                    <button 
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-slate-400 hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-3 rounded-2xl border text-xs transition-all flex items-start gap-3 ${
                        n.read ? 'bg-slate-50/50 dark:bg-slate-900/50 border-transparent opacity-60' : 'bg-card border-border shadow-xs'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {n.type === 'warning' && <AlertTriangle size={16} className="text-amber-500" />}
                        {n.type === 'success' && <CheckCircle2 size={16} className="text-emerald-500" />}
                        {n.type === 'info' && <MessageCircle size={16} className="text-blue-500" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-foreground">{n.title}</p>
                        <p className="text-slate-500 dark:text-slate-400">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modo Oscuro */}
          <div className="w-10 h-10 flex items-center justify-center">
            <ThemeToggle />
          </div>

        </div>
      </div>

      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
