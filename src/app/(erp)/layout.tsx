'use client';

import React, { Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FloatingHeader } from '@/components/core/FloatingHeader';
import { AmbientBackground } from '@/components/core/AmbientBackground';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';
import { useKeybindings } from '@/hooks/useKeybindings';
import { useERPStore } from '@/store/useERPStore';
import { Lock, LayoutGrid, Eye, LogOut } from 'lucide-react';
import Link from 'next/link';
import { MobileDock } from '@/components/core/MobileDock';

const routeToModuleId: Record<string, string> = {
  '/caja': 'caja',
  '/clientes': 'clientes',
  '/inventario': 'inventario',
  '/catalogo': 'inventario',
  '/estadisticas': 'estadisticas',
  '/compras': 'compras',
  '/contabilidad': 'contabilidad',
  '/calendario': 'calendario',
  '/whatsapp': 'whatsapp',
  '/kanban': 'kanban',
  '/equipo': 'equipo',
  '/franquicias': 'franquicias',
  '/integraciones': 'integraciones',
  '/odontologia': 'odontologia',
  '/apps': 'apps'
};

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeybindings();
  const pathname = usePathname();
  const router = useRouter();
  const currentTenant = useERPStore(s => s.currentTenant);
  const impersonatedTenant = useERPStore(s => s.impersonatedTenant);
  const stopImpersonation = useERPStore(s => s.stopImpersonation);

  // Verificar si la ruta actual es un módulo inactivo
  const fallbackModules = ['caja', 'clientes', 'inventario', 'catalogo', 'estadisticas', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'equipo', 'franquicias', 'odontologia', 'config', 'admin'];
  const tenantModules = (currentTenant?.active_modules && currentTenant.active_modules.length > 0) 
    ? currentTenant.active_modules 
    : ((currentTenant?.metadata as any)?.active_modules && Array.isArray((currentTenant?.metadata as any).active_modules) && (currentTenant?.metadata as any).active_modules.length > 0)
      ? (currentTenant?.metadata as any).active_modules
      : null;
  const enabledModules = tenantModules || fallbackModules;

  // Buscamos si la ruta actual (o su prefijo) corresponde a un módulo del ERP
  const matchedRoute = Object.keys(routeToModuleId).find(route => pathname.startsWith(route));
  const targetModule = matchedRoute ? routeToModuleId[matchedRoute] : null;
  const isModuleDisabled = targetModule
    ? (!enabledModules.includes(targetModule) && !(targetModule === 'inventario' && enabledModules.includes('catalogo')))
    : false;

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 relative">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        {impersonatedTenant && (
          <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-indigo-600 text-white text-xs py-2 px-4 sticky top-0 z-50 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 font-bold truncate">
              <Eye size={15} className="animate-pulse shrink-0" />
              <span>MODO SOPORTE ACTIVO (Modo Dios):</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-mono truncate">
                {impersonatedTenant.name}
              </span>
            </div>
            <button
              onClick={() => {
                stopImpersonation();
                router.push('/admin');
              }}
              className="bg-white text-slate-900 hover:bg-slate-100 px-3 py-1 rounded-lg font-black text-[11px] transition-all shrink-0 shadow-sm ml-4 flex items-center gap-1.5"
            >
              <LogOut size={13} />
              Salir y Volver a Rendo Hub
            </button>
          </div>
        )}
        <FloatingHeader />
        <main className="flex-1 w-full pt-20 pb-24 md:pb-6">
          {isModuleDisabled ? (
            <div className="w-full max-w-xl mx-auto px-6 py-20 text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 mx-auto shadow-sm">
                <Lock size={28} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Módulo Desactivado</h2>
                <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
                  Este módulo no está habilitado en los ajustes de tu empresa. Puedes activarlo al instante desde el mercado de aplicaciones.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <Link
                  href="/apps"
                  className="btn-base bg-primary hover:bg-primary/90 text-primary-foreground font-black text-sm px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 btn-haptic"
                >
                  <LayoutGrid size={16} />
                  Ir al Mercado
                </Link>
                <Link
                  href="/dashboard"
                  className="btn-base bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground font-bold text-sm px-6 py-2.5 rounded-xl transition-all border border-border flex items-center gap-2 btn-haptic"
                >
                  Volver al Inicio
                </Link>
              </div>
            </div>
          ) : (
            <ErrorBoundary moduleName="este módulo">
              <Suspense 
                fallback={
                  <div className="w-full max-w-6xl mx-auto px-6 py-12 flex justify-center items-center">
                    <div className="flex items-center gap-3 text-slate-500 font-medium text-sm">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Cargando módulo...
                    </div>
                  </div>
                }
              >
                {children}
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
        
        {/* Dock de navegación inferior móvil */}
        <MobileDock />
      </div>
    </div>
  );
}
