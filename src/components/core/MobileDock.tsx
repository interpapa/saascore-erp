'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  ShoppingCart, 
  CalendarDays, 
  Users, 
  MessageCircle,
  LayoutGrid,
  Briefcase,
  ShoppingBag,
  Package,
  FileText,
  TrendingUp,
  Store,
  Settings,
  Stethoscope,
  HeartPulse,
  Scissors,
  Dog,
  Baby
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { hasPermission } from '@/lib/rbac';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';

interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: unknown;
}

export function MobileDock() {
  const pathname = usePathname();
  const { currentTenant, session } = useERPStore();

  const isSuper = isSuperAdminEmail(session?.userEmail);
  const isOwner = session?.role === 'owner';
  const userAllowed = session?.allowed_modules && session.allowed_modules.length > 0 ? session.allowed_modules : null;

  // Módulos activos en el ERP
  const fallbackModules = [
    'caja', 'clientes', 'inventario', 'catalogo', 'estadisticas', 'compras', 
    'contabilidad', 'calendario', 'whatsapp', 'kanban', 'odontologia', 'ginecologia', 
    'clinica', 'barberia', 'grooming', 'equipo', 'franquicias', 'config'
  ];

  const tenantModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0) 
    ? currentTenant.active_modules 
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules) && (currentTenant?.metadata as any).active_modules.length > 0)
      ? (currentTenant?.metadata as any).active_modules
      : null;
  const enabledModules: string[] = tenantModules || fallbackModules;

  // Preferencia del usuario o fallback inteligente (por defecto 4 accesos: Inicio + 3 operativos)
  const isInventarioEnabled = enabledModules.includes('inventario') || enabledModules.includes('catalogo');
  const defaultDockPrefs = isInventarioEnabled
    ? ['caja', 'clientes', 'inventario']
    : ['caja', 'clientes', enabledModules.includes('calendario') ? 'calendario' : 'whatsapp'];

  const effectivePreferences = useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rendo_mobile_dock');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        // ignore
      }
    }
    const rawDockPrefs = currentTenant?.metadata?.mobile_dock_modules as string[] | undefined;
    if (rawDockPrefs && rawDockPrefs.length > 0) return rawDockPrefs;
    return defaultDockPrefs;
  }, [currentTenant?.metadata?.mobile_dock_modules, defaultDockPrefs]);

  // Catálogo de módulos disponibles para la barra móvil
  const allItems: DockItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Inicio', href: '/dashboard', icon: Home },
    { id: 'caja', label: 'Caja POS', href: '/caja', icon: ShoppingCart },
    { id: 'clientes', label: 'CRM', href: '/clientes', icon: Users },
    { id: 'inventario', label: 'Inventario', href: '/inventario', icon: Package },
    { id: 'calendario', label: 'Citas', href: '/calendario', icon: CalendarDays },
    { id: 'odontologia', label: 'Dental', href: '/odontologia', icon: Stethoscope },
    { id: 'ginecologia', label: 'Gineco', href: '/ginecologia', icon: Baby },
    { id: 'clinica', label: 'Clínica', href: '/clinica', icon: HeartPulse },
    { id: 'barberia', label: 'Barbería', href: '/barberia', icon: Scissors },
    { id: 'grooming', label: 'Grooming', href: '/grooming', icon: Dog },
    { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
    { id: 'kanban', label: 'Kanban', href: '/kanban', icon: LayoutGrid },
    { id: 'equipo', label: 'Personal', href: '/equipo', icon: Briefcase },
    { id: 'compras', label: 'Compras', href: '/compras', icon: ShoppingBag },
    { id: 'contabilidad', label: 'Contabilidad', href: '/contabilidad', icon: FileText },
    { id: 'estadisticas', label: 'Estadísticas', href: '/estadisticas', icon: TrendingUp },
    { id: 'franquicias', label: 'Franquicias', href: '/franquicias', icon: Store },
    { id: 'config', label: 'Ajustes', href: '/configuracion', icon: Settings },
  ], []);

  // Construir la barra del Dock:
  // 1. Siempre inicia con 'dashboard' (Inicio)
  // 2. Agrega hasta 3 módulos elegidos por el usuario en Ajustes (o los 3 por defecto)
  // 3. Resultado exacto: 4 botones perfectamente distribuidos, sin saturar la pantalla
  const activeItems = useMemo(() => {
    const dashboardItem = allItems.find(i => i.id === 'dashboard') || {
      id: 'dashboard',
      label: 'Inicio',
      href: '/dashboard',
      icon: Home
    };

    const chosenItems = allItems.filter(item => {
      if (item.id === 'dashboard') return false;

      const isClinica = item.id === 'clinica';
      const isGineco = item.id === 'ginecologia';
      const isModuleActiveInDock = item.id === 'inventario'
        ? (enabledModules.includes('inventario') || enabledModules.includes('catalogo'))
        : isClinica
          ? (enabledModules.includes('clinica') || enabledModules.some(m => m.startsWith('med_')))
          : isGineco
            ? (enabledModules.includes('ginecologia') || enabledModules.includes('med_ginecologia'))
            : enabledModules.includes(item.id);

      if (!isModuleActiveInDock) return false;

      // Respetar asignación manual de módulos por empleado
      if (userAllowed) {
        const isAllowed = isClinica
          ? (userAllowed.includes('clinica') || userAllowed.some((m: string) => m.startsWith('med_')))
          : isGineco
            ? (userAllowed.includes('ginecologia') || userAllowed.includes('med_ginecologia'))
            : (item.id === 'inventario' || item.id === 'catalogo')
              ? (userAllowed.includes('inventario') || userAllowed.includes('catalogo'))
              : userAllowed.includes(item.id);
        if (!isAllowed) return false;
      } else if (!isSuper && !isOwner && session?.role) {
        if (!hasPermission(session.role, item.id)) return false;
      }

      const isItemInPreferences = item.id === 'inventario'
        ? (effectivePreferences.includes('inventario') || effectivePreferences.includes('catalogo'))
        : effectivePreferences.includes(item.id);

      return isItemInPreferences;
    });

    // Mantenemos Inicio + máx 3 módulos preferidos = 4 accesos principales exactamente
    return [dashboardItem, ...chosenItems.slice(0, 3)];
  }, [allItems, effectivePreferences, enabledModules, userAllowed, session?.role, isSuper, isOwner]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm md:hidden pointer-events-none">
      <nav 
        aria-label="Navegación Móvil Rápida"
        className="pointer-events-auto flex items-center justify-around px-2 py-2 bg-card/95 dark:bg-slate-900/95 border border-border/80 rounded-[26px] shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300"
      >
        {activeItems.map((item) => {
          const IconComponent = (item.icon as any); /* eslint-disable-line */
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link 
              key={item.id} 
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center relative py-1 rounded-2xl transition-all btn-haptic group"
            >
              <div
                className={`flex items-center justify-center transition-transform duration-200 ${
                  isActive ? 'scale-110 -translate-y-0.5 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 group-hover:text-foreground'
                }`}
              >
                <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[10px] font-bold mt-1 tracking-tight transition-colors ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                {item.label}
              </span>

              {/* Indicador de pestaña activa */}
              {isActive && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
