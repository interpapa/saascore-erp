'use client';

export const dynamic = 'force-dynamic';

import { ReactNode, useEffect, useState } from 'react';
import { Crown, Database, CreditCard, Blocks, ArrowLeft, Zap, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter, usePathname } from 'next/navigation';
import { getSystemHealthAdminAction } from '@/app/actions/tenant';
import { AmbientBackground } from '@/components/core/AmbientBackground';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
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
    // Permitir acceso EXCLUSIVO a superadmins autenticados en lista blanca de Rendo Hub
    const isSuper = session?.role === 'superadmin' && isSuperAdminEmail(session?.userEmail);
    if (isSuper) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      router.replace('/dashboard');
    }
  }, [session?.role, session?.userEmail, router]);

  useEffect(() => {
    const isSuper = session?.role === 'superadmin' && isSuperAdminEmail(session?.userEmail);
    if (isSuper && session?.userEmail) {
      const activeActor = actor || { email: session.userEmail || '', role: 'superadmin' as any };
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

      <main className="relative z-10 pt-3 sm:pt-6 pb-32 md:pb-12 px-3 sm:px-6 max-w-7xl mx-auto w-full min-w-0">
        {/* Barra superior de navegación unificada del Módulo SaaS Admin */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-8 pb-4 sm:pb-5 border-b border-border/80 bg-card/60 backdrop-blur-md p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border shadow-xs">
          {/* Fila Superior: Título de Rendo Hub + Modo Oscuro + Botón de Salida */}
          <div className="flex items-center justify-between gap-2.5 w-full lg:w-auto">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold border border-rose-500/20 shadow-xs shrink-0">
                <Crown size={18} className="sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-black text-foreground tracking-tight leading-none truncate">Rendo Hub</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-0.5 truncate">Consola Central SaaS</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center">
                <ThemeToggle />
              </div>
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs shrink-0 btn-haptic group"
                title="Volver al panel principal del ERP"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Pestañas horizontales de navegación del módulo */}
          <div className="w-full lg:w-auto overflow-x-auto no-scrollbar -mx-1 px-1">
            <nav className="flex items-center gap-1.5 p-1 bg-muted/60 border border-border rounded-xl sm:rounded-2xl w-max">
              {navItems.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap btn-haptic ${
                      isActive
                        ? 'bg-card text-foreground shadow-xs border border-border'
                        : 'text-slate-500 hover:text-foreground hover:bg-card/50'
                    }`}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Telemetría y estado de servidores */}
        {healthData && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 mb-5 sm:mb-6 p-3 sm:px-4 sm:py-2.5 bg-card/60 border border-border/80 rounded-2xl text-xs text-slate-500 font-mono shadow-2xs">
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <Database size={13} className="text-rose-500 shrink-0" />
                <b className="text-foreground">{healthData.tenantsCount}</b>
                <span className="text-muted-foreground hidden sm:inline">Empresas</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <Users size={13} className="text-indigo-500 shrink-0" />
                <b className="text-foreground">{healthData.usersCount}</b>
                <span className="text-muted-foreground hidden sm:inline">Usuarios</span>
              </span>
              <span className="flex items-center gap-1.5 text-[11px] sm:text-xs truncate">
                <Activity size={13} className="text-emerald-500 shrink-0" />
                <b className="text-foreground">{healthData.todayDocsCount}</b>
                <span className="text-muted-foreground hidden sm:inline">Transacciones</span>
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50 text-[11px]">
              <span className="flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                <Zap size={11} /> {healthData.latencyMs}ms
              </span>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider shrink-0 text-[10px] sm:text-[11px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operativo
              </div>
            </div>
          </div>
        )}

        {/* Contenido del Módulo */}
        <div className="animate-in fade-in duration-300 w-full overflow-hidden">
          {children}
        </div>
      </main>

      <MobileDock />
    </div>
  );
}
