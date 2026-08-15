'use client';

import React from 'react';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';
import { 
  Coins, 
  Users, 
  Package, 
  TrendingUp, 
  ShoppingCart, 
  Scale, 
  Calendar, 
  MessageSquare, 
  Kanban, 
  Contact, 
  Store, 
  Webhook, 
  Grid, 
  Sliders, 
  ShieldCheck,
  Sparkles 
} from 'lucide-react';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();

  const apps = [
    { 
      id: 'caja', 
      name: 'Caja POS', 
      href: '/caja',
      gradient: 'from-emerald-400 to-emerald-600',
      icon: <Coins className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'clientes', 
      name: 'Clientes CRM', 
      href: '/clientes',
      gradient: 'from-blue-500 to-indigo-600',
      icon: <Users className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'catalogo', 
      name: 'Catálogo', 
      href: '/catalogo',
      gradient: 'from-violet-500 to-purple-600',
      icon: <Package className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'estadisticas', 
      name: 'Estadísticas', 
      href: '/estadisticas',
      gradient: 'from-sky-400 to-blue-500',
      icon: <TrendingUp className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'compras', 
      name: 'Compras AP', 
      href: '/compras',
      gradient: 'from-amber-400 to-orange-500',
      icon: <ShoppingCart className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'contabilidad', 
      name: 'Contabilidad', 
      href: '/contabilidad',
      gradient: 'from-teal-400 to-emerald-600',
      icon: <Scale className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'calendario', 
      name: 'Citas y Turnos', 
      href: '/calendario',
      gradient: 'from-cyan-400 to-blue-500',
      icon: <Calendar className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Inbox', 
      href: '/whatsapp',
      gradient: 'from-green-400 to-emerald-500',
      icon: <MessageSquare className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'kanban', 
      name: 'Órdenes Trabajo', 
      href: '/kanban',
      gradient: 'from-orange-400 to-red-500',
      icon: <Kanban className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'equipo', 
      name: 'Personal HRMS', 
      href: '/equipo',
      gradient: 'from-indigo-400 to-purple-600',
      icon: <Contact className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'franquicias', 
      name: 'Franquicias', 
      href: '/franquicias',
      gradient: 'from-pink-500 to-rose-600',
      icon: <Store className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'integraciones', 
      name: 'Conexiones API', 
      href: '/integraciones',
      gradient: 'from-fuchsia-400 to-pink-600',
      icon: <Webhook className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'apps', 
      name: 'Marketplace', 
      href: '/apps',
      gradient: 'from-yellow-400 to-amber-500',
      icon: <Grid className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      href: '/configuracion',
      gradient: 'from-slate-400 to-slate-600',
      icon: <Sliders className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    },
    { 
      id: 'admin', 
      name: 'SaaSCore Hub', 
      href: '/admin',
      gradient: 'from-rose-400 to-pink-600',
      icon: <ShieldCheck className="w-9 h-9 text-white transition-transform duration-350 ease-out group-hover:scale-110" />
    }
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

      {/* Grid de Aplicaciones */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">Ecosistema de Módulos</h2>
          <span className="text-xs text-slate-400 font-semibold font-sans">{apps.length} aplicaciones activas</span>
        </div>

        {/* 
          Grilla tipo Launchpad / iPhone optimizada.
          Squircles de tamaño 80px (w-20 h-20, rounded-[24px]) con bordes finos,
          brillo interior 3D y sombras arrojadas realistas (iOS/macOS Big Sur style).
          Contiene glifos vectoriales profesionales de Lucide con escalado elástico perfecto.
        */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-12 gap-x-8 justify-items-center">
          {apps.map((app) => (
            <a
              href={app.href}
              key={app.id}
              className="flex flex-col items-center group btn-haptic w-28"
            >
              {/* Contenedor Squircle Premium con Efecto de Brillo y Sombra Interior */}
              <div 
                className={`
                  w-20 h-20 rounded-[24px] bg-gradient-to-br ${app.gradient}
                  flex items-center justify-center border border-white/15
                  shadow-[inset_0_1.5px_3px_rgba(255,255,255,0.4),_0_8px_20px_rgba(0,0,0,0.25)]
                  transition-all duration-350 ease-out
                  group-hover:scale-105 group-hover:-translate-y-1.5
                  group-hover:shadow-[0_12px_30px_rgba(0,0,0,0.45),_inset_0_2px_4px_rgba(255,255,255,0.6)]
                `}
              >
                {app.icon}
              </div>

              {/* Nombre de la Aplicación */}
              <span className="text-foreground font-semibold text-xs mt-3.5 text-center tracking-tight font-sans group-hover:text-primary transition-colors line-clamp-2 px-1">
                {app.name}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 text-center border-t border-border/40">
        <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase font-sans">SaaSCore OS v3.0 · Modular Enterprise Engine</p>
      </div>

    </div>
  );
}
