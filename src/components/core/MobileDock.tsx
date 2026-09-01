'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  ShoppingCart, 
  CalendarDays, 
  Users, 
  MessageCircle
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';

interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: unknown;
}

export function MobileDock() {
  const pathname = usePathname();
  const { currentTenant } = useERPStore();

  // Módulos activos en el ERP
  const enabledModules = currentTenant?.metadata?.active_modules || [
    'caja', 'clientes', 'catalogo', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'equipo', 'franquicias', 'integraciones', 'config', 'admin'
  ];

  // Elementos del Dock de navegación core
  const allItems: DockItem[] = [
    { id: 'dashboard', label: 'Inicio', href: '/dashboard', icon: Home },
    { id: 'caja', label: 'Caja POS', href: '/caja', icon: ShoppingCart },
    { id: 'calendario', label: 'Agenda', href: '/calendario', icon: CalendarDays },
    { id: 'clientes', label: 'CRM', href: '/clientes', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  ];

  // Filtramos la barra del Dock basándonos en los módulos activos
  // Nota: 'dashboard' (Inicio) siempre está disponible como base
  const activeItems = allItems.filter(item => 
    item.id === 'dashboard' || enabledModules.includes(item.id)
  );

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md md:hidden pointer-events-none">
      <div 
        className="pointer-events-auto flex items-center justify-around px-4 py-3 bg-white/70 dark:bg-slate-900/70 border border-border/80 rounded-[28px] shadow-xl shadow-black/10 dark:shadow-black/30 backdrop-blur-xl transition-all duration-300"
      >
        {activeItems.map((item) => {
          const IconComponent = (item.icon as any); /* eslint-disable-line */
item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link 
              key={item.id} 
              href={item.href}
              className="flex flex-col items-center justify-center relative w-12 h-12 rounded-2xl transition-all btn-haptic"
            >
              <div
                className={`flex items-center justify-center transition-transform duration-200 ${
                  isActive ? 'scale-110 -translate-y-0.5 text-primary font-bold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <IconComponent size={22} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[9px] font-bold mt-0.5 tracking-tight transition-colors ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.label}
              </span>

              {/* Indicador de base activa */}
              {isActive && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
