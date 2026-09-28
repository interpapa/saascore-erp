'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Crown, Database, CreditCard, Blocks, ArrowLeft, Zap, Users, Activity } from 'lucide-react';
import Link from 'next/link';
import { useERPStore } from '@/store/useERPStore';
import { useActionActor } from '@/hooks/useActionActor';
import { useRouter, usePathname } from 'next/navigation';
import { getSystemHealthAdminAction } from '@/app/actions/tenant';

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
    if (session?.role === 'superadmin') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      router.replace('/dashboard');
    }
  }, [session, router]);

  useEffect(() => {
    if (session?.role === 'superadmin') {
      const activeActor = actor || { email: session.userEmail || '', role: 'superadmin' as const };
      getSystemHealthAdminAction(activeActor).then(res => {
        if (res.success && res.data) {
          setHealthData(res.data);
        }
      });
    }
  }, [session?.role, actor]);

  if (isAuthorized === null) return null; // Cargando
  if (!isAuthorized) return null; // Redirigiendo

  const navItems = [
    { href: '/admin', label: 'Tenants (Clientes)', icon: Database, exact: true },
    { href: '/admin/billing', label: 'Facturación & MRR', icon: CreditCard, exact: false },
    { href: '/admin/studio', label: 'Lego Studio', icon: Blocks, exact: false },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex font-sans">
      
      {/* Sidebar de Dios */}
      <aside className="w-64 border-r border-white/10 bg-slate-900/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black text-rose-500 tracking-tight flex items-center gap-2">
            <Crown size={24} />
            Rendo Hub
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Master Control Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all border ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/dashboard"
            className="flex justify-center items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all border border-white/5"
          >
            <ArrowLeft size={16} />
            Volver al ERP
          </Link>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-white/10 flex items-center px-8 justify-between bg-slate-900/30 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-slate-300">Resumen Global</h2>
            {healthData && (
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono">
                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  <Database size={13} className="text-rose-400" />
                  <b>{healthData.tenantsCount}</b> Tenants
                </span>
                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  <Users size={13} className="text-indigo-400" />
                  <b>{healthData.usersCount}</b> Usuarios
                </span>
                <span className="flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  <Activity size={13} className="text-emerald-400" />
                  <b>{healthData.todayDocsCount}</b> Transacciones Hoy
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {healthData && (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <Zap size={11} /> {healthData.latencyMs}ms
              </span>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${healthData?.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
              <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Sistemas Operativos</span>
            </div>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
