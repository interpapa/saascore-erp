'use client';

import React from 'react';
import { useAuth } from '@/components/core/AuthProvider';
import { useERPStore } from '@/store/useERPStore';
import { Sparkles } from 'lucide-react';

export default function LauncherPage() {
  const { signOut } = useAuth();
  const { currentTenant } = useERPStore();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col pt-8 pb-20 px-4 sm:px-6 max-w-6xl mx-auto w-full space-y-12 animate-in fade-in duration-300 relative z-10">
      
      {/* Estilos locales para efectos de Brackets y Animación 3D de Cockpit */}
      <style jsx global>{`
        .cockpit-card {
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .cockpit-card:hover {
          border-color: rgba(34, 211, 238, 0.4);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          transform: translateY(-2px);
        }
        
        /* Caja POS Coin 3D rotation */
        .custom-pos-coin {
          transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-style: preserve-3d;
          perspective: 800px;
        }
        .group:hover .custom-pos-coin {
          transform: translateY(-4px) rotateY(360deg) scale(1.1);
        }

        /* Wave chart animation */
        @keyframes drawWave {
          0% { stroke-dashoffset: 600; }
          100% { stroke-dashoffset: 0; }
        }
        .stats-wave {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: drawWave 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        /* Gears rotation */
        .gear-small {
          transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
          transform-origin: 16px 8px;
        }
        .gear-big {
          transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1);
          transform-origin: 8px 16px;
        }
        .group:hover .gear-small { transform: rotate(-180deg); }
        .group:hover .gear-big { transform: rotate(90deg); }

        /* Sliders */
        .slider-knob {
          transition: transform 0.45s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .group:hover .slider-knob-1 { transform: translateY(-3px); }
        .group:hover .slider-knob-2 { transform: translateY(4px); }
        .group:hover .slider-knob-3 { transform: translateY(-4px); }

        /* Store Sliding Door */
        .store-sliding-door {
          transition: transform 0.35s ease-in-out;
          transform-origin: left;
        }
        .group:hover .store-sliding-door { transform: scaleX(0); }

        /* Shield Hub pulsing core */
        .shield-core-node {
          transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.3), opacity 0.4s ease;
          transform-origin: 12px 11px;
        }
        .group:hover .shield-core-node { transform: scale(1.3); opacity: 0.8; }
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

      {/* Grid de Aplicaciones Asimétricas */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest font-sans">Ecosistema de Módulos</h2>
          <span className="text-xs text-slate-400 font-semibold font-sans">15 consolas interconectadas</span>
        </div>

        {/* Rejilla de Cards Cockpit con Brackets Esquina Luminosos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          
          {/* 1. Estadísticas (2x columnas) */}
          <a href="/estadisticas" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md col-span-1 md:col-span-2 h-48 overflow-hidden">
            {/* Brackets */}
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">Estadísticas</span>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold tracking-wider">KPI ENGINE</span>
            </div>
            
            {/* Gráfico Neón Cyan animado */}
            <div className="relative w-full h-24 flex items-end">
              <svg className="w-full h-full text-cyan-400" viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M0 60 Q25 15, 50 50 T100 20 T150 45 T200 10" className="stats-wave" />
                <path d="M0 60 Q25 15, 50 50 T100 20 T150 45 T200 10 L200 80 L0 80 Z" fill="url(#stats-gradient)" className="opacity-15" />
                <defs>
                  <linearGradient id="stats-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Punto luminoso terminal */}
              <circle cx="198" cy="11" r="2" className="fill-cyan-400 shadow-[0_0_10px_#22d3ee]" />
            </div>
          </a>

          {/* 2. Caja POS */}
          <a href="/caja" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-48">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">Caja POS</span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold tracking-wider">SALES</span>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              <svg className="w-12 h-12 text-white custom-pos-coin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" className="fill-emerald-500/10" />
                <path d="M12 6v12" />
                <path d="M15.5 9c0-1.5-7-1.5-7 0 0 1.5 7 1.5 7 3 0 1.5-7 1.5-7 3" />
              </svg>
              
              {/* Filas de ventas mockup */}
              <div className="w-full space-y-1 px-1 opacity-30">
                <div className="h-1.5 bg-slate-700 rounded-full w-full"></div>
                <div className="h-1.5 bg-slate-700 rounded-full w-4/5"></div>
              </div>
            </div>
          </a>

          {/* 3. Clientes CRM */}
          <a href="/clientes" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-48">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">Clientes CRM</span>
              <span className="text-[10px] text-blue-400 font-mono font-semibold tracking-wider">CONTACTS</span>
            </div>

            <div className="flex flex-col space-y-4 w-full">
              {/* Buscador de contactos mockup */}
              <div className="flex items-center space-x-2 border border-slate-800 bg-slate-950/70 rounded px-2 py-1 text-slate-500 text-[9px] font-sans">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <span>Buscar contactos...</span>
              </div>
              <div className="space-y-1.5 opacity-30 px-1">
                <div className="h-1.5 bg-slate-700 rounded-full w-5/6"></div>
                <div className="h-1.5 bg-slate-700 rounded-full w-2/3"></div>
              </div>
            </div>
          </a>

          {/* 4. Contabilidad (2x columnas) */}
          <a href="/contabilidad" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md col-span-1 md:col-span-2 h-48">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">Contabilidad</span>
              <span className="text-[10px] text-teal-400 font-mono font-semibold tracking-wider">BALANCE SHEET</span>
            </div>

            {/* Tabla contable miniatura mockup */}
            <div className="w-full">
              <table className="w-full text-[9px] text-slate-400 border-t border-slate-800/80">
                <thead>
                  <tr className="text-slate-500 font-mono">
                    <th className="text-left py-1">Cuenta contable</th>
                    <th className="text-right py-1">Débito</th>
                    <th className="text-right py-1">Crédito</th>
                  </tr>
                </thead>
                <tbody className="opacity-35 font-mono">
                  <tr className="border-t border-slate-800/50">
                    <td className="py-1">1105 Caja General</td>
                    <td className="text-right py-1 text-emerald-400">$15,400.00</td>
                    <td className="text-right py-1">-</td>
                  </tr>
                  <tr className="border-t border-slate-800/50">
                    <td className="py-1">1305 Clientes Nacionales</td>
                    <td className="text-right py-1">-</td>
                    <td className="text-right py-1 text-slate-400">$15,400.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </a>

          {/* 5. WhatsApp Inbox */}
          <a href="/whatsapp" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-48">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">WhatsApp Inbox</span>
              <span className="text-[10px] text-green-400 font-mono font-semibold tracking-wider">MESSAGES</span>
            </div>

            {/* Burbujas de chat mockup */}
            <div className="flex flex-col space-y-2 w-full px-1">
              <div className="self-start bg-slate-800 rounded px-2 py-1 text-[8.5px] text-slate-300 max-w-[90%] font-sans font-medium">
                Hola, ¿mi pedido ya salió?
              </div>
              <div className="self-end bg-cyan-950/40 border border-cyan-800/30 rounded px-2 py-1 text-[8.5px] text-cyan-300 max-w-[90%] font-sans font-medium">
                Hola, sí! va en camino.
              </div>
            </div>
          </a>

          {/* 6. Catálogo */}
          <a href="/catalogo" className="group cockpit-card relative flex flex-col justify-between p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-48">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-slate-200 tracking-tight font-sans">Catálogo</span>
              <span className="text-[10px] text-violet-400 font-mono font-semibold tracking-wider">STOCK</span>
            </div>

            <div className="flex items-center space-x-3 w-full px-1">
              <svg className="w-10 h-10 text-violet-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" className="store-sliding-door" />
                <path d="M2 7v10l10 5V12L2 7z" />
                <path d="M22 7v10l-10 5V12l10-5z" />
              </svg>
              <div className="text-[9px] text-slate-400 font-mono space-y-0.5">
                <div>PROD-420</div>
                <div className="text-violet-300 font-bold">1.4K ítems</div>
              </div>
            </div>
          </a>

          {/* Row 3 - Tarjetas más compactas */}
          {/* 7. Calendario */}
          <a href="/calendario" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Citas y Turnos</span>
            
            {/* Rejilla de calendario mockup */}
            <div className="grid grid-cols-7 gap-1 w-full opacity-40 text-center text-[7.5px] font-mono mt-1">
              <div className="text-slate-600">L</div><div className="text-slate-600">M</div><div className="text-slate-600">M</div><div className="text-slate-600">J</div><div className="text-slate-600">V</div><div className="text-slate-600">S</div><div className="text-slate-600">D</div>
              <div>1</div><div>2</div><div className="bg-cyan-500/80 text-white rounded-full">3</div><div>4</div><div>5</div><div>6</div><div>7</div>
            </div>
          </a>

          {/* 8. Órdenes Trabajo */}
          <a href="/kanban" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Órdenes Trabajo</span>

            {/* Kanban columnas mockup */}
            <div className="flex space-x-1.5 w-full opacity-30 mt-1">
              <div className="flex-1 bg-slate-950/80 rounded h-10 p-1 space-y-1">
                <div className="h-1 bg-slate-700 rounded-xs w-full"></div>
                <div className="h-1 bg-slate-700 rounded-xs w-2/3"></div>
              </div>
              <div className="flex-1 bg-slate-950/80 rounded h-10 p-1">
                <div className="h-1 bg-orange-500/70 rounded-xs w-full"></div>
              </div>
            </div>
          </a>

          {/* 9. Personal HRMS */}
          <a href="/equipo" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Personal HRMS</span>

            <div className="flex items-center space-x-2 w-full opacity-30 mt-1">
              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-400">HR</div>
              <div className="flex-1 space-y-1">
                <div className="h-1 bg-slate-700 rounded-full w-full"></div>
                <div className="h-1 bg-slate-700 rounded-full w-2/3"></div>
              </div>
            </div>
          </a>

          {/* 10. Compras AP */}
          <a href="/compras" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Compras AP</span>

            <div className="flex flex-col space-y-1 w-full opacity-35 text-[8.5px] font-mono mt-1">
              <div className="flex justify-between border-b border-slate-800/60 pb-0.5">
                <span>OC-042</span>
                <span className="text-orange-400">match</span>
              </div>
              <div className="flex justify-between">
                <span>Costo:</span>
                <span>$8,400.00</span>
              </div>
            </div>
          </a>

          {/* Row 4 */}
          {/* 11. Franquicias */}
          <a href="/franquicias" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Franquicias</span>

            <div className="flex space-x-1 w-full opacity-30 justify-center mt-1">
              <div className="px-1 py-0.5 border border-slate-800 bg-slate-950 rounded text-[7.5px] font-mono">Norte</div>
              <div className="px-1 py-0.5 border border-slate-800 bg-slate-950 rounded text-[7.5px] font-mono font-bold text-pink-400">Matriz</div>
            </div>
          </a>

          {/* 12. Conexiones API */}
          <a href="/integraciones" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Conexiones API</span>

            <div className="flex justify-center items-center w-full mt-1 opacity-30 space-x-1 text-[8.5px] font-mono">
              <span className="text-emerald-400">● ACTIVA</span>
            </div>
          </a>

          {/* 13. Marketplace */}
          <a href="/apps" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Marketplace</span>

            <div className="grid grid-cols-3 gap-1 w-full opacity-30 mt-1">
              <div className="h-3 bg-slate-700 rounded-xs"></div>
              <div className="h-3 bg-slate-700 rounded-xs"></div>
              <div className="h-3 bg-slate-700 rounded-xs"></div>
            </div>
          </a>

          {/* 14. Ajustes */}
          <a href="/configuracion" className="group cockpit-card relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md h-36">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <span className="text-xs font-bold text-slate-200 tracking-tight font-sans">Ajustes</span>

            <div className="flex flex-col space-y-1.5 w-full opacity-30 mt-1">
              <div className="h-1 bg-slate-800 rounded-full w-full relative"><div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-500"></div></div>
              <div className="h-1 bg-slate-800 rounded-full w-full relative"><div className="absolute top-1/2 left-2/3 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-slate-500"></div></div>
            </div>
          </a>

          {/* 15. SaaSCore Hub (Wide 4 columns footer status) */}
          <a href="/admin" className="group cockpit-card relative flex flex-col sm:flex-row justify-between items-center p-5 rounded-xl bg-slate-900/35 border border-slate-800/80 backdrop-blur-md col-span-1 sm:col-span-2 md:col-span-4 h-auto min-h-[5.5rem] gap-4">
            <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40 rounded-tl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40 rounded-tr-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40 rounded-bl-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>
            <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 group-hover:scale-105 transition-all"></span>

            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/25 shadow-sm shrink-0">
                <svg className="w-5 h-5 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="fill-rose-500/10" />
                </svg>
              </div>
              <div className="text-left font-mono">
                <div className="text-slate-200 text-xs font-bold">SaaSCore Hub</div>
                <div className="text-[9.5px] text-slate-500 mt-0.5">Seguridad Activa · Control Tenants</div>
              </div>
            </div>
            
            <div className="h-8 px-4 bg-slate-800/40 border border-slate-700/60 rounded flex items-center justify-center text-[9.5px] font-mono text-emerald-400 font-bold shrink-0 self-stretch sm:self-center">
              MONITOR SYSTEM OK
            </div>
          </a>

        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-16 text-center border-t border-border/40">
        <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase font-sans">SaaSCore OS v3.0 · Modular Enterprise Engine</p>
      </div>

    </div>
  );
}
