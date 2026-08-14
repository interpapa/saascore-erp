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
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10h16v10H4z" />
          <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M12 14h.01" />
          <path d="M9 6V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" className="receipt-paper" />
        </svg>
      )
    },
    { 
      id: 'clientes', 
      name: 'Clientes CRM', 
      href: '/clientes',
      gradient: 'from-blue-500 to-indigo-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <circle cx="18" cy="9" r="3" className="crm-avatar-back" />
          <path d="M17 19v-1a2 2 0 0 0-2-2h-1" className="crm-avatar-back-body" />
        </svg>
      )
    },
    { 
      id: 'catalogo', 
      name: 'Catálogo', 
      href: '/catalogo',
      gradient: 'from-violet-500 to-purple-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <g className="box-lid">
            <path d="M3.27 6.96 12 12.01l8.73-5.05" />
            <path d="M12 2v10" className="opacity-40" />
          </g>
        </svg>
      )
    },
    { 
      id: 'estadisticas', 
      name: 'Estadísticas', 
      href: '/estadisticas',
      gradient: 'from-sky-400 to-blue-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="4" className="stats-bar-3" />
          <line x1="12" y1="20" x2="12" y2="10" className="stats-bar-2" />
          <line x1="6" y1="20" x2="6" y2="14" className="stats-bar-1" />
          <line x1="3" y1="20" x2="21" y2="20" />
        </svg>
      )
    },
    { 
      id: 'compras', 
      name: 'Compras AP', 
      href: '/compras',
      gradient: 'from-amber-400 to-orange-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white relative overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <g className="purchase-bag">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </g>
          <rect x="10" y="-3" width="4" height="4" rx="1" className="purchase-box stroke-none fill-white" />
        </svg>
      )
    },
    { 
      id: 'contabilidad', 
      name: 'Contabilidad', 
      href: '/contabilidad',
      gradient: 'from-teal-400 to-emerald-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="9" y1="21" x2="15" y2="21" />
          <g className="ledger-scale">
            <line x1="6" y1="7" x2="18" y2="7" />
            <path d="M6 7l-3 9h6Z" />
            <path d="M18 7l-3 9h6Z" />
          </g>
        </svg>
      )
    },
    { 
      id: 'calendario', 
      name: 'Citas y Turnos', 
      href: '/calendario',
      gradient: 'from-cyan-400 to-blue-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
          <line x1="12" y1="12" x2="12" y2="6" className="clock-hand" />
        </svg>
      )
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Inbox', 
      href: '/whatsapp',
      gradient: 'from-green-400 to-emerald-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="8" cy="10" r="1" className="fill-white stroke-none chat-dot-1" />
          <circle cx="12" cy="10" r="1" className="fill-white stroke-none chat-dot-2" />
          <circle cx="16" cy="10" r="1" className="fill-white stroke-none chat-dot-3" />
        </svg>
      )
    },
    { 
      id: 'kanban', 
      name: 'Órdenes Trabajo', 
      href: '/kanban',
      gradient: 'from-orange-400 to-red-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21" className="opacity-50" />
          <rect x="14" y="6" width="6" height="4" rx="1" />
          <rect x="4" y="6" width="6" height="4" rx="1" className="kanban-card-flow" />
          <rect x="4" y="14" width="6" height="4" rx="1" />
        </svg>
      )
    },
    { 
      id: 'equipo', 
      name: 'Personal HRMS', 
      href: '/equipo',
      gradient: 'from-indigo-400 to-purple-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <rect x="15" y="4" width="7" height="9" rx="1" className="hr-badge-slide" />
        </svg>
      )
    },
    { 
      id: 'franquicias', 
      name: 'Franquicias', 
      href: '/franquicias',
      gradient: 'from-pink-500 to-rose-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M3 21V9l9-4 9 4v12" />
          <rect x="10" y="13" width="4" height="8" className="store-door" />
        </svg>
      )
    },
    { 
      id: 'integraciones', 
      name: 'Conexiones API', 
      href: '/integraciones',
      gradient: 'from-fuchsia-400 to-pink-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="9" width="4" height="6" rx="1" />
          <path d="M17 12H6" className="api-plug-left" />
          <path d="M22 12h-4" className="api-plug-right-line" />
          <rect x="18" y="9" width="4" height="6" rx="1" className="api-plug-right" />
        </svg>
      )
    },
    { 
      id: 'apps', 
      name: 'Marketplace', 
      href: '/apps',
      gradient: 'from-yellow-400 to-amber-500',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" className="marketplace-app-pop" />
        </svg>
      )
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      href: '/configuracion',
      gradient: 'from-slate-400 to-slate-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white gear-wheel" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    },
    { 
      id: 'admin', 
      name: 'SaaSCore Hub', 
      href: '/admin',
      gradient: 'from-rose-400 to-pink-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 11 11 13 15 9" className="hub-check" />
        </svg>
      )
    }
  ];

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Estilos CSS locales de Keyframes para Física de Resorte y Amortiguación */}
      <style jsx global>{`
        /* 1. Caja POS: Papel deslizante */
        @keyframes slideReceipt {
          0% { transform: translateY(0); }
          100% { transform: translateY(-3px); }
        }
        .group:hover .receipt-paper {
          animation: slideReceipt 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 2. Clientes CRM: Avatares secundarios */
        @keyframes crmAvatarReveal {
          0% { transform: translate(0, 0); opacity: 0.4; }
          100% { transform: translate(2px, -2px); opacity: 0.8; }
        }
        .group:hover .crm-avatar-back,
        .group:hover .crm-avatar-back-body {
          animation: crmAvatarReveal 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 3. Catálogo: Tapa de la caja */
        @keyframes openBoxLid {
          0% { transform: translateY(0); }
          100% { transform: translateY(-2.5px); }
        }
        .group:hover .box-lid {
          animation: openBoxLid 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 4. Estadísticas: Barras creciendo con rebote elástico */
        @keyframes growStatsBar {
          0% { transform: scaleY(0.3); }
          70% { transform: scaleY(1.08); }
          100% { transform: scaleY(1); }
        }
        .stats-bar-1, .stats-bar-2, .stats-bar-3 {
          transform-origin: bottom;
          transform: scaleY(0.35);
          transition: transform 0.4s ease;
        }
        .group:hover .stats-bar-1 { animation: growStatsBar 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; }
        .group:hover .stats-bar-2 { animation: growStatsBar 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.05s forwards; }
        .group:hover .stats-bar-3 { animation: growStatsBar 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.1s forwards; }

        /* 5. Compras: Caída de caja e impacto en la bolsa */
        @keyframes dropBoxInBag {
          0% { transform: translateY(-16px); opacity: 0; }
          30% { opacity: 1; }
          70% { transform: translateY(9px); }
          85% { transform: translateY(6px); }
          100% { transform: translateY(8px); opacity: 1; }
        }
        @keyframes squeezeBag {
          0% { transform: scale(1); }
          65% { transform: scaleY(0.9) scaleX(1.04); }
          85% { transform: scaleY(1.02) scaleX(0.98); }
          100% { transform: scale(1); }
        }
        .purchase-box { opacity: 0; }
        .group:hover .purchase-box { animation: dropBoxInBag 0.65s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .group:hover .purchase-bag { animation: squeezeBag 0.65s ease-in-out forwards; }

        /* 6. Contabilidad: Balanza oscilando */
        @keyframes tiltScale {
          0% { transform: rotate(0deg); }
          35% { transform: rotate(7deg); }
          70% { transform: rotate(-3deg); }
          100% { transform: rotate(0deg); }
        }
        .group:hover .ledger-scale {
          animation: tiltScale 0.8s ease-in-out forwards;
        }

        /* 7. Calendario: Minutero giratorio */
        @keyframes spinClock {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .clock-hand {
          transform-origin: 12px 12px;
        }
        .group:hover .clock-hand {
          animation: spinClock 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 8. WhatsApp: Puntos rebotando en onda */
        @keyframes chatDotBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .group:hover .chat-dot-1 { animation: chatDotBounce 0.5s ease-in-out infinite; }
        .group:hover .chat-dot-2 { animation: chatDotBounce 0.5s ease-in-out 0.1s infinite; }
        .group:hover .chat-dot-3 { animation: chatDotBounce 0.5s ease-in-out 0.2s infinite; }

        /* 9. Kanban: Tarjeta fluyendo */
        @keyframes flowKanbanCard {
          0% { transform: translateX(0); }
          100% { transform: translateX(10px); }
        }
        .group:hover .kanban-card-flow {
          animation: flowKanbanCard 0.45s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 10. Personal: Carnet emergiendo */
        @keyframes revealHrBadge {
          0% { transform: translate(0, 0) rotate(0deg); }
          100% { transform: translate(2px, -3px) rotate(4deg); }
        }
        .hr-badge-slide {
          transform-origin: bottom left;
        }
        .group:hover .hr-badge-slide {
          animation: revealHrBadge 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 11. Franquicias: Puerta corredera */
        @keyframes slideStoreDoor {
          0% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
        .store-door {
          transform-origin: left;
        }
        .group:hover .store-door {
          animation: slideStoreDoor 0.35s ease-in-out forwards;
        }

        /* 12. Integraciones: Acople de cables */
        @keyframes apiPlugInLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(1.5px); }
        }
        @keyframes apiPlugInRight {
          0% { transform: translateX(0); }
          100% { transform: translateX(-1.5px); }
        }
        .group:hover .api-plug-left { animation: apiPlugInLeft 0.3s ease-out forwards; }
        .group:hover .api-plug-right,
        .group:hover .api-plug-right-line { animation: apiPlugInRight 0.3s ease-out forwards; }

        /* 13. Marketplace: Bloque separándose */
        @keyframes popMarketplaceBlock {
          0% { transform: translate(0, 0); }
          100% { transform: translate(1.5px, -1.5px); }
        }
        .group:hover .marketplace-app-pop {
          animation: popMarketplaceBlock 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        /* 14. Ajustes: Giro de engranaje lento */
        @keyframes rotateGear {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(180deg); }
        }
        .group:hover .gear-wheel {
          animation: rotateGear 0.75s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* 15. SaaSCore Hub: Check escalando */
        @keyframes scaleCheck {
          0% { transform: scale(0.7); }
          75% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .hub-check {
          transform-origin: center;
          transform: scale(0.7);
        }
        .group:hover .hub-check {
          animation: scaleCheck 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
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
          Grilla limpia de retorno al diseño anterior, tipo Launchpad / iPhone.
          Módulos sin bordes ni metadatos, solo el Squircle (icono redondeado) 
          de alta calidad con degradado y el nombre centrado abajo.
        */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-10 gap-x-6 justify-items-center">
          {apps.map((app) => (
            <a
              href={app.href}
              key={app.id}
              className="flex flex-col items-center group btn-haptic w-24"
            >
              {/* Contenedor Squircle Premium (estilo iOS / Launchpad) */}
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
                {app.iconSvg}
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
