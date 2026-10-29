'use client';

import React, { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
  Baby,
  Database,
  CreditCard,
  Blocks,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Factory
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { hasPermission } from '@/lib/rbac';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { MobileBottomSheet } from '@/components/ui/mobile/MobileBottomSheet';

interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  category?: 'comercial' | 'operaciones' | 'salud' | 'servicios' | 'sistema';
}

const ALL_ERP_MODULES: DockItem[] = [
  // Comercial & Finanzas
  { id: 'caja', label: 'Caja POS', href: '/caja', icon: ShoppingCart, category: 'comercial' },
  { id: 'clientes', label: 'CRM', href: '/clientes', icon: Users, category: 'comercial' },
  { id: 'inventario', label: 'Inventario', href: '/inventario', icon: Package, category: 'operaciones' },
  { id: 'compras', label: 'Compras', href: '/compras', icon: ShoppingBag, category: 'comercial' },
  { id: 'contabilidad', label: 'Finanzas', href: '/contabilidad', icon: FileText, category: 'comercial' },
  { id: 'estadisticas', label: 'Reportes', href: '/estadisticas', icon: TrendingUp, category: 'comercial' },

  // Operaciones & Agenda
  { id: 'calendario', label: 'Citas', href: '/calendario', icon: CalendarDays, category: 'operaciones' },
  { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, category: 'operaciones' },
  { id: 'kanban', label: 'Kanban', href: '/kanban', icon: LayoutGrid, category: 'operaciones' },
  { id: 'equipo', label: 'Personal', href: '/equipo', icon: Briefcase, category: 'operaciones' },
  { id: 'franquicias', label: 'Sedes', href: '/franquicias', icon: Store, category: 'operaciones' },

  // Salud & Especialidades Médicas
  { id: 'odontologia', label: 'Dental', href: '/odontologia', icon: Stethoscope, category: 'salud' },
  { id: 'ginecologia', label: 'Gineco', href: '/ginecologia', icon: Baby, category: 'salud' },
  { id: 'clinica', label: 'Clínica', href: '/clinica', icon: HeartPulse, category: 'salud' },

  // Servicios & Especialidades
  { id: 'barberia', label: 'Barbería', href: '/barberia', icon: Scissors, category: 'servicios' },
  { id: 'grooming', label: 'Grooming', href: '/grooming', icon: Dog, category: 'servicios' },
  { id: 'suscripciones', label: 'Suscripciones', href: '/suscripciones', icon: CreditCard, category: 'comercial' },
  { id: 'produccion', label: 'Producción', href: '/produccion', icon: Factory, category: 'operaciones' },

  // Sistema
  { id: 'config', label: 'Ajustes', href: '/configuracion', icon: Settings, category: 'sistema' },
];

const ADMIN_DOCK_ITEMS: DockItem[] = [
  { id: 'admin_tenants', label: 'Empresas', href: '/admin', icon: Database },
  { id: 'admin_users', label: 'Usuarios', href: '/admin/users', icon: Users },
  { id: 'admin_billing', label: 'Facturas', href: '/admin/billing', icon: CreditCard },
  { id: 'admin_studio', label: 'Studio', href: '/admin/studio', icon: Blocks },
  { id: 'admin_erp', label: 'ERP', href: '/dashboard', icon: Home },
];

export function MobileDock() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTenant, session } = useERPStore();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isSuper = isSuperAdminEmail(session?.userEmail);
  const isOwner = session?.role === 'owner';
  const userAllowed = session?.allowed_modules && session.allowed_modules.length > 0 ? session.allowed_modules : null;

  // 1. Detectar si estamos en Rendo Hub (/admin)
  const isAdminSection = pathname.startsWith('/admin');

  // 2. Resolver módulos activos reales del Tenant (purgando estrictamente el alias legado 'catalogo')
  const enabledModules: string[] = useMemo(() => {
    const raw = currentTenant?.active_modules && Array.isArray(currentTenant.active_modules)
      ? currentTenant.active_modules
      : (currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules)
        ? (currentTenant?.metadata as any).active_modules
        : null;

    if (raw && Array.isArray(raw)) {
      return raw.filter((m: string) => m !== 'catalogo');
    }
    // Fallback defensivo si el store aún no ha hidratado
    return ['caja', 'clientes', 'calendario', 'config'];
  }, [currentTenant?.active_modules, currentTenant?.metadata]);

  // 3. Filtrar los módulos operativos que realmente están ACTIVOS y AUTORIZADOS para el usuario
  const availableModules: DockItem[] = useMemo(() => {
    return ALL_ERP_MODULES.filter(item => {
      // Regla de activación en la empresa
      let isActive = false;
      if (item.id === 'config') {
        isActive = isSuper || isOwner || session?.role === 'manager';
      } else if (item.id === 'clinica') {
        isActive = enabledModules.includes('clinica') || enabledModules.some(m => m.startsWith('med_') || m === 'cardiologia' || m === 'ginecologia' || m === 'pediatria' || m === 'dermatologia' || m === 'traumatologia' || m === 'oftalmologia');
      } else if (item.id === 'ginecologia') {
        isActive = enabledModules.includes('ginecologia') || enabledModules.includes('med_ginecologia');
      } else {
        isActive = enabledModules.includes(item.id);
      }

      if (!isActive) return false;

      // Regla de permisos de usuario (asignación explícita o RBAC)
      if (userAllowed) {
        if (item.id === 'clinica') {
          return userAllowed.includes('clinica') || userAllowed.some(m => m.startsWith('med_') || m === 'cardiologia' || m === 'ginecologia' || m === 'pediatria' || m === 'dermatologia' || m === 'traumatologia' || m === 'oftalmologia');
        }
        if (item.id === 'ginecologia') {
          return userAllowed.includes('ginecologia') || userAllowed.includes('med_ginecologia');
        }
        return userAllowed.includes(item.id);
      } else if (!isSuper && !isOwner && session?.role) {
        return hasPermission(session.role, item.id);
      }

      return true;
    });
  }, [enabledModules, userAllowed, session?.role, isSuper, isOwner]);

  // 4. Si estamos en Rendo Hub, renderizar barra de navegación de Superadmin
  if (isAdminSection) {
    return (
      <div className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[96%] max-w-sm md:hidden pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
        <nav 
          aria-label="Navegación Rendo Hub Móvil"
          className="pointer-events-auto flex items-center justify-around px-1.5 py-1.5 bg-card/95 dark:bg-slate-900/95 border border-border/80 rounded-[26px] shadow-2xl shadow-black/20 backdrop-blur-xl"
        >
          {ADMIN_DOCK_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = item.href === '/admin' 
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

            return (
              <Link 
                key={item.id} 
                href={item.href}
                className="flex-1 min-w-0 flex flex-col items-center justify-center relative py-1 rounded-2xl transition-all btn-haptic group"
              >
                <div
                  className={`flex items-center justify-center transition-transform duration-200 ${
                    isActive ? 'scale-110 -translate-y-0.5 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 group-hover:text-foreground'
                  }`}
                >
                  <IconComponent size={19} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold mt-0.5 tracking-tight transition-colors truncate max-w-full px-0.5 ${isActive ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                  {item.label}
                </span>
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

  // 5. Configurar los botones del Dock en el ERP:
  // Botón 1: Siempre es Inicio (Dashboard)
  const dashboardItem: DockItem = {
    id: 'dashboard',
    label: 'Inicio',
    href: '/dashboard',
    icon: Home,
  };

  // Determinar cuántos caben en la barra principal
  // Leer los accesos rápidos configurados en Ajustes por la empresa (filtrando solo los que están activos)
  const configuredDockIds: string[] = Array.isArray((currentTenant?.metadata as any)?.mobile_dock_modules)
    ? (currentTenant?.metadata as any).mobile_dock_modules
    : [];

  const configuredItems = configuredDockIds
    .map(id => availableModules.find(m => m.id === id))
    .filter((m): m is DockItem => Boolean(m));

  // Combinar módulos configurados como prioridad, seguidos por el resto de módulos activos
  const prioritizedModules = [
    ...configuredItems,
    ...availableModules.filter(m => !configuredItems.some(c => c.id === m.id))
  ];

  let displayedDockItems: DockItem[] = [];
  const needsMoreButton = availableModules.length > 3;

  if (!needsMoreButton) {
    // Si hay 3 o menos módulos activos, se muestran todos directamente en el Dock
    displayedDockItems = [dashboardItem, ...prioritizedModules];
  } else {
    // Si hay más de 3 módulos activos:
    // Identificar si la ruta actual es de un módulo activo que no está en el top 3
    const currentActiveModule = prioritizedModules.find(m => pathname.startsWith(m.href));
    const topThree = prioritizedModules.slice(0, 3);

    if (currentActiveModule && !topThree.some(m => m.id === currentActiveModule.id)) {
      // El usuario está navegando en un módulo fuera del top 3 -> Lo colocamos en la 3ra ranura para visibilidad inmediata
      displayedDockItems = [dashboardItem, topThree[0], topThree[1], currentActiveModule];
    } else {
      displayedDockItems = [dashboardItem, ...topThree];
    }
  }

  // Verificar si la ruta actual corresponde a alguno de los módulos en el cajón "Más"
  const isCurrentInMore = availableModules.some(
    m => pathname.startsWith(m.href) && !displayedDockItems.some(d => d.id === m.id)
  );

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm md:hidden pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
        <nav 
          aria-label="Navegación Móvil Rápida"
          className="pointer-events-auto flex items-center justify-around px-2 py-2 bg-card/95 dark:bg-slate-900/95 border border-border/80 rounded-[26px] shadow-2xl shadow-black/20 backdrop-blur-xl transition-all duration-300"
        >
          {displayedDockItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.href);

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

                {isActive && (
                  <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200" />
                )}
              </Link>
            );
          })}

          {/* Botón "+ Más" para acceder a todos los módulos activos restantes */}
          {needsMoreButton && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              className="flex-1 flex flex-col items-center justify-center relative py-1 rounded-2xl transition-all btn-haptic group"
              title="Ver todos los módulos activos"
            >
              <div
                className={`flex items-center justify-center transition-transform duration-200 ${
                  isMoreOpen || isCurrentInMore ? 'scale-110 -translate-y-0.5 text-primary font-bold' : 'text-slate-500 dark:text-slate-400 group-hover:text-foreground'
                }`}
              >
                <LayoutGrid size={20} strokeWidth={isMoreOpen || isCurrentInMore ? 2.5 : 2} />
              </div>

              <span className={`text-[10px] font-bold mt-1 tracking-tight transition-colors ${isMoreOpen || isCurrentInMore ? 'text-primary' : 'text-slate-400 dark:text-slate-500'}`}>
                Más
              </span>

              {(isMoreOpen || isCurrentInMore) && (
                <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary transition-all duration-200" />
              )}
            </button>
          )}
        </nav>
      </div>

      {/* Cajón emergente con la totalidad de aplicaciones activas de la empresa */}
      <MobileBottomSheet
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        title={currentTenant?.name ? `Módulos de ${currentTenant.name}` : 'Módulos Activos'}
        subtitle={`Navegación Rápida • ${availableModules.length} aplicaciones disponibles`}
      >
        <div className="space-y-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {availableModules.map((mod) => {
              const IconComponent = mod.icon;
              const isActive = pathname.startsWith(mod.href);

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    router.push(mod.href);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col items-start gap-2.5 btn-haptic ${
                    isActive 
                      ? 'bg-primary/10 border-primary/30 text-primary shadow-xs' 
                      : 'bg-muted/40 hover:bg-muted/70 border-border/60 text-foreground'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-background border border-border text-foreground shadow-2xs'
                  }`}>
                    <IconComponent size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm line-clamp-1">{mod.label}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">{mod.category || 'Operaciones'}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Accesos Rápidos de Administración / Mercado */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <Link
              href="/apps"
              onClick={() => setIsMoreOpen(false)}
              className="w-full p-3 rounded-2xl bg-muted/30 hover:bg-muted border border-border flex items-center justify-between text-xs font-bold text-foreground transition-all btn-haptic"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles size={16} className="text-primary" />
                <span>Marketplace de Aplicaciones (Activar Módulos)</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>

            <Link
              href="/configuracion"
              onClick={() => setIsMoreOpen(false)}
              className="w-full p-3 rounded-2xl bg-muted/30 hover:bg-muted border border-border flex items-center justify-between text-xs font-bold text-foreground transition-all btn-haptic"
            >
              <div className="flex items-center gap-2.5">
                <Settings size={16} className="text-muted-foreground" />
                <span>Ajustes Generales de la Empresa</span>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </Link>
          </div>
        </div>
      </MobileBottomSheet>
    </>
  );
}
