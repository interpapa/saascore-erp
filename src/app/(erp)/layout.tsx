'use client';

import React, { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AICopilot } from '@/components/core/AICopilot';
import { FloatingHeader } from '@/components/core/FloatingHeader';
import { AmbientBackground } from '@/components/core/AmbientBackground';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';
import { useKeybindings } from '@/hooks/useKeybindings';
import { useERPStore } from '@/store/useERPStore';
import { Lock, LayoutGrid } from 'lucide-react';
import Link from 'next/link';

const routeToModuleId: Record<string, string> = {
  '/caja': 'caja',
  '/clientes': 'clientes',
  '/catalogo': 'catalogo',
  '/compras': 'compras',
  '/contabilidad': 'contabilidad',
  '/calendario': 'calendario',
  '/whatsapp': 'whatsapp',
  '/kanban': 'kanban',
  '/equipo': 'equipo',
  '/franquicias': 'franquicias',
  '/integraciones': 'integraciones'
};

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeybindings();
  const pathname = usePathname();
  const { currentTenant } = useERPStore();

  // Verificar si la ruta actual es un módulo inactivo
  const enabledModules = currentTenant?.metadata?.active_modules || [
    'caja', 'clientes', 'catalogo', 'compras', 'contabilidad', 'calendario', 'whatsapp', 'kanban', 'equipo', 'franquicias', 'integraciones', 'config', 'admin'
  ];

  // Buscamos si la ruta actual (o su prefijo) corresponde a un módulo del ERP
  const matchedRoute = Object.keys(routeToModuleId).find(route => pathname.startsWith(route));
  const isModuleDisabled = matchedRoute ? !enabledModules.includes(routeToModuleId[matchedRoute]) : false;

  return (
    <div className="min-h-screen text-foreground overflow-x-hidden selection:bg-primary/30 relative">
      <AmbientBackground />

      <div className="relative z-10 flex flex-col min-h-screen">
        <FloatingHeader />
        <main className="flex-1 w-full pt-20">
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
            <ErrorBoundary key={pathname} moduleName="este módulo">
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
      </div>

      <AICopilot />
    </div>
  );
}
