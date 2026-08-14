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
        <svg className="w-9 h-9 text-white custom-pos-coin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Moneda única, limpia y minimalista para evitar saturación visual */}
          <circle cx="12" cy="12" r="10" className="fill-emerald-500/10" />
          <path d="M12 6v12" />
          <path d="M15 9H12a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4H9" />
        </svg>
      )
    },
    { 
      id: 'clientes', 
      name: 'Clientes CRM', 
      href: '/clientes',
      gradient: 'from-blue-500 to-indigo-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-crm-profiles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Tarjeta de cliente secundaria de fondo */}
          <rect x="2" y="7" width="14" height="14" rx="2" className="crm-card-back fill-blue-500/10" />
          <line x1="5" y1="12" x2="11" y2="12" className="crm-card-back" />
          <line x1="5" y1="16" x2="9" y2="16" className="crm-card-back" />
          {/* Tarjeta de cliente principal al frente */}
          <rect x="8" y="3" width="14" height="14" rx="2" className="crm-card-front fill-indigo-400/20" />
          <circle cx="15" cy="8" r="2" className="crm-card-front" />
          <line x1="11" y1="13" x2="19" y2="13" className="crm-card-front" />
        </svg>
      )
    },
    { 
      id: 'catalogo', 
      name: 'Catálogo', 
      href: '/catalogo',
      gradient: 'from-violet-500 to-purple-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-catalog-box" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Caja de inventario isométrica tridimensional */}
          <path d="M12 2L2 7l10 5 10-5-10-5z" className="catalog-box-top fill-violet-400/20" />
          <path d="M2 7v10l10 5V12L2 7z" />
          <path d="M22 7v10l-10 5V12l10-5z" />
          {/* Cinta de sellado decorativa */}
          <path d="M12 7v7" className="catalog-box-tape stroke-purple-300" strokeWidth="2.5" />
        </svg>
      )
    },
    { 
      id: 'estadisticas', 
      name: 'Estadísticas', 
      href: '/estadisticas',
      gradient: 'from-sky-400 to-blue-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-stats-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Gráfico de línea con gradiente de área */}
          <path d="M3 21h18" />
          <path d="M3 21V3" className="opacity-30" />
          <path d="M3 16l4-5 5 3 9-9" className="stats-chart-line" />
          {/* Punto de KPI brillante */}
          <circle cx="21" cy="5" r="2" className="stats-chart-dot fill-white" />
        </svg>
      )
    },
    { 
      id: 'compras', 
      name: 'Compras AP', 
      href: '/compras',
      gradient: 'from-amber-400 to-orange-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-purchases-form" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Tabla portapapeles de Orden de Compra */}
          <rect x="5" y="4" width="14" height="17" rx="2" className="purchase-board fill-amber-500/10" />
          <path d="M9 2h6v3H9z" />
          <line x1="8" y1="9" x2="16" y2="9" />
          <line x1="8" y1="13" x2="14" y2="13" />
          {/* Checkmark de orden validada */}
          <polyline points="8 17 10 19 15 14" className="purchase-check stroke-orange-400" />
        </svg>
      )
    },
    { 
      id: 'contabilidad', 
      name: 'Contabilidad', 
      href: '/contabilidad',
      gradient: 'from-teal-400 to-emerald-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-accounting-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Balanza de mayor contable robusta */}
          <line x1="12" y1="3" x2="12" y2="21" strokeWidth="2.5" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <g className="accounting-crossbar">
            <line x1="5" y1="7" x2="19" y2="7" strokeWidth="2.5" />
            <path d="M5 7l-2.5 8h5.5Z" className="fill-teal-500/10" />
            <path d="M19 7l-2.5 8h5.5Z" className="fill-teal-500/10" />
          </g>
        </svg>
      )
    },
    { 
      id: 'calendario', 
      name: 'Citas y Turnos', 
      href: '/calendario',
      gradient: 'from-cyan-400 to-blue-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Calendario con hoja que se levanta */}
          <rect x="3" y="4" width="18" height="17" rx="2" className="fill-cyan-500/10" />
          <path d="M3 9h18" />
          <line x1="16" y1="2" x2="16" y2="5" />
          <line x1="8" y1="2" x2="8" y2="5" />
          {/* Indicador de cita pendiente */}
          <rect x="13" y="13" width="4" height="4" rx="1" className="calendar-event-badge fill-white" />
        </svg>
      )
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Inbox', 
      href: '/whatsapp',
      gradient: 'from-green-400 to-emerald-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-chat-bubbles" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Dos globos de chat superpuestos */}
          <path d="M18 10a5 5 0 0 0-9.5-2.2L6 6l1.2 2.8A5 5 0 0 0 4 10c0 2.2 1.8 4 4.5 4.8L9 18l3.5-3.2A5 5 0 0 0 18 10z" className="chat-bubble-main fill-green-500/10" />
          <path d="M15 13a4 4 0 0 1-7.6-1.8L6 14.5l1-2.2A4 4 0 0 1 15 13z" className="chat-bubble-sub stroke-emerald-300 opacity-60" />
        </svg>
      )
    },
    { 
      id: 'kanban', 
      name: 'Órdenes Trabajo', 
      href: '/kanban',
      gradient: 'from-orange-400 to-red-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-kanban-board" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Columnas del tablero */}
          <line x1="8" y1="3" x2="8" y2="21" className="opacity-40" />
          <line x1="16" y1="3" x2="16" y2="21" className="opacity-40" />
          {/* Tarjetas del tablero */}
          <rect x="2" y="5" width="4" height="6" rx="1" className="kanban-card fill-orange-500/20" />
          <rect x="10" y="8" width="4" height="5" rx="1" className="kanban-card fill-red-500/20" />
          {/* Tarjeta móvil que se desplaza de columna en hover */}
          <rect x="2" y="13" width="4" height="5" rx="1" className="kanban-card-active fill-white" />
        </svg>
      )
    },
    { 
      id: 'equipo', 
      name: 'Personal HRMS', 
      href: '/equipo',
      gradient: 'from-indigo-400 to-purple-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-hr-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Carnet de identificación de empleado */}
          <rect x="4" y="3" width="16" height="18" rx="2" className="hr-badge-frame fill-indigo-500/10" />
          <line x1="8" y1="16" x2="16" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <circle cx="12" cy="7" r="2" />
        </svg>
      )
    },
    { 
      id: 'franquicias', 
      name: 'Franquicias', 
      href: '/franquicias',
      gradient: 'from-pink-500 to-rose-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-store-front" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Fachada corporativa/sucursal */}
          <path d="M3 21h18" />
          <path d="M3 21V9l9-4 9 4v12" className="fill-pink-500/10" />
          {/* Puerta corredera */}
          <rect x="10" y="14" width="4" height="7" className="store-sliding-door fill-white" />
        </svg>
      )
    },
    { 
      id: 'integraciones', 
      name: 'Conexiones API', 
      href: '/integraciones',
      gradient: 'from-fuchsia-400 to-pink-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-gears" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Dos engranajes que interactúan mecánicamente */}
          <circle cx="16" cy="8" r="4" className="gear-small" />
          <circle cx="8" cy="16" r="6" className="gear-big" />
          <path d="M8 13v6M5 16h6" />
          <path d="M16 6v4M14 8h4" />
        </svg>
      )
    },
    { 
      id: 'apps', 
      name: 'Marketplace', 
      href: '/apps',
      gradient: 'from-yellow-400 to-amber-500',
      icon: (
        <svg className="w-9 h-9 text-white custom-marketplace-puzzle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Bloques de software */}
          <rect x="3" y="3" width="8" height="8" rx="1" className="fill-yellow-500/10" />
          <rect x="3" y="13" width="8" height="8" rx="1" className="fill-yellow-500/10" />
          <rect x="13" y="13" width="8" height="8" rx="1" className="fill-yellow-500/10" />
          {/* Bloque de app adicional que se acopla en hover */}
          <rect x="13" y="3" width="8" height="8" rx="1" className="marketplace-app-module fill-white" />
        </svg>
      )
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      href: '/configuracion',
      gradient: 'from-slate-400 to-slate-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-dashboard-sliders" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Consola con deslizadores de configuración */}
          <line x1="4" y1="21" x2="4" y2="3" className="opacity-45" />
          <line x1="12" y1="21" x2="12" y2="3" className="opacity-45" />
          <line x1="20" y1="21" x2="20" y2="3" className="opacity-45" />
          {/* Controles deslizantes */}
          <circle cx="4" cy="14" r="2" className="slider-knob-1 fill-white" />
          <circle cx="12" cy="7" r="2" className="slider-knob-2 fill-white" />
          <circle cx="20" cy="16" r="2" className="slider-knob-3 fill-white" />
        </svg>
      )
    },
    { 
      id: 'admin', 
      name: 'SaaSCore Hub', 
      href: '/admin',
      gradient: 'from-rose-400 to-pink-600',
      icon: (
        <svg className="w-9 h-9 text-white custom-shield-core" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Escudo de seguridad central */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-rose-500/10" />
          {/* Núcleo o llave interna que pulsa */}
          <circle cx="12" cy="11" r="3" className="shield-core-node fill-white/10" />
          <path d="M12 14v4" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Estilos CSS locales de Keyframes para los 15 Iconos Custom */}
      <style jsx global>{`
        /* 1. Caja POS: Lanzamiento de moneda en 3D (Subida, Giro completo 360 y Caída con amortiguación) */
        @keyframes coinTossAndLand {
          0% {
            transform: translateY(0) rotateY(0deg) scale(1);
          }
          35% {
            transform: translateY(-18px) rotateY(180deg) scale(1.15);
          }
          70% {
            transform: translateY(0) rotateY(360deg) scale(1);
          }
          85% {
            transform: translateY(-2px) rotateY(360deg) scale(1.03);
          }
          100% {
            transform: translateY(0) rotateY(360deg) scale(1);
          }
        }
        .custom-pos-coin {
          transition: transform 0.4s ease-out;
          transform-style: preserve-3d;
          perspective: 800px;
        }
        .group:hover .custom-pos-coin {
          animation: coinTossAndLand 0.75s cubic-bezier(0.25, 1, 0.5, 1) forwards;
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
          transform: translate(1px, -1px);
        }

        /* 3. Catálogo: Apertura de tapa de caja isométrica */
        .catalog-box-top, .catalog-box-tape {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2), opacity 0.4s ease;
        }
        .group:hover .catalog-box-top {
          transform: translateY(-3px);
        }
        .group:hover .catalog-box-tape {
          transform: scaleY(0.7);
          transform-origin: top;
        }

        /* 4. Estadísticas: Línea de tendencia dibujándose */
        .stats-chart-line, .stats-chart-dot {
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275), stroke-dashoffset 0.5s ease;
        }
        .group:hover .stats-chart-line {
          transform: translate(1px, -1px);
        }
        .group:hover .stats-chart-dot {
          transform: translate(1px, -1px) scale(1.3);
        }

        /* 5. Compras: Documento y Check de aprobación */
        .purchase-check, .purchase-board {
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), stroke-dashoffset 0.4s ease;
        }
        .purchase-check {
          transform: scale(0.8);
          opacity: 0;
          transform-origin: center;
        }
        .group:hover .purchase-check {
          transform: scale(1.1);
          opacity: 1;
        }
        .group:hover .purchase-board {
          transform: translateY(-2px);
        }

        /* 6. Contabilidad: Oscilación física balanceada */
        .accounting-crossbar {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: 12px 7px;
        }
        .group:hover .accounting-crossbar {
          transform: rotate(7deg);
        }

        /* 7. Calendario: Evento del día saltando */
        .calendar-event-badge {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.3);
          transform-origin: center;
        }
        .group:hover .calendar-event-badge {
          transform: scale(1.25) translateY(-1px);
        }

        /* 8. WhatsApp: Globo secundario emergiendo */
        .chat-bubble-sub, .chat-bubble-main {
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
        }
        .group:hover .chat-bubble-sub {
          transform: translate(2px, -2px);
          opacity: 1;
        }
        .group:hover .chat-bubble-main {
          transform: scale(1.03);
        }

        /* 9. Kanban: Tarjeta fluyendo de carril */
        .kanban-card-active {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .kanban-card-active {
          transform: translateX(8px);
        }

        /* 10. Personal HRMS: Balanceo del fotocheck */
        .custom-hr-badge {
          transition: transform 0.5s ease-in-out;
          transform-origin: 12px 3px;
        }
        .group:hover .custom-hr-badge {
          transform: rotate(8deg);
        }

        /* 11. Franquicias: Apertura de puerta corredera */
        .store-sliding-door {
          transition: transform 0.35s ease-in-out;
          transform-origin: left;
        }
        .group:hover .store-sliding-door {
          transform: scaleX(0);
        }

        /* 12. Integraciones: Engranajes interactivos */
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

        /* 13. Marketplace: Acople de módulo */
        .marketplace-app-module {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25);
        }
        .group:hover .marketplace-app-module {
          transform: translate(-2px, 2px);
        }

        /* 14. Ajustes: Deslizamiento de potenciómetros */
        .slider-knob-1, .slider-knob-2, .slider-knob-3 {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .slider-knob-1 { transform: translateY(-4px); }
        .group:hover .slider-knob-2 { transform: translateY(5px); }
        .group:hover .slider-knob-3 { transform: translateY(-6px); }

        /* 15. SaaSCore Hub: Núcleo de seguridad pulsando */
        .shield-core-node {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.3), opacity 0.4s ease;
          transform-origin: 12px 11px;
        }
        .group:hover .shield-core-node {
          transform: scale(1.4);
          opacity: 0.8;
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
          Grilla limpia tipo Launchpad / iPhone.
          Módulos sin bordes ni metadatos, usando los iconos estándar de Lucide-React
          que están perfectamente balanceados de inicio a fin y se animan con suavidad.
        */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-10 gap-x-6 justify-items-center">
          {apps.map((app) => (
            <a
              href={app.href}
              key={app.id}
              className="flex flex-col items-center group btn-haptic w-24"
            >
              {/* Contenedor Squircle Premium */}
              <div 
                className={`
                  w-16 h-16 rounded-[22px] bg-gradient-to-br ${app.gradient}
                  flex items-center justify-center shadow-lg transition-all duration-350 ease-out
                  group-hover:scale-105 group-hover:-translate-y-1
                  group-hover:shadow-[0_8px_25px_rgba(0,0,0,0.35)]
                `}
                style={{
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                }}
              >
                {app.icon}
              </div>

              {/* Nombre de la Aplicación */}
              <span className="text-foreground font-semibold text-xs mt-3 text-center tracking-tight font-sans group-hover:text-primary transition-colors line-clamp-2 px-1">
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
