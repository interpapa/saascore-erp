'use client';

import { ReactNode, useEffect, useState } from 'react';
import { Crown, Database, ShieldAlert, Activity } from 'lucide-react';
import Link from 'next/link';
import { useERPStore } from '@/store/useERPStore';
import { useRouter } from 'next/navigation';

export default function RendoLayout({ children }: { children: ReactNode }) {
  const { session } = useERPStore();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // Evitar parpadeos o redirecciones en el lado del servidor
    if (session?.role === 'superadmin') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      router.replace('/dashboard');
    }
  }, [session, router]);

  if (isAuthorized === null) return null; // Cargando
  if (!isAuthorized) return null; // Redirigiendo

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex font-sans">
      
      {/* Sidebar de Dios */}
      <aside className="w-64 border-r border-white/10 bg-slate-900/50 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-black text-rose-500 tracking-tight flex items-center gap-2">
            <Crown size={24} />
            Rendo Hub
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-widest">Master Control Panel</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-rose-500/10 text-rose-400 rounded-xl font-bold transition-all border border-rose-500/20">
            <Database size={18} />
            Tenants (Clientes)
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/" className="flex justify-center items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-medium transition-all">
            Volver a la App (Taller)
          </Link>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-white/10 flex items-center px-8 justify-between bg-slate-900/30 backdrop-blur-md sticky top-0 z-10">
          <h2 className="font-bold text-slate-300">Resumen Global</h2>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Sistemas Operativos</span>
          </div>
        </header>
        <div className="p-8">
          {children}
        </div>
      </main>

    </div>
  );
}
