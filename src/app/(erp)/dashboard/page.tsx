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
  ChevronRight,
  ShoppingCart,
  KanbanSquare,
  Building2,
  PlugZap,
  Settings2
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();
  
  const apps = [
    { id: 'caja', name: 'Caja', icon: Wrench, gradient: 'from-emerald-500 to-teal-600', href: '/caja' },
    { id: 'clientes', name: 'Clientes', icon: Users, gradient: 'from-blue-500 to-indigo-600', href: '/clientes' },
    { id: 'catalogo', name: 'Catálogo', icon: Box, gradient: 'from-violet-500 to-purple-600', href: '/catalogo' },
    { id: 'compras', name: 'Compras AP', icon: ShoppingCart, gradient: 'from-orange-500 to-amber-600', href: '/compras' },
    { id: 'contabilidad', name: 'Contabilidad', icon: Scale, gradient: 'from-slate-800 to-slate-900', href: '/contabilidad' },
    { id: 'calendario', name: 'Calendario', icon: CalendarDays, gradient: 'from-blue-400 to-blue-600', href: '/calendario' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, gradient: 'from-green-400 to-emerald-600', href: '/whatsapp' },
    { id: 'tickets', name: 'Tickets', icon: ListChecks, gradient: 'from-teal-500 to-teal-700', href: '/tickets' },
    { id: 'kanban', name: 'Kanban', icon: KanbanSquare, gradient: 'from-yellow-400 to-orange-500', href: '/kanban' },
    { id: 'equipo', name: 'Equipo', icon: Users, gradient: 'from-indigo-400 to-indigo-600', href: '/equipo' },
    { id: 'franquicias', name: 'Franquicias', icon: Building2, gradient: 'from-cyan-500 to-blue-600', href: '/franquicias' },
    { id: 'integraciones', name: 'Conexiones', icon: PlugZap, gradient: 'from-fuchsia-500 to-pink-600', href: '/integraciones' },
    { id: 'config', name: 'Ajustes', icon: Settings, gradient: 'from-slate-500 to-slate-700', href: '/configuracion' },
    { id: 'admin', name: 'SaaSCore Hub', icon: Crown, gradient: 'from-pink-500 to-rose-600', href: '/admin' },
  ];

  return (
    <div className="min-h-screen flex flex-col pt-12 pb-24 px-6 animate-in fade-in zoom-in-95 duration-500">
      
      <div className="max-w-4xl mx-auto w-full mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight mb-2 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/50">
              <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-sm animate-pulse"></div>
            </div>
            SaaSCore OS
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Bienvenido, {currentTenant?.name || 'Configurando tu empresa...'}
          </p>
        </div>
        
        <button onClick={signOut} className="flex items-center gap-2 bg-black/5 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-500/10 border border-border hover:border-red-200 dark:hover:border-red-500/30 hover:text-red-600 dark:hover:text-red-400 px-4 py-2 rounded-xl transition-colors btn-haptic group">
          <span className="text-sm font-medium">Cerrar Sesión</span>
        </button>
      </div>

      {/* Grid de Aplicaciones (Launcher) */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-10 gap-x-6">
        {apps.map((app) => (
          <Link href={app.href} key={app.id} className="flex flex-col items-center gap-3 group btn-haptic">
            <div className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg shadow-black/20 dark:shadow-black/60 border border-white/20 dark:border-white/10 group-hover:border-white/40 dark:group-hover:border-white/20 transition-all`}>
              <app.icon className="text-white w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" strokeWidth={1.5} />
            </div>
            <span className="text-foreground dark:text-slate-300 text-xs sm:text-sm font-medium tracking-wide group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {app.name}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-auto pt-16 text-center">
        <p className="text-slate-600 dark:text-slate-400 text-xs font-medium tracking-widest uppercase">SaaSCore OS v3.0 · React Engine</p>
      </div>

    </div>
  );
}
