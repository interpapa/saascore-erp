'use client';

import React from 'react';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';
import { Sparkles } from 'lucide-react';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();

  const apps = [
    { 
      id: 'caja', 
      name: 'Caja POS', 
      href: '/caja',
      gradient: 'from-emerald-400 to-emerald-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-pos-register" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Caja registradora limpia, geométrica e intuitiva */}
          <rect x="3" y="13" width="18" height="7" rx="1" className="fill-emerald-500/10" />
          <path d="M8 13V8h8v5" />
          <path d="M6 16h12" />
          {/* Ticket de venta que emerge en hover */}
          <path d="M11 4h2v4h-2z" className="register-ticket fill-white" strokeWidth="0" />
        </svg>
      )
    },
    { 
      id: 'clientes', 
      name: 'Clientes CRM', 
      href: '/clientes',
      gradient: 'from-blue-500 to-indigo-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-crm-profiles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Fichas de perfiles simétricas */}
          <rect x="2" y="6" width="13" height="13" rx="2" className="crm-card-back fill-blue-500/15" />
          <circle cx="8" cy="11" r="2" className="crm-card-back" />
          
          <rect x="9" y="3" width="13" height="13" rx="2" className="crm-card-front fill-indigo-400/25" />
          <circle cx="15" cy="8" r="2" className="crm-card-front" />
          <path d="M11 13a4 4 0 0 1 8 0" className="crm-card-front" />
        </svg>
      )
    },
    { 
      id: 'catalogo', 
      name: 'Catálogo', 
      href: '/catalogo',
      gradient: 'from-violet-500 to-purple-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-catalog-box" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Caja isométrica perfectamente alineada */}
          <polygon points="12,3 21,7.5 12,12 3,7.5" className="catalog-top fill-violet-500/20" />
          <polygon points="3,7.5 12,12 12,21 3,16.5" />
          <polygon points="21,7.5 12,12 12,21 21,16.5" />
          <line x1="12" y1="12" x2="12" y2="21" strokeWidth="3" />
        </svg>
      )
    },
    { 
      id: 'estadisticas', 
      name: 'Estadísticas', 
      href: '/estadisticas',
      gradient: 'from-sky-400 to-blue-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-stats-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Tendencia y barras */}
          <rect x="4" y="14" width="3" height="6" rx="0.5" className="stats-bar-1 fill-sky-500/25" />
          <rect x="10" y="10" width="3" height="10" rx="0.5" className="stats-bar-2 fill-sky-500/25" />
          <rect x="16" y="6" width="3" height="14" rx="0.5" className="stats-bar-3 fill-sky-500/25" />
          <path d="M2 17l6-6 4 3 9-9" className="stats-arrow" />
          <circle cx="21" cy="5" r="1.5" className="stats-arrow fill-white" />
        </svg>
      )
    },
    { 
      id: 'compras', 
      name: 'Compras AP', 
      href: '/compras',
      gradient: 'from-amber-400 to-orange-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-purchases-form" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Carrito de compras clásico rodando */}
          <circle cx="8" cy="20" r="2" className="purchase-wheel-1" />
          <circle cx="17" cy="20" r="2" className="purchase-wheel-2" />
          <path d="M2 3h3l2.5 11h10l2-7H7.5" />
          <rect x="9" y="6" width="6" height="4" rx="0.5" className="fill-orange-400/20" />
        </svg>
      )
    },
    { 
      id: 'contabilidad', 
      name: 'Contabilidad', 
      href: '/contabilidad',
      gradient: 'from-teal-400 to-emerald-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-accounting-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Balanza con física real independiente de inclinación */}
          <line x1="12" y1="3" x2="12" y2="21" strokeWidth="3" />
          <line x1="7" y1="21" x2="17" y2="21" />
          {/* Barra central que rota en hover */}
          <line x1="4" y1="7" x2="20" y2="7" strokeWidth="3.2" className="scale-bar" />
          {/* Platillos que bajan/suben verticalmente sin inclinarse */}
          <path d="M4 7v6M2 13h4" className="scale-left-cup" />
          <path d="M20 7v6M18 13h4" className="scale-right-cup" />
        </svg>
      )
    },
    { 
      id: 'calendario', 
      name: 'Citas y Turnos', 
      href: '/calendario',
      gradient: 'from-cyan-400 to-blue-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Calendario con reloj rotatorio en la esquina inferior */}
          <rect x="3" y="4" width="18" height="15" rx="2" className="calendar-sheet fill-cyan-500/15" />
          <line x1="3" y1="9" x2="21" y2="9" className="calendar-sheet" />
          <line x1="8" y1="2" x2="8" y2="5" className="calendar-sheet" />
          <line x1="16" y1="2" x2="16" y2="5" className="calendar-sheet" />
          {/* Reloj con aguja pivotando exactamente sobre el eje 16,14 */}
          <circle cx="16" cy="14" r="4.5" className="fill-white/10" />
          <polyline points="16 11.5 16 14 17.5 14" className="calendar-clock-hand" />
        </svg>
      )
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Inbox', 
      href: '/whatsapp',
      gradient: 'from-green-400 to-emerald-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-chat-bubbles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Globos de diálogo limpios */}
          <path d="M12 3c-4.4 0-8 3-8 6.8 0 1.6.7 3.1 2 4.3L5 18l4.2-1.4c.8.3 1.7.4 2.6.4 4.4 0 8-3 8-6.8S16.4 3 12 3z" className="chat-bubble-main fill-green-500/10" />
          <path d="M16 12c.5 0 1-.1 1.5-.2L20 15l-1-2.6c.7-.7 1.1-1.7 1.1-2.7 0-2.5-2.5-4.5-5.6-4.5" className="chat-bubble-sub stroke-emerald-300 fill-emerald-500/15" />
        </svg>
      )
    },
    { 
      id: 'kanban', 
      name: 'Órdenes Trabajo', 
      href: '/kanban',
      gradient: 'from-orange-400 to-red-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-kanban-board" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Columnas y tarjeta fluyendo */}
          <line x1="8" y1="3" x2="8" y2="21" className="opacity-30" />
          <line x1="16" y1="3" x2="16" y2="21" className="opacity-30" />
          <rect x="3" y="5" width="3.5" height="5" rx="0.5" className="fill-orange-500/15" />
          <rect x="10.5" y="8" width="3.5" height="7" rx="0.5" className="fill-red-500/15" />
          <rect x="3" y="12" width="3.5" height="5" rx="0.5" className="kanban-card-active fill-white" strokeWidth="0" />
        </svg>
      )
    },
    { 
      id: 'equipo', 
      name: 'Personal HRMS', 
      href: '/equipo',
      gradient: 'from-indigo-400 to-purple-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-hr-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Fotocheck de empleado */}
          <rect x="10" y="2" width="4" height="3" rx="0.5" />
          <g className="hr-badge-body">
            <rect x="5" y="5" width="14" height="16" rx="1.5" className="fill-indigo-500/10" />
            <circle cx="12" cy="11" r="2.5" className="fill-white/10" />
            <path d="M8 17h8" />
          </g>
        </svg>
      )
    },
    { 
      id: 'franquicias', 
      name: 'Franquicias', 
      href: '/franquicias',
      gradient: 'from-pink-500 to-rose-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-store-front" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Fachada local con puerta corredera */}
          <polygon points="3,10 12,4 21,10" className="store-awning fill-pink-500/15" />
          <rect x="5" y="10" width="14" height="11" />
          <rect x="9" y="14" width="6" height="7" className="store-door fill-white" strokeWidth="0" />
        </svg>
      )
    },
    { 
      id: 'integraciones', 
      name: 'Conexiones API', 
      href: '/integraciones',
      gradient: 'from-fuchsia-400 to-pink-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-gears" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Dos engranajes de dientes geométricos acoplados */}
          <g className="gear-small">
            <circle cx="16" cy="8" r="3.5" className="fill-fuchsia-500/15" />
            <path d="M16 3v2M16 11v2M11 8h2M19 8h2" />
          </g>
          <g className="gear-big">
            <circle cx="8" cy="16" r="5" className="fill-fuchsia-500/15" />
            <path d="M8 9v2M8 21v2M2 16h2M14 16h2" />
          </g>
        </svg>
      )
    },
    { 
      id: 'apps', 
      name: 'Marketplace', 
      href: '/apps',
      gradient: 'from-yellow-400 to-amber-500',
      icon: (
        <svg className="w-10 h-10 text-white custom-marketplace-puzzle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Bloques de módulos */}
          <rect x="4" y="4" width="7" height="7" rx="1.5" className="fill-yellow-500/15" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" className="fill-yellow-500/15" />
          <rect x="13" y="13" width="7" height="7" rx="1.5" className="fill-yellow-500/15" />
          <rect x="13" y="4" width="7" height="7" rx="1.5" className="marketplace-app-module fill-white" strokeWidth="0" />
        </svg>
      )
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      href: '/configuracion',
      gradient: 'from-slate-400 to-slate-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-dashboard-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Deslizadores */}
          <line x1="6" y1="4" x2="6" y2="20" className="opacity-45" />
          <line x1="12" y1="4" x2="12" y2="20" className="opacity-45" />
          <line x1="18" y1="4" x2="18" y2="20" className="opacity-45" />
          <circle cx="6" cy="14" r="2.2" className="slider-knob-1 fill-white" strokeWidth="0" />
          <circle cx="12" cy="8" r="2.2" className="slider-knob-2 fill-white" strokeWidth="0" />
          <circle cx="18" cy="16" r="2.2" className="slider-knob-3 fill-white" strokeWidth="0" />
        </svg>
      )
    },
    { 
      id: 'admin', 
      name: 'SaaSCore Hub', 
      href: '/admin',
      gradient: 'from-rose-400 to-pink-600',
      icon: (
        <svg className="w-10 h-10 text-white custom-shield-core" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Escudo con candado en el núcleo */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-rose-500/15" />
          <rect x="9" y="12" width="6" height="5" rx="1.2" className="fill-white/10" />
          <path d="M10 12v-2.5a2 2 0 0 1 4 0v2.5" className="shield-lock-shackle" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Estilos CSS locales de Keyframes para los 15 Iconos Custom y Animaciones */}
      <style jsx global>{`
        /* 
          1. Caja POS: Emerge ticket de la registradora.
          Eliminamos los filtros drop-shadow que causan borrosidad en navegadores web.
        */
        .custom-pos-register, .custom-crm-profiles, .custom-catalog-box, .custom-stats-chart,
        .custom-purchases-form, .custom-accounting-scale, .custom-calendar, .custom-chat-bubbles,
        .custom-kanban-board, .custom-hr-badge, .custom-store-front, .custom-gears,
        .custom-marketplace-puzzle, .custom-dashboard-sliders, .custom-shield-core {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .register-ticket {
          transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .register-ticket {
          transform: translateY(-4px);
        }

        /* 2. Clientes CRM: Desplazamiento de tarjetas */
        .crm-card-back, .crm-card-front {
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
        }
        .group:hover .crm-card-back {
          transform: translate(-2px, 2px);
          opacity: 0.8;
        }
        .group:hover .crm-card-front {
          transform: translate(0.5px, -0.5px);
        }

        /* 3. Catálogo: Flotación de caja isométrica */
        .group:hover .custom-catalog-box {
          transform: translateY(-3.5px);
        }

        /* 4. Estadísticas: Barras escalan y flecha asciende */
        .stats-bar-1, .stats-bar-2, .stats-bar-3, .stats-arrow {
          transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .stats-bar-1 { transform: scaleY(1.15); transform-origin: bottom; }
        .group:hover .stats-bar-2 { transform: scaleY(1.3); transform-origin: bottom; }
        .group:hover .stats-bar-3 { transform: scaleY(1.45); transform-origin: bottom; }
        .group:hover .stats-arrow { transform: translate(1.5px, -1.5px); }

        /* 5. Compras: Carrito rueda y se traslada horizontalmente */
        .purchase-wheel-1, .purchase-wheel-2 {
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .custom-purchases-form {
          transform: translateX(3px) scale(1.02);
        }
        .group:hover .purchase-wheel-1 { transform: rotate(180deg); transform-origin: 8px 20px; }
        .group:hover .purchase-wheel-2 { transform: rotate(180deg); transform-origin: 17px 20px; }

        /* 6. Contabilidad: Balanza se inclina y cestas compensan físicamente (solo bajan/suben) */
        .scale-bar {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: 12px 7px;
        }
        .scale-left-cup, .scale-right-cup {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .scale-bar {
          transform: rotate(8deg);
        }
        .group:hover .scale-left-cup {
          transform: translateY(2px);
        }
        .group:hover .scale-right-cup {
          transform: translateY(-2px);
        }

        /* 7. Calendario: Reloj de aguja gira 360 grados */
        .calendar-clock-hand {
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .calendar-clock-hand {
          transform: rotate(360deg);
          transform-origin: 16px 14px;
        }
        .group:hover .custom-calendar {
          transform: translateY(-2px);
        }

        /* 8. WhatsApp: Globo secundario emerge */
        .chat-bubble-sub {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.3);
        }
        .group:hover .chat-bubble-sub {
          transform: scale(1.1) translate(1px, -1px);
          transform-origin: 15px 12px;
        }

        /* 9. Kanban: Tarjeta se desplaza horizontalmente de columna */
        .kanban-card-active {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .kanban-card-active {
          transform: translateX(7.5px);
        }

        /* 10. Personal HRMS: Balanceo del fotocheck */
        .hr-badge-body {
          transition: transform 0.5s ease-in-out;
          transform-origin: 12px 2px;
        }
        .group:hover .hr-badge-body {
          transform: rotate(8deg);
        }

        /* 11. Franquicias: Puerta corredera abre y local se eleva */
        .store-door {
          transition: transform 0.4s ease-in-out;
        }
        .group:hover .store-door {
          transform: scaleX(0);
          transform-origin: right;
        }
        .group:hover .custom-store-front {
          transform: translateY(-2px);
        }

        /* 12. Conexiones API: Engranajes giran acoplados */
        .gear-small {
          transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
          transform-origin: 16px 8px;
        }
        .gear-big {
          transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
          transform-origin: 8px 16px;
        }
        .group:hover .gear-small {
          transform: rotate(-180deg);
        }
        .group:hover .gear-big {
          transform: rotate(90deg);
        }

        /* 13. Marketplace: Bloque se acopla */
        .marketplace-app-module {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25);
        }
        .group:hover .marketplace-app-module {
          transform: translate(-2px, 2px);
        }

        /* 14. Ajustes: Deslizamiento alternado */
        .slider-knob-1, .slider-knob-2, .slider-knob-3 {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .slider-knob-1 { transform: translateY(-4px); }
        .group:hover .slider-knob-2 { transform: translateY(5px); }
        .group:hover .slider-knob-3 { transform: translateY(-6px); }

        /* 15. SaaSCore Hub: Cierre de candado */
        .shield-lock-shackle {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25);
        }
        .group:hover .shield-lock-shackle {
          transform: translateY(1.5px);
        }
      `}</style>

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
          Squircles de tamaño mayor (w-20 h-20, rounded-[24px]) con bordes finos,
          brillo interior 3D y sombras arrojadas realistas (iOS/macOS Big Sur style).
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
