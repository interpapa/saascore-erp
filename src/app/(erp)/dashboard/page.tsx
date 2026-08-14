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
      tag: 'SYS.POS.v3',
      color: '#10B981', 
      href: '/caja',
      meta: ['Terminal: Active', 'Data Node: Secure', 'API: Connected'],
      iconSvg: (
        <svg className="w-6 h-6 transition-all duration-350 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="6" width="20" height="14" rx="2" />
          <path d="M12 2v4" />
          <circle cx="12" cy="13" r="3" className="transition-transform duration-500 origin-center group-hover:rotate-180" />
          <path d="M6 10h.01M18 10h.01" />
        </svg>
      )
    },
    { 
      id: 'clientes', 
      name: 'Clientes CRM', 
      tag: 'DB.CRM.01',
      color: '#3B82F6', 
      href: '/clientes',
      meta: ['CRM Node: Online', 'Query Mode: Direct', 'Index: Ready'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" className="transition-transform duration-500 group-hover:translate-x-1" />
          <circle cx="9" cy="7" r="4" className="transition-transform duration-500 group-hover:translate-x-1" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" className="transition-transform duration-500 group-hover:-translate-x-1" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" className="transition-transform duration-500 group-hover:-translate-x-1" />
        </svg>
      )
    },
    { 
      id: 'catalogo', 
      name: 'Catálogo', 
      tag: 'PLT.DATA.04',
      color: '#8B5CF6', 
      href: '/catalogo',
      meta: ['Items Node: Sync', 'Price Engine: Active', 'Stock Index: OK'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
          <path d="m17 13-5 3-5-3" className="transition-all duration-500 opacity-60 group-hover:-translate-y-1.5 group-hover:opacity-100" />
        </svg>
      )
    },
    { 
      id: 'estadisticas', 
      name: 'Estadísticas', 
      tag: 'APM.MON.11',
      color: '#0EA5E9', 
      href: '/estadisticas',
      meta: ['Metrics: Real-time', 'NIIF Aggregations: On', 'Alert Engine: Safe'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="m18.7 8-5.1 5.2-2.8-2.7L7 14.3" className="transition-all duration-500 origin-bottom-left group-hover:-translate-y-1.5 group-hover:translate-x-1" strokeWidth="2" />
        </svg>
      )
    },
    { 
      id: 'compras', 
      name: 'Compras AP', 
      tag: 'INF.STOR.06',
      color: '#F59E0B', 
      href: '/compras',
      meta: ['Matches: 3-Way Active', 'PO Engine: Secure', 'Suppliers: Ready'],
      iconSvg: (
        <svg className="w-6 h-6 relative overflow-visible" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
          <rect x="10" y="0" width="4" height="4" rx="1" className="fill-warning stroke-none opacity-0 transition-all duration-500 group-hover:translate-y-9 group-hover:opacity-100" />
        </svg>
      )
    },
    { 
      id: 'contabilidad', 
      name: 'Contabilidad', 
      tag: 'SCR.SEC.v2',
      color: '#10B981', 
      href: '/contabilidad',
      meta: ['NIIF Standard: ISO', 'Tax Engine: Habilitado', 'Journals: Posted'],
      iconSvg: (
        <svg className="w-6 h-6 transition-transform duration-500 origin-center group-hover:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="6" y1="7" x2="18" y2="7" />
          <path d="M6 7l-3 9h6Z" />
          <path d="M18 7l-3 9h6Z" />
        </svg>
      )
    },
    { 
      id: 'calendario', 
      name: 'Citas y Turnos', 
      tag: 'CLD.SRV.31',
      color: '#3B82F6', 
      href: '/calendario',
      meta: ['Schedules: Active', 'SMS Reminders: OK', 'Availability: Auto'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <circle cx="12" cy="15" r="2.5" className="fill-primary stroke-none transition-all duration-300 group-hover:scale-125" />
        </svg>
      )
    },
    { 
      id: 'whatsapp', 
      name: 'WhatsApp CRM', 
      tag: 'JOB.QUE.08',
      color: '#10B981', 
      href: '/whatsapp',
      meta: ['Línea: Connected', 'Webhooks: Habilitados', 'Bot Response: Live'],
      iconSvg: (
        <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="8" cy="10" r="1" className="fill-current stroke-none transition-transform duration-300 group-hover:-translate-y-1" />
          <circle cx="12" cy="10" r="1" className="fill-current stroke-none transition-transform duration-300 delay-75 group-hover:-translate-y-1" />
          <circle cx="16" cy="10" r="1" className="fill-current stroke-none transition-transform duration-300 delay-150 group-hover:-translate-y-1" />
        </svg>
      )
    },
    { 
      id: 'equipo', 
      name: 'Personal HRMS', 
      tag: 'DEPLOY.MGT.v4',
      color: '#6366F1', 
      href: '/equipo',
      meta: ['Employee DB: Sync', 'Payroll Calc: Auto', 'Clock In: Ready'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 11h-6" className="transition-transform duration-300 group-hover:-translate-y-0.5" />
          <path d="M20 8v6" className="transition-transform duration-300 group-hover:-translate-y-0.5" />
        </svg>
      )
    },
    { 
      id: 'franquicias', 
      name: 'Franquicias', 
      tag: 'LOG.ANA.15',
      color: '#06B6D4', 
      href: '/franquicias',
      meta: ['Multi-Tenant: Active', 'Sync Engine: Live', 'Ventas Node: OK'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M9 21V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v12" />
          <rect x="5" y="12" width="2" height="2" />
          <rect x="17" y="12" width="2" height="2" />
        </svg>
      )
    },
    { 
      id: 'integraciones', 
      name: 'Conexiones API', 
      tag: 'CFG.MGT.02',
      color: '#D946EF', 
      href: '/integraciones',
      meta: ['REST Endpoints: Active', 'Auth: OAuth2/JWT', 'Rate Limit: Safe'],
      iconSvg: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18.36 6.64a9 9 0 1 1-12.73 0" className="transition-transform duration-300 group-hover:scale-95" />
          <line x1="12" y1="2" x2="12" y2="12" className="transition-transform duration-300 group-hover:translate-y-1" />
        </svg>
      )
    },
    { 
      id: 'config', 
      name: 'Ajustes', 
      tag: 'BACK.UP.07',
      color: '#475569', 
      href: '/configuracion',
      meta: ['System Config: Active', 'Localization: Global', 'Keys: Encrypted'],
      iconSvg: (
        <svg className="w-6 h-6 transition-transform duration-1000 origin-center group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
          <span className="text-xs text-slate-400 font-semibold font-sans">{apps.length} activos</span>
        </div>

        {/* Grilla industrial de tarjetas densas y texturizadas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <a
              href={app.href}
              key={app.id}
              className="
                relative flex flex-col p-5 rounded-2xl border border-border/80 bg-card/45 backdrop-blur-md
                transition-all duration-300 group hover:-translate-y-1 hover:border-foreground/20 hover:bg-card/75
                hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden
              "
            >
              {/* Esquinas angulares decorativas tipo terminal de hardware */}
              <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-slate-400/40 dark:border-slate-600/40 rounded-tl-sm pointer-events-none" />
              <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-slate-400/40 dark:border-slate-600/40 rounded-tr-sm pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-slate-400/40 dark:border-slate-600/40 rounded-bl-sm pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-slate-400/40 dark:border-slate-600/40 rounded-br-sm pointer-events-none" />

              {/* Tag de identificador en la parte superior derecha */}
              <span className="absolute top-3 right-3 font-mono text-[9px] font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                {app.tag}
              </span>

              {/* Resplandor de fondo al color del módulo */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 pointer-events-none"
                style={{
                  boxShadow: `0 0 60px 10px ${app.color}`,
                }}
              />

              <div className="flex gap-4">
                {/* Contenedor del Icono */}
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300"
                  style={{
                    background: `${app.color}12`,
                    border: `1px solid ${app.color}25`,
                    color: app.color
                  }}
                >
                  {app.iconSvg}
                </div>

                {/* Contenido de la Tarjeta */}
                <div className="flex flex-col flex-1 justify-center">
                  <span className="text-foreground font-bold text-base tracking-tight font-sans group-hover:text-primary transition-colors">
                    {app.name}
                  </span>
                  
                  {/* Líneas de metadatos estáticas en verde/gris */}
                  <div className="flex flex-col gap-0.5 mt-2">
                    {app.meta.map((line, idx) => (
                      <p key={idx} className="font-mono text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[rgba(16,185,129,0.7)]" />
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Barra LED de carga inferior de la tarjeta */}
              <div 
                className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl"
                style={{ backgroundColor: app.color }}
              />
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
