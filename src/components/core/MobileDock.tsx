'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  Plug,
  Blocks,
  Settings,
  ShieldAlert,
  Stethoscope,
  HeartPulse,
  Scissors,
  Dog,
  SlidersHorizontal,
  Check,
  X
} from 'lucide-react';
import { useERPStore } from '@/store/useERPStore';
import { hasPermission } from '@/lib/rbac';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';
import { updateTenantSettings } from '@/app/actions/tenant';
import { useActionActor } from '@/hooks/useActionActor';

interface DockItem {
  id: string;
  label: string;
  href: string;
  icon: unknown;
}

export function MobileDock() {
  const pathname = usePathname();
  const { currentTenant, setCurrentTenant, session } = useERPStore();
  const actor = useActionActor();

  const isSuper = session?.role === 'superadmin' || isSuperAdminEmail(session?.userEmail);
  const isOwner = session?.role === 'owner';
  const userAllowed = session?.allowed_modules && session.allowed_modules.length > 0 ? session.allowed_modules : null;

  // Estado para personalización directa en móvil
  const [localPrefs, setLocalPrefs] = useState<string[] | null>(null);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [selectedInModal, setSelectedInModal] = useState<string[]>([]);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('rendo_mobile_dock');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setLocalPrefs(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }, []);

  // Módulos activos en el ERP
  const fallbackModules = ['caja', 'clientes', 'inventario', 'catalogo', 'estadisticas', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'odontologia', 'clinica', 'med_general', 'med_pediatria', 'med_ginecologia', 'med_dermatologia', 'med_traumatologia', 'med_oftalmologia', 'barberia', 'grooming', 'equipo', 'franquicias', 'config', 'admin', 'apps'];
  const tenantModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0) 
    ? currentTenant.active_modules 
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules) && (currentTenant?.metadata as any).active_modules.length > 0)
      ? (currentTenant?.metadata as any).active_modules
      : null;
  const enabledModules: string[] = tenantModules || fallbackModules;

  // Preferencia del usuario o fallback inteligente (Dashboard siempre se fuerza luego)
  const rawDockPrefs = currentTenant?.metadata?.mobile_dock_modules as string[] | undefined;
  const isInventarioEnabled = enabledModules.includes('inventario') || enabledModules.includes('catalogo');
  const defaultDockPrefs = isInventarioEnabled
    ? ['caja', 'inventario', 'clientes', enabledModules.includes('calendario') ? 'calendario' : 'whatsapp']
    : ['caja', 'calendario', 'clientes', 'whatsapp'];

  const effectivePreferences = useMemo(() => {
    if (localPrefs && localPrefs.length > 0) return localPrefs;
    if (rawDockPrefs && rawDockPrefs.length > 0) return rawDockPrefs;
    return defaultDockPrefs;
  }, [localPrefs, rawDockPrefs, defaultDockPrefs]);

  // Todos los posibles módulos
  const allItems: DockItem[] = useMemo(() => [
    { id: 'dashboard', label: 'Inicio', href: '/dashboard', icon: Home },
    { id: 'caja', label: 'Caja POS', href: '/caja', icon: ShoppingCart },
    { id: 'calendario', label: 'Citas', href: '/calendario', icon: CalendarDays },
    { id: 'odontologia', label: 'Dental', href: '/odontologia', icon: Stethoscope },
    { id: 'clinica', label: 'Clínica', href: '/clinica', icon: HeartPulse },
    { id: 'barberia', label: 'Barbería', href: '/barberia', icon: Scissors },
    { id: 'grooming', label: 'Grooming', href: '/grooming', icon: Dog },
    { id: 'clientes', label: 'CRM', href: '/clientes', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
    { id: 'kanban', label: 'Kanban', href: '/kanban', icon: LayoutGrid },
    { id: 'equipo', label: 'Personal', href: '/equipo', icon: Briefcase },
    { id: 'compras', label: 'Compras', href: '/compras', icon: ShoppingBag },
    { id: 'inventario', label: 'Inventario', href: '/inventario', icon: Package },
    { id: 'contabilidad', label: 'Contabilidad', href: '/contabilidad', icon: FileText },
    { id: 'estadisticas', label: 'Estadísticas', href: '/estadisticas', icon: TrendingUp },
    { id: 'franquicias', label: 'Franquicias', href: '/franquicias', icon: Store },
    { id: 'apps', label: 'Apps', href: '/apps', icon: Blocks },
    { id: 'config', label: 'Ajustes', href: '/configuracion', icon: Settings },
    { id: 'admin', label: 'Admin', href: '/admin', icon: ShieldAlert },
  ], []);

  // Lista de módulos permitidos al usuario actual para el modal
  const availableToUser = useMemo(() => {
    return allItems.filter(item => {
      if (item.id === 'dashboard') return false; // ya es fijo
      if (item.id === 'admin') return isSuper;
      if (item.id === 'apps') return isSuper || isOwner;
      if (item.id === 'config') return isSuper || isOwner || session?.role === 'manager';

      const isClinica = item.id === 'clinica';
      const isModuleActiveInDock = item.id === 'inventario'
        ? (enabledModules.includes('inventario') || enabledModules.includes('catalogo'))
        : isClinica
          ? (enabledModules.includes('clinica') || enabledModules.some(m => m.startsWith('med_')))
          : enabledModules.includes(item.id);

      if (!isModuleActiveInDock) return false;

      if (userAllowed) {
        const isAllowed = isClinica
          ? (userAllowed.includes('clinica') || userAllowed.some((m: string) => m.startsWith('med_')))
          : (item.id === 'inventario' || item.id === 'catalogo')
            ? (userAllowed.includes('inventario') || userAllowed.includes('catalogo'))
            : userAllowed.includes(item.id);
        if (!isAllowed) return false;
      } else if (!isSuper && !isOwner && session?.role) {
        if (!hasPermission(session.role, item.id)) return false;
      }

      return true;
    });
  }, [allItems, enabledModules, userAllowed, session?.role, isSuper, isOwner]);

  // Filtramos la barra del Dock: 
  // 1. Siempre incluir 'dashboard'
  // 2. Incluir los IDs que estén en effectivePreferences y también en enabledModules
  // 3. Respetar estrictamente los módulos permitidos del empleado y su rol RBAC
  const activeItems = useMemo(() => {
    return allItems.filter(item => {
      if (item.id === 'dashboard') return true;
      if (item.id === 'admin') return isSuper;
      if (item.id === 'apps') return isSuper || isOwner;
      if (item.id === 'config') return isSuper || isOwner || session?.role === 'manager';

      const isClinica = item.id === 'clinica';
      const isModuleActiveInDock = item.id === 'inventario'
        ? (enabledModules.includes('inventario') || enabledModules.includes('catalogo'))
        : isClinica
          ? (enabledModules.includes('clinica') || enabledModules.some(m => m.startsWith('med_')))
          : enabledModules.includes(item.id);

      if (!isModuleActiveInDock) return false;

      // Si el usuario tiene lista manual de módulos permitidos (desde Rendo Hub)
      if (userAllowed) {
        const isAllowed = isClinica
          ? (userAllowed.includes('clinica') || userAllowed.some((m: string) => m.startsWith('med_')))
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
  }, [allItems, effectivePreferences, enabledModules, userAllowed, session?.role, isSuper, isOwner]);

  const handleSaveCustomization = async () => {
    setIsSavingLocal(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('rendo_mobile_dock', JSON.stringify(selectedInModal));
      }
      setLocalPrefs(selectedInModal);

      // Si el usuario es dueño o manager, sincronizar también con la empresa
      if ((isOwner || session?.role === 'manager' || isSuper) && currentTenant && actor) {
        const updatedMetadata = {
          ...currentTenant.metadata,
          mobile_dock_modules: selectedInModal
        };
        await updateTenantSettings(currentTenant.id, currentTenant.name, updatedMetadata, undefined, actor);
        setCurrentTenant({
          ...currentTenant,
          metadata: updatedMetadata
        });
      }

      setIsCustomizeOpen(false);
    } catch (err) {
      console.error('Error guardando accesos móviles:', err);
    } finally {
      setIsSavingLocal(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md md:hidden pointer-events-none">
        <div 
          className="pointer-events-auto flex items-center justify-around px-3 py-2.5 bg-card/90 dark:bg-slate-900/90 border border-border/80 rounded-[26px] shadow-2xl shadow-black/15 backdrop-blur-xl transition-all duration-300"
        >
          {activeItems.map((item) => {
            const IconComponent = (item.icon as any); /* eslint-disable-line */
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link 
                key={item.id} 
                href={item.href}
                className="flex flex-col items-center justify-center relative w-11 h-11 rounded-2xl transition-all btn-haptic"
              >
                <div
                  className={`flex items-center justify-center transition-transform duration-200 ${
                    isActive ? 'scale-110 -translate-y-0.5 text-primary font-bold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <IconComponent size={20} strokeWidth={isActive ? 2.5 : 2} />
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

          {/* Botón rápido para configurar dock */}
          <button
            type="button"
            onClick={() => {
              setSelectedInModal(effectivePreferences);
              setIsCustomizeOpen(true);
            }}
            className="flex flex-col items-center justify-center relative w-8 h-10 rounded-xl text-slate-400 hover:text-foreground transition-all shrink-0 -mr-1"
            title="Personalizar accesos rápidos"
          >
            <SlidersHorizontal size={15} />
            <span className="text-[8px] text-slate-400 font-semibold mt-0.5">Editar</span>
          </button>
        </div>
      </div>

      {/* MODAL / BOTTOM SHEET DE PERSONALIZACIÓN DIRECTA EN EL MÓVIL */}
      {isCustomizeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-primary" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-wide">
                  Personalizar Barra Móvil
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Escoge hasta 5 accesos rápidos para tu barra de navegación inferior. El botón de Inicio siempre estará incluido.
            </p>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {availableToUser.map(item => {
                const isSelected = selectedInModal.includes(item.id);
                const IconComp = item.icon as any;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedInModal(prev => prev.filter(id => id !== item.id));
                      } else {
                        if (selectedInModal.length >= 5) return;
                        setSelectedInModal(prev => [...prev, item.id]);
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                        : 'border-border bg-background text-slate-600 dark:text-slate-300 hover:border-primary/40'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      <IconComp size={15} />
                    </div>
                    <span className="text-xs truncate font-medium">{item.label}</span>
                    {isSelected && <Check size={14} className="ml-auto shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-xs font-bold text-slate-500 font-mono">
                {selectedInModal.length} de 5 seleccionados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomizeOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-foreground rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomization}
                  disabled={isSavingLocal}
                  className="px-5 py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-md btn-haptic disabled:opacity-50"
                >
                  {isSavingLocal ? 'Guardando...' : 'Aplicar Accesos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
