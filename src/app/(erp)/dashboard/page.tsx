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
  Sparkles,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();

  const apps = [
    { id: 'caja', name: 'Caja POS', icon: Wrench, color: '#10B981', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]', href: '/caja' },
    { id: 'clientes', name: 'Clientes CRM', icon: Users, color: '#3B82F6', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]', href: '/clientes' },
    { id: 'catalogo', name: 'Catálogo', icon: Box, color: '#8B5CF6', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.3)]', href: '/catalogo' },
    { id: 'estadisticas', name: 'Estadísticas', icon: BarChart3, color: '#0ea5e9', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(14,165,233,0.3)]', href: '/estadisticas' },
    { id: 'compras', name: 'Compras AP', icon: ShoppingCart, color: '#F59E0B', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]', href: '/compras' },
    { id: 'contabilidad', name: 'Contabilidad', icon: Scale, color: '#64748B', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(100,116,139,0.3)]', href: '/contabilidad' },
    { id: 'calendario', name: 'Citas y Turnos', icon: CalendarDays, color: '#60A5FA', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(96,165,250,0.3)]', href: '/calendario' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#10B981', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]', href: '/whatsapp' },
    { id: 'kanban', name: 'Órdenes de Trabajo', icon: KanbanSquare, color: '#F97316', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)]', href: '/kanban' },
    { id: 'equipo', name: 'Personal & Nómina', icon: Users, color: '#6366F1', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.3)]', href: '/equipo' },
    { id: 'franquicias', name: 'Franquicias', icon: Building2, color: '#06B6D4', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]', href: '/franquicias' },
    { id: 'integraciones', name: 'Conexiones', icon: PlugZap, color: '#D946EF', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(217,70,239,0.3)]', href: '/integraciones' },
    { id: 'apps', name: 'Marketplace', icon: LayoutGrid, color: '#A855F7', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]', href: '/apps' },
    { id: 'config', name: 'Ajustes', icon: Settings, color: '#475569', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(71,85,105,0.3)]', href: '/configuracion' },
    { id: 'admin', name: 'SaaSCore Hub', icon: Crown, color: '#EC4899', bgGlow: 'hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]', href: '/admin' },
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-border/60 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-3 font-sans">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-xs shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            SaaSCore OS
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 font-sans">
            {currentTenant?.name || 'Configurando tu empresa...'}
          </p>
        </div>
        
        <button 
          onClick={signOut} 
          className="btn-base btn-secondary btn-sm flex items-center gap-2"
        >
          Cerrar Sesión
        </button>
      </div>

      {/* Grid de Aplicaciones (Consola de Control Premium) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">Ecosistema de Aplicaciones</h2>
          <span className="text-xs text-slate-400 font-semibold font-sans">{apps.length} módulos activos</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <a
                href={app.href}
                key={app.id}
                className={`
                  flex flex-col items-start p-5 rounded-2xl border border-border/80 bg-card/45 backdrop-blur-md
                  transition-all duration-300 group hover:-translate-y-1 hover:border-foreground/20 hover:bg-card/75
                  ${app.bgGlow}
                `}
              >
                {/* Contenedor del Icono */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{
                    background: `${app.color}15`, // Fondo semitransparente del mismo color
                    border: `1px solid ${app.color}25`
                  }}
                >
                  <Icon 
                    size={22} 
                    style={{ color: app.color }} 
                    strokeWidth={1.5}
                    className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.1)] group-hover:drop-shadow-[0_2px_12px_var(--primary)]"
                  />
                </div>

                {/* Nombre de la Aplicación */}
                <span className="text-foreground font-semibold text-sm tracking-tight mb-1 group-hover:text-primary transition-colors font-sans">
                  {app.name}
                </span>
                
                {/* Indicador de Acción */}
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider group-hover:text-primary transition-colors flex items-center gap-1 font-sans">
                  Abrir módulo
                  <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 text-center border-t border-border/40">
        <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase font-sans">SaaSCore OS v3.0 · Modular Enterprise Engine</p>
      </div>

    </div>
  );
}

// Inline helper for arrow
function ArrowRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}
