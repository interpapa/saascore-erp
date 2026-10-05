'use client';

export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState } from 'react';
import { Crown, Database, CreditCard, Blocks, ArrowLeft, Zap, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter, usePathname } from 'next/navigation';
import { getSystemHealthAdminAction } from '@/app/actions/tenant';
import { FloatingHeader } from '@/components/core/FloatingHeader';
import { AmbientBackground } from '@/components/core/AmbientBackground';
import { MobileDock } from '@/components/core/MobileDock';
import { isSuperAdminEmail } from '@/lib/core/tenantSecurity';

export default function RendoLayout({ children }: { children: ReactNode }) {
  const { session } = useERPStore();
  const actor = useActionActor();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [healthData, setHealthData] = useState<{
    latencyMs: number;
    tenantsCount: number;
    usersCount: number;
    todayDocsCount: number;
    status: 'healthy' | 'degraded';
  } | null>(null);

  useEffect(() => {
    // Evitar parpadeos o redirecciones en el lado del servidor
    const isSuper = session?.role === 'superadmin' || isSuperAdminEmail(session?.userEmail);
    if (isSuper) {
      setIsAuthorized(true);
      if (session && session.role !== 'superadmin') {
        useERPStore.getState().setSession({
          ...session,
          role: 'superadmin'
        });
      }
    } else {
      setIsAuthorized(false);
      router.replace('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    const isSuper = session?.role === 'superadmin' || isSuperAdminEmail(session?.userEmail);
    if (isSuper && session?.userEmail) {
      const activeActor = actor || { email: session.userEmail || '', role: 'superadmin' as const };
      getSystemHealthAdminAction(activeActor)
        .then(res => {
          if (res.success && res.data) {
            setHealthData(res.data);
          }
        })
        .catch(err => {
          console.warn('[RendoLayout healthData error]:', err);
        });
    }
  }, [session?.role, session?.userEmail, actor]);

  if (isAuthorized === null) return null; // Cargando
  if (!isAuthorized) return null; // Redirigiendo

  const navItems = [
    { href: '/admin', label: 'Tenants & Clientes', icon: Database, exact: true },
    { href: '/admin/users', label: 'Usuarios & Accesos', icon: Users, exact: false },
    { href: '/admin/billing', label: 'Facturación SaaS', icon: CreditCard, exact: false },
    { href: '/admin/studio', label: 'Lego Studio', icon: Blocks, exact: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/20 selection:text-primary font-sans">
      <AmbientBackground />
      <FloatingHeader />

      <main className="relative z-10 pt-24 pb-24 md:pb-12 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        {/* Barra superior de navegación unificada del Módulo SaaS Admin */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-border/80 bg-card/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border shadow-xs">
          {/* Botón directo de regreso al Dashboard + Título de Módulo */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md shadow-primary/20 btn-haptic group shrink-0"
              title="Volver al panel principal del ERP"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>Volver al Dashboard</span>
            </Link>

            <div className="h-6 w-px bg-border hidden sm:block" />

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold border border-rose-500/20 shadow-xs">
                <Crown size={20} />
              </div>
              <div>
                <h1 className="text-lg font-black text-foreground tracking-tight leading-none">Rendo Hub</h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">Módulo de Administración SaaS</p>
              </div>
            </div>
          </div>

          {/* Pestañas horizontales de navegación del módulo */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <nav className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-2xl w-full sm:w-auto">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap btn-haptic ${
                      isActive
                        ? 'bg-card text-foreground shadow-xs border border-border'
                        : 'text-slate-500 hover:text-foreground hover:bg-card/50'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Telemetría y estado de servidores */}
        {healthData && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 px-4 py-2.5 bg-card/60 border border-border/80 rounded-2xl text-xs text-slate-500 font-mono shadow-2xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <Database size={13} className="text-rose-500" />
                <b className="text-foreground">{healthData.tenantsCount}</b> Empresas
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-indigo-500" />
                <b className="text-foreground">{healthData.usersCount}</b> Usuarios
              </span>
              <span className="flex items-center gap-1.5">
                <Activity size={13} className="text-emerald-500" />
                <b className="text-foreground">{healthData.todayDocsCount}</b> Transacciones Hoy
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                <Zap size={11} /> {healthData.latencyMs}ms
              </span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistemas Operativos
              </div>
            </div>
          </div>
        )}

        {/* Contenido del Módulo */}
        <div className="animate-in fade-in duration-300">
          {children}
        </div>
      </main>

      <MobileDock />
    </div>
  );
}
