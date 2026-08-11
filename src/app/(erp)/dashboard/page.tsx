'use client';

import { useState, useEffect } from 'react';
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
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';
import { useTenantResolver } from '@/hooks/useTenantResolver';
import { getDocumentsAction } from '@/app/actions/documents';
import { getItemsAction } from '@/app/actions/items';
import { getAppointmentsAction } from '@/app/actions/appointments';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();
  const tenant = useTenantResolver();

  const [todaySales, setTodaySales] = useState(0);
  const [criticalStockCount, setCriticalStockCount] = useState(0);
  const [todayApptsCount, setTodayApptsCount] = useState(0);
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);

  useEffect(() => {
    async function loadKPIs() {
      if (!tenant) return;
      try {
        setIsLoadingKPIs(true);
        const [docsRes, itemsRes, apptsRes] = await Promise.all([
          getDocumentsAction(tenant.id, 'invoice'),
          getItemsAction(tenant.id, 'product'),
          getAppointmentsAction(tenant.id, { status: 'all', employee_id: 'all', service_id: 'all', search: '' }),
        ]);

        if (docsRes.success) {
          const total = (docsRes.documents || [])
            .filter((d: any) => d.status === 'invoiced' || d.status === 'paid')
            .reduce((sum: number, d: any) => sum + (d.total_amount || 0), 0);
          setTodaySales(total);
        }

        if (itemsRes.success) {
          const lowStock = (itemsRes.items || []).filter((i: any) => i.stock !== null && i.stock <= 5).length;
          setCriticalStockCount(lowStock);
        }

        if (apptsRes.success) {
          setTodayApptsCount((apptsRes.appointments || []).length);
        }
      } catch (err) {
        console.error('Error cargando KPIs del dashboard:', err);
      } finally {
        setIsLoadingKPIs(false);
      }
    }
    loadKPIs();
  }, [tenant]);

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
    <div className="min-h-screen flex flex-col pt-6 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <div className="w-3.5 h-3.5 bg-primary rounded-sm animate-pulse" />
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

      {/* Tarjetas de KPIs Ejecutivos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Ventas del Día */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Facturación Hoy</span>
            <p className="text-2xl font-black text-foreground">
              {isLoadingKPIs ? '...' : `$${todaySales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Stock Crítico */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Stock Crítico (≤ 5)</span>
            <p className="text-2xl font-black text-foreground">
              {isLoadingKPIs ? '...' : `${criticalStockCount} ítems`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Citas de Hoy */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-xs relative overflow-hidden flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Agenda de Citas</span>
            <p className="text-2xl font-black text-foreground">
              {isLoadingKPIs ? '...' : `${todayApptsCount} programadas`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Grid de Aplicaciones (Launcher) */}
      <div>
        <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Módulos del Sistema</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-y-10 gap-x-6">
          {apps.map((app) => (
            <Link href={app.href} key={app.id} className="flex flex-col items-center gap-3 group btn-haptic">
              <div className={`w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-[22px] bg-gradient-to-br ${app.gradient} flex items-center justify-center shadow-lg shadow-black/10 dark:shadow-black/60 border border-white/20 dark:border-white/10 group-hover:border-white/40 dark:group-hover:border-white/20 transition-all`}>
                <app.icon className="text-white w-8 h-8 sm:w-9 sm:h-9 drop-shadow-md" strokeWidth={1.5} />
              </div>
              <span className="text-foreground dark:text-slate-300 text-xs sm:text-sm font-semibold tracking-wide group-hover:text-primary transition-colors text-center">
                {app.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto pt-10 text-center">
        <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">SaaSCore OS v3.0 · React Engine</p>
      </div>

    </div>
  );
}
