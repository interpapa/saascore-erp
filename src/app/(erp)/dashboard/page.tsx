'use client';

import { 
  Users, 
  Box, 
  Scale, 
  CalendarDays, 
  MessageCircle, 
  Settings, 
  Crown, 
  ListChecks, 
  Wrench,
  ShoppingCart,
  KanbanSquare,
  Building2,
  PlugZap,
  LayoutGrid,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();

  const apps = [
    { id: 'caja', name: 'Caja POS', icon: Wrench, gradient: 'from-emerald-500 to-teal-600', href: '/caja' },
    { id: 'clientes', name: 'Clientes', icon: Users, gradient: 'from-blue-500 to-indigo-600', href: '/clientes' },
    { id: 'catalogo', name: 'Catálogo', icon: Box, gradient: 'from-violet-500 to-purple-600', href: '/catalogo' },
    { id: 'compras', name: 'Compras AP', icon: ShoppingCart, gradient: 'from-orange-500 to-amber-600', href: '/compras' },
    { id: 'contabilidad', name: 'Contabilidad NIIF', icon: Scale, gradient: 'from-slate-800 to-slate-900', href: '/contabilidad' },
    { id: 'calendario', name: 'Citas y Turnos', icon: CalendarDays, gradient: 'from-blue-400 to-blue-600', href: '/calendario' },
    { id: 'whatsapp', name: 'WhatsApp CRM', icon: MessageCircle, gradient: 'from-green-400 to-emerald-600', href: '/whatsapp' },
    { id: 'kanban', name: 'Órdenes de Trabajo', icon: KanbanSquare, gradient: 'from-yellow-400 to-orange-500', href: '/kanban' },
    { id: 'equipo', name: 'Personal & Nómina', icon: Users, gradient: 'from-indigo-400 to-indigo-600', href: '/equipo' },
    { id: 'franquicias', name: 'Franquicias', icon: Building2, gradient: 'from-cyan-500 to-blue-600', href: '/franquicias' },
    { id: 'integraciones', name: 'Integraciones & APIs', icon: PlugZap, gradient: 'from-fuchsia-500 to-pink-600', href: '/integraciones' },
    { id: 'apps', name: 'Mercado de Apps', icon: LayoutGrid, gradient: 'from-purple-500 to-indigo-700', href: '/apps' },
    { id: 'config', name: 'Ajustes', icon: Settings, gradient: 'from-slate-500 to-slate-700', href: '/configuracion' },
    { id: 'admin', name: 'SaaSCore Hub', icon: Crown, gradient: 'from-pink-500 to-rose-600', href: '/admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col pt-8 pb-24 px-4 sm:px-6 max-w-5xl mx-auto w-full space-y-10 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            SaaSCore OS
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            {currentTenant?.name || 'Configurando tu empresa...'}
          </p>
        </div>
        
        <button 
          onClick={signOut} 
          className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-red-50 dark:hover:bg-red-500/10 border border-border hover:border-red-200 dark:hover:border-red-500/30 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-xl text-xs font-bold transition-all btn-haptic"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Grid de Aplicaciones (Launcher Estilo Odoo / macOS) */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ecosistema de Aplicaciones</h2>
          <span className="text-xs text-slate-400 font-medium">{apps.length} módulos disponibles</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-12 gap-x-6">
          {apps.map((app) => (
            <Link href={app.href} key={app.id} prefetch={false} className="flex flex-col items-center gap-3 group btn-haptic">
              <div className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-black/60 border border-white/20 dark:border-white/10 group-hover:border-white/40 dark:group-hover:border-white/20 group-hover:scale-105 transition-all`}>
                <app.icon className="text-white w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" strokeWidth={1.5} />
              </div>
              <span className="text-foreground dark:text-slate-300 text-xs sm:text-sm font-semibold tracking-wide group-hover:text-primary transition-colors text-center leading-tight">
                {app.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-16 text-center">
        <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">SaaSCore OS v3.0 · Modular Enterprise Engine</p>
      </div>

    </div>
  );
}
