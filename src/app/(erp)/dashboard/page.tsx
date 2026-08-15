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
          {/* Caja registradora: base con cajón de dinero, botonera y pantalla */}
          <rect x="2" y="14" width="20" height="6" rx="1.5" className="fill-emerald-500/10" />
          <path d="M12 14v6M7 17h10" />
          <path d="M6 14l2-6h8l2 6" />
          <rect x="9" y="4" width="6" height="4" rx="1" className="fill-emerald-400/20" />
          {/* Ticket de papel saliendo de la registradora */}
          <path d="M11 4h2v2h-2z" className="register-ticket fill-white" />
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
          {/* Tarjeta de cliente secundaria de fondo */}
          <rect x="2" y="7" width="14" height="14" rx="2" className="crm-card-back fill-blue-500/15" />
          <line x1="5" y1="12" x2="11" y2="12" className="crm-card-back" />
          <line x1="5" y1="16" x2="9" y2="16" className="crm-card-back" />
          {/* Tarjeta de cliente principal al frente */}
          <rect x="8" y="3" width="14" height="14" rx="2" className="crm-card-front fill-indigo-400/25" />
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
        <svg className="w-10 h-10 text-white custom-catalog-box" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Caja de inventario isométrica con solapa izquierda y derecha */}
          <path d="M12 22V12m-10 5l10 5 10-5" />
          <path d="M2 12l10 5 10-5" className="opacity-45" />
          {/* Solapa izquierda de la caja */}
          <path d="M2 12L12 7l4 2-6 5z" className="catalog-flap-left fill-violet-500/20" />
          {/* Solapa derecha de la caja */}
          <path d="M22 12l-10-5-4 2 6 5z" className="catalog-flap-right fill-violet-500/20" />
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
          {/* Barras de datos estáticas y flecha de tendencia al frente */}
          <rect x="3" y="12" width="4" height="8" rx="0.5" className="stats-bar-1 fill-sky-500/20" />
          <rect x="10" y="8" width="4" height="12" rx="0.5" className="stats-bar-2 fill-sky-500/20" />
          <rect x="17" y="4" width="4" height="16" rx="0.5" className="stats-bar-3 fill-sky-500/20" />
          <path d="M2 18l6-6 4 4 10-10" className="stats-arrow" strokeWidth="3" />
          <polygon points="18 6 22 6 22 10" className="stats-arrow fill-white" />
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
          {/* Tabla portapapeles y camión pequeño de entrega */}
          <rect x="4" y="2" width="12" height="16" rx="1.5" className="purchase-clip fill-amber-500/15" />
          <path d="M8 2h4v2H8z" className="purchase-clip" />
          <line x1="7" y1="7" x2="13" y2="7" className="purchase-clip" />
          <line x1="7" y1="11" x2="11" y2="11" className="purchase-clip" />
          {/* Camioncito de compras de fondo */}
          <g className="purchase-truck">
            <rect x="10" y="12" width="10" height="6" rx="1" className="fill-orange-400/25" />
            <circle cx="12" cy="19" r="1.5" />
            <circle cx="18" cy="19" r="1.5" />
            <path d="M20 14h2v3h-2z" />
          </g>
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
          {/* Balanza de mayor contable robusta */}
          <line x1="12" y1="3" x2="12" y2="21" strokeWidth="3" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <g className="accounting-crossbar">
            {/* Travesaño de la balanza */}
            <line x1="4" y1="7" x2="20" y2="7" strokeWidth="3" />
            {/* Cesta izquierda */}
            <path d="M4 7l-2 7h4Z" className="scale-left-cup fill-teal-500/20" />
            {/* Cesta derecha */}
            <path d="M20 7l-2 7h4Z" className="scale-right-cup fill-teal-500/20" />
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
        <svg className="w-10 h-10 text-white custom-calendar" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Calendario con reloj en la esquina inferior */}
          <rect x="3" y="4" width="18" height="16" rx="2" className="calendar-sheet fill-cyan-500/15" />
          <path d="M3 9h18" className="calendar-sheet" />
          <line x1="16" y1="2" x2="16" y2="5" className="calendar-sheet" />
          <line x1="8" y1="2" x2="8" y2="5" className="calendar-sheet" />
          {/* Reloj indicador */}
          <circle cx="17" cy="15" r="4" className="fill-white/10" />
          <polyline points="17 13 17 15 18.5 15" className="calendar-clock-hand" />
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
          {/* Dos globos de chat superpuestos */}
          <path d="M21 11.5a7 7 0 0 0-13.3-3L4 7l1.7 4a7 7 0 0 0 0 5L4 20l4.3-1.5a7 7 0 0 0 12.7-7z" className="chat-bubble-main fill-green-500/10" />
          {/* Globo secundario de diálogo */}
          <path d="M18 16a5 5 0 0 1-9.5-2.2L6 15l1.2-2.8A5 5 0 0 1 18 16z" className="chat-bubble-sub stroke-emerald-300 fill-emerald-500/20" />
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
          {/* Tablero Kanban con tres columnas y tarjetas */}
          <line x1="8" y1="3" x2="8" y2="21" className="opacity-40" />
          <line x1="16" y1="3" x2="16" y2="21" className="opacity-40" />
          {/* Tarjeta estática */}
          <rect x="2" y="5" width="4" height="6" rx="1" className="fill-orange-500/15" />
          <rect x="10" y="8" width="4" height="8" rx="1" className="fill-red-500/15" />
          {/* Tarjeta que fluye a la segunda columna en hover */}
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
        <svg className="w-10 h-10 text-white custom-hr-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {/* Carnet de identificación colgante */}
          <line x1="12" y1="1" x2="12" y2="4" />
          <g className="hr-badge-body">
            <rect x="4" y="4" width="16" height="17" rx="2" className="fill-indigo-500/10" />
            <circle cx="12" cy="9" r="2.5" className="fill-white/10" />
            <line x1="7" y1="14" x2="17" y2="14" />
            <line x1="9" y1="17" x2="15" y2="17" />
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
          {/* Fachada corporativa / toldo y puerta corredera */}
          <path d="M2 21h20" />
          <path d="M4 21V9l8-4 8 4v12" className="fill-pink-500/15" />
          {/* Toldo de la fachada */}
          <path d="M3 9h18l-1-2H4z" className="store-awning fill-white/10" />
          {/* Puerta corredera */}
          <rect x="10" y="14" width="4" height="7" className="store-door fill-white" />
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
          {/* Dos engranajes mecánicos acoplados */}
          <circle cx="16" cy="8" r="4" className="gear-small fill-fuchsia-500/15" />
          <circle cx="8" cy="16" r="6" className="gear-big fill-fuchsia-500/15" />
          <path d="M8 12v8M4 16h8" />
          <path d="M16 5v6M13 8h6" />
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
          {/* Bloques de módulos integrables */}
          <rect x="3" y="3" width="8" height="8" rx="1.5" className="fill-yellow-500/15" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" className="fill-yellow-500/15" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" className="fill-yellow-500/15" />
          {/* Bloque superior derecho que se acopla en hover */}
          <rect x="13" y="3" width="8" height="8" rx="1.5" className="marketplace-app-module fill-white" />
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
          {/* Deslizadores de consola de ajustes */}
          <line x1="4" y1="21" x2="4" y2="3" className="opacity-45" />
          <line x1="12" y1="21" x2="12" y2="3" className="opacity-45" />
          <line x1="20" y1="21" x2="20" y2="3" className="opacity-45" />
          {/* Knobs */}
          <circle cx="4" cy="14" r="2.2" className="slider-knob-1 fill-white" />
          <circle cx="12" cy="7" r="2.2" className="slider-knob-2 fill-white" />
          <circle cx="20" cy="16" r="2.2" className="slider-knob-3 fill-white" />
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
          {/* Escudo con candado interior */}
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-rose-500/15" />
          <rect x="9" y="12" width="6" height="5" rx="1" className="fill-white/10" />
          {/* Arco del candado */}
          <path d="M10 12v-2a2 2 0 0 1 4 0v2" className="shield-lock-shackle" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Estilos CSS locales de Keyframes para los 15 Iconos Custom y Sombras 3D */}
      <style jsx global>{`
        /* Efecto de sombra e inclinación 3D para vectores dentro del Squircle */
        .custom-pos-register, .custom-crm-profiles, .custom-catalog-box, .custom-stats-chart,
        .custom-purchases-form, .custom-accounting-scale, .custom-calendar, .custom-chat-bubbles,
        .custom-kanban-board, .custom-hr-badge, .custom-store-front, .custom-gears,
        .custom-marketplace-puzzle, .custom-dashboard-sliders, .custom-shield-core {
          filter: drop-shadow(0px 3.5px 3.5px rgba(0, 0, 0, 0.4));
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* 1. Caja POS: Emerge ticket de la registradora */
        .register-ticket {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .register-ticket {
          transform: translateY(-4px);
        }
        .group:hover .custom-pos-register {
          transform: translateY(-2px);
        }

        /* 2. Clientes CRM: Desplazamiento de tarjetas */
        .crm-card-back, .crm-card-front {
          transition: transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease;
        }
        .group:hover .crm-card-back {
          transform: translate(-3px, 3px) rotate(-3deg);
          opacity: 0.8;
        }
        .group:hover .crm-card-front {
          transform: translate(1px, -1px);
        }

        /* 3. Catálogo: Apertura de solapas isométrica */
        .catalog-flap-left, .catalog-flap-right {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
        }
        .group:hover .catalog-flap-left {
          transform: translate(-2.5px, -1.5px);
        }
        .group:hover .catalog-flap-right {
          transform: translate(2.5px, -1.5px);
        }
        .group:hover .custom-catalog-box {
          transform: translateY(-3px);
        }

        /* 4. Estadísticas: Barras escalan y flecha asciende */
        .stats-bar-1, .stats-bar-2, .stats-bar-3, .stats-arrow {
          transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .stats-bar-1 { transform: scaleY(1.15); transform-origin: bottom; }
        .group:hover .stats-bar-2 { transform: scaleY(1.28); transform-origin: bottom; }
        .group:hover .stats-bar-3 { transform: scaleY(1.4); transform-origin: bottom; }
        .group:hover .stats-arrow { transform: translate(2px, -2px); }

        /* 5. Compras: Camioncito de carga avanza en hover */
        .purchase-truck, .purchase-clip {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .purchase-truck {
          transform: translateX(4.5px);
        }
        .group:hover .purchase-clip {
          transform: translateY(-1.5px);
        }

        /* 6. Contabilidad: Balanza se inclina y cestas compensan */
        .accounting-crossbar {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: 12px 7px;
        }
        .scale-left-cup, .scale-right-cup {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .group:hover .accounting-crossbar {
          transform: rotate(8deg);
        }
        .group:hover .scale-left-cup {
          transform: translateY(2px);
        }
        .group:hover .scale-right-cup {
          transform: translateY(-2px);
        }

        /* 7. Calendario: Reloj de aguja gira 360 grados */
        .calendar-clock-hand, .calendar-sheet {
          transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .calendar-clock-hand {
          transform: rotate(360deg);
          transform-origin: 17px 15px;
        }
        .group:hover .calendar-sheet {
          transform: translateY(-2px);
        }

        /* 8. WhatsApp: Globo secundario late (notificación activa) */
        .chat-bubble-sub {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.3);
        }
        .group:hover .chat-bubble-sub {
          transform: scale(1.15) translate(1px, -1px);
          transform-origin: 13px 11px;
        }

        /* 9. Kanban: Tarjeta activa se desplaza de columna */
        .kanban-card-active {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .kanban-card-active {
          transform: translateX(8.5px);
        }

        /* 10. Personal HRMS: Balanceo físico del fotocheck */
        .hr-badge-body {
          transition: transform 0.5s ease-in-out;
          transform-origin: 12px 1px;
        }
        .group:hover .hr-badge-body {
          transform: rotate(8deg);
        }

        /* 11. Franquicias: Puerta corredera abre y toldo estira */
        .store-door, .store-awning {
          transition: transform 0.4s ease-in-out;
        }
        .group:hover .store-door {
          transform: scaleX(0);
          transform-origin: right;
        }
        .group:hover .store-awning {
          transform: scaleY(1.05);
          transform-origin: top;
        }

        /* 12. Conexiones API: Engranajes giran en sentidos contrarios */
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

        /* 13. Marketplace: Bloque se acopla en el puzzle */
        .marketplace-app-module {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.25);
        }
        .group:hover .marketplace-app-module {
          transform: translate(-2.5px, 2.5px);
        }

        /* 14. Ajustes: Deslizamiento alternado de potenciómetros */
        .slider-knob-1, .slider-knob-2, .slider-knob-3 {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .slider-knob-1 { transform: translateY(-4px); }
        .group:hover .slider-knob-2 { transform: translateY(5px); }
        .group:hover .slider-knob-3 { transform: translateY(-6px); }

        /* 15. SaaSCore Hub: Cierre de candado interior */
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
