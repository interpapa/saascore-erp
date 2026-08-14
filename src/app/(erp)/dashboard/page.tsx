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
        <svg className="w-8 h-8 text-white relative overflow-hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Caja registradora base */}
          <path d="M4 10h16v10H4z" />
          <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
          <path d="M12 14h.01" />
          {/* Ticket que está oculto abajo (translate-y-4, opacity-0) y sube en hover con transición suave de salida */}
          <path 
            d="M9 6V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" 
            className="transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100" 
          />
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
          {/* Usuario principal */}
          <circle cx="10" cy="8" r="4" />
          <path d="M2 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
          {/* Segundo usuario que por defecto está oculto (scale-75, opacity-0) y se desliza con rebote en hover */}
          <circle 
            cx="18" cy="9" r="3" 
            className="transition-all duration-350 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform scale-75 opacity-0 translate-x-2 group-hover:scale-100 group-hover:opacity-60 group-hover:translate-x-0" 
          />
          <path 
            d="M17 19v-1a2 2 0 0 0-2-2h-1" 
            className="transition-all duration-350 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform scale-75 opacity-0 translate-x-2 group-hover:scale-100 group-hover:opacity-60 group-hover:translate-x-0" 
          />
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
          {/* Caja cerrada por defecto */}
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          {/* Las tapas de la caja se abren hacia arriba en hover y vuelven suavemente en leave */}
          <g className="transition-transform duration-350 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform origin-bottom group-hover:-translate-y-2">
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
          {/* Barras que por defecto son de tamaño corto y escalan hacia arriba de forma secuencial al hacer hover */}
          <line 
            x1="18" y1="20" x2="18" y2="4" 
            className="transition-transform duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.2)] transform origin-bottom scale-y-[0.35] group-hover:scale-y-[0.9] delay-[100ms]" 
          />
          <line 
            x1="12" y1="20" x2="12" y2="10" 
            className="transition-transform duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.2)] transform origin-bottom scale-y-[0.45] group-hover:scale-y-[1] delay-[50ms]" 
          />
          <line 
            x1="6" y1="20" x2="6" y2="14" 
            className="transition-transform duration-400 ease-[cubic-bezier(0.175,0.885,0.32,1.2)] transform origin-bottom scale-y-[0.55] group-hover:scale-y-[0.8]" 
          />
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
          {/* Bolsa de compras */}
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" className="transition-transform duration-400 ease-in-out origin-bottom group-hover:scale-y-95" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
          {/* Caja cayendo. Inicia oculta arriba (opacity-0, -translate-y-3) y aterriza en hover */}
          <rect 
            x="10" y="-4" width="4" height="4" rx="1" 
            className="fill-white stroke-none transition-all duration-400 ease-[cubic-bezier(0.25,1,0.5,1)] transform opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-9" 
          />
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
          {/* Soporte vertical estático */}
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="9" y1="21" x2="15" y2="21" />
          {/* Balanza que por defecto está recta, se inclina 8 grados en hover, y vuelve al centro en leave */}
          <g className="transition-transform duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] transform origin-[12px_7px] group-hover:rotate-6">
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
          {/* El minutero gira una vuelta completa de 360 grados en hover y regresa al sentido original en leave */}
          <line 
            x1="12" y1="12" x2="12" y2="6" 
            className="transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform origin-bottom group-hover:rotate-[360deg]" 
          />
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
          {/* Tres puntitos que rebotan en secuencia en hover */}
          <circle cx="8" cy="10" r="1" className="fill-white stroke-none transition-transform duration-250 ease-out transform group-hover:-translate-y-1.5" />
          <circle cx="12" cy="10" r="1" className="fill-white stroke-none transition-transform duration-350 ease-out transform group-hover:-translate-y-1.5" />
          <circle cx="16" cy="10" r="1" className="fill-white stroke-none transition-transform duration-450 ease-out transform group-hover:-translate-y-1.5" />
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
          <line x1="12" y1="3" x2="12" y2="21" className="opacity-40" />
          <rect x="14" y="6" width="6" height="4" rx="1" />
          <rect x="4" y="14" width="6" height="4" rx="1" />
          {/* La tarjeta de tarea viaja horizontalmente a la otra columna en hover */}
          <rect 
            x="4" y="6" width="6" height="4" rx="1" 
            className="transition-transform duration-450 ease-[cubic-bezier(0.25,1,0.5,1)] transform group-hover:translate-x-10" 
          />
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
          {/* El badge de identificación sube y gira ligeramente por detrás en hover */}
          <rect 
            x="15" y="4" width="7" height="9" rx="1" 
            className="transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] transform origin-bottom-left opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:rotate-[6deg]" 
          />
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
          {/* La puerta del local se abre de lado simulando escala de ancho a 0 en hover */}
          <rect 
            x="10" y="13" width="4" height="8" 
            className="transition-transform duration-350 ease-in-out transform origin-left group-hover:scale-x-0" 
          />
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
          {/* Puerto izquierdo estático */}
          <rect x="2" y="9" width="4" height="6" rx="1" />
          <path d="M17 12H6" className="transition-transform duration-350 ease-out transform group-hover:translate-x-1" />
          {/* Conector derecho que se enchufa al centro en hover */}
          <path d="M22 12h-4" className="transition-transform duration-350 ease-out transform group-hover:-translate-x-1" />
          <rect 
            x="18" y="9" width="4" height="6" rx="1" 
            className="transition-transform duration-350 ease-out transform group-hover:-translate-x-1" 
          />
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
          {/* Bloque superior derecho se independiza y flota en hover */}
          <rect 
            x="14" y="3" width="7" height="7" 
            className="transition-transform duration-350 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform group-hover:-translate-y-1 group-hover:translate-x-1" 
          />
        </svg>
      )
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      href: '/configuracion',
      gradient: 'from-slate-400 to-slate-600',
      iconSvg: (
        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          {/* Engranaje que rota 180 grados con amortiguación completa en hover y deshace al salir */}
          <path 
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" 
            className="transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] transform origin-center group-hover:rotate-180" 
          />
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
          {/* El check está oculto por defecto (scale-0) y brota elásticamente en hover, encogiéndose en leave */}
          <polyline 
            points="9 11 11 13 15 9" 
            className="transition-transform duration-350 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] transform origin-center scale-0 group-hover:scale-100" 
          />
        </svg>
      )
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
